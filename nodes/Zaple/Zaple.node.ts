import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

import { messageDescription } from './resources/message';

export class Zaple implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zaple',
		name: 'zaple',
		icon: { light: 'file:../../icons/zaple.svg', dark: 'file:../../icons/zaple.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Zaple.ai WhatsApp Business API',
		defaults: { name: 'Zaple' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'zapleApi',
				required: true,
				displayOptions: { show: { resource: ['message', 'template', 'batch', 'catalog'] } },
			},
			{
				name: 'zapleLeadsApi',
				required: true,
				displayOptions: { show: { resource: ['lead'] } },
			},
		],
		requestDefaults: {
			baseURL: 'https://app.zaple.ai',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [{ name: 'Message', value: 'message' }],
				default: 'message',
			},
			...messageDescription,
		],
	};
}
