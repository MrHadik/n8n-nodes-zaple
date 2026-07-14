import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

import { batchDescription } from './resources/batch';
import { catalogDescription } from './resources/catalog';
import { leadDescription } from './resources/lead';
import { messageDescription } from './resources/message';
import { templateDescription } from './resources/template';

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
			// The routing engine resolves multi-credential nodes ONLY via an 'authentication'
			// parameter matched against displayOptions.show.authentication (RoutingNode.prepareCredentials);
			// resource-based scoping works in the editor but throws at execution time.
			{
				name: 'zapleApi',
				required: true,
				displayOptions: { show: { authentication: ['zapleApi'] } },
			},
			{
				name: 'zapleLeadsApi',
				required: true,
				displayOptions: { show: { authentication: ['zapleLeadsApi'] } },
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
				options: [
					{ name: 'Batch', value: 'batch' },
					{ name: 'Catalog', value: 'catalog' },
					{ name: 'Lead', value: 'lead' },
					{ name: 'Message', value: 'message' },
					{ name: 'Template', value: 'template' },
				],
				default: 'message',
			},
			// Hidden per-resource twins: exactly one is displayed for any resource value, so
			// node.parameters.authentication always persists a static string the engine can match.
			// A single expression default would make the editor render both credential fields.
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'hidden',
				default: 'zapleApi',
				displayOptions: { hide: { resource: ['lead'] } },
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'hidden',
				default: 'zapleLeadsApi',
				displayOptions: { show: { resource: ['lead'] } },
			},
			...batchDescription,
			...catalogDescription,
			...leadDescription,
			...messageDescription,
			...templateDescription,
		],
	};
}
