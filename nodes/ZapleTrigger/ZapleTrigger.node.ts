import {
	NodeConnectionTypes,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

import { classifyZapleEvent } from './classifyEvent';

export class ZapleTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zaple Trigger',
		name: 'zapleTrigger',
		icon: { light: 'file:../../icons/zaple.svg', dark: 'file:../../icons/zaple.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{ $parameter["events"].join(", ") }}',
		description: 'Starts the workflow when Zaple webhook events arrive',
		usableAsTool: true,
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

	// Zaple has no webhook-management API — the URL is configured manually in
	// Zaple → Settings → Webhooks, so these lifecycle hooks are intentional no-ops.
	// n8n requires the object to be present for a webhook trigger node.
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return true;
			},
		},
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
