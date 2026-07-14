import type { INodeProperties } from 'n8n-workflow';

export const templateDeleteFields: INodeProperties[] = [
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'number',
		required: true,
		default: 0,
		description:
			'Numeric database ID — NOT the send-API identifier. Templates used by active scheduled broadcasts cannot be deleted.',
		displayOptions: { show: { resource: ['template'], operation: ['delete'] } },
		routing: { send: { type: 'body', property: 'template_id' } },
	},
];
