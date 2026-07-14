import type { INodeProperties } from 'n8n-workflow';

export const templateSetActiveFields: INodeProperties[] = [
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		description: 'Template name identifier — the template name as shown in Zaple, NOT a numeric ID',
		displayOptions: { show: { resource: ['template'], operation: ['setActive'] } },
		routing: { send: { type: 'body', property: 'template_id' } },
	},
	{
		displayName: 'Activation Status',
		name: 'activationStatus',
		type: 'options',
		options: [
			{ name: 'Activate', value: '1' },
			{ name: 'Deactivate', value: '0' },
		],
		default: '1',
		description: 'Whether to activate or deactivate the template',
		displayOptions: { show: { resource: ['template'], operation: ['setActive'] } },
		routing: { send: { type: 'body', property: 'activation_status' } },
	},
];
