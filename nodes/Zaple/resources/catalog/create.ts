import type { INodeProperties } from 'n8n-workflow';

export const catalogCreateFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the new product catalog',
		displayOptions: { show: { resource: ['catalog'], operation: ['create'] } },
		routing: { send: { type: 'body', property: 'name' } },
	},
];
