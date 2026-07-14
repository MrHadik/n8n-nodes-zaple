import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

import { classifyZapleEvent } from './classifyEvent';

// Trigger nodes have no execute(); advertising tool-usability would list a broken tool in the AI Agent picker.
// eslint-disable-next-line @n8n/community-nodes/node-usable-as-tool
export class ZapleTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zaple Trigger',
		name: 'zapleTrigger',
		icon: { light: 'file:../../icons/zaple.svg', dark: 'file:../../icons/zaple.dark.svg' },
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Zaple webhook events arrive',
		defaults: { name: 'Zaple Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'Copy the Production URL above and paste it into Zaple → Settings → Webhooks. Zaple does not sign webhook requests — treat this URL as a secret.',
				name: 'setupNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: ['*'],
				description: 'The Zaple webhook events that should start this workflow',
				options: [
					{
						name: 'All Events',
						value: '*',
						description: 'Emit every incoming webhook payload, including unrecognized shapes',
					},
					{
						name: 'Incoming Message / Button Reply',
						value: 'incomingMessage',
						description: 'A WhatsApp user sent a message or tapped a quick-reply button',
					},
					{
						name: 'Message Status Update',
						value: 'messageStatus',
						description: 'A sent message changed status: sent, delivered, read, or failed',
					},
					{
						name: 'Template Status Update',
						value: 'templateStatus',
						description: 'Meta approved or rejected a message template',
					},
				],
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData();
		const events = this.getNodeParameter('events', []) as string[];
		const eventType = classifyZapleEvent(body);
		if (!events.includes('*') && !events.includes(eventType)) {
			return {};
		}
		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}
