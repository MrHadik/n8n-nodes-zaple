import type { INodeProperties } from 'n8n-workflow';

export const batchDeleteListFields: INodeProperties[] = [
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the contact list to delete. Only lists created via the API can be deleted.',
		displayOptions: { show: { resource: ['batch'], operation: ['deleteList'] } },
	},
];
