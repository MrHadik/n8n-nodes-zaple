import type { INodeProperties } from 'n8n-workflow';

export const templateCheckStatusFields: INodeProperties[] = [
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		description:
			'Send-API template identifier (the long numeric ID used for sending), NOT the database ID',
		displayOptions: { show: { resource: ['template'], operation: ['checkStatus'] } },
		routing: { send: { type: 'query', property: 'template_id' } },
	},
];
