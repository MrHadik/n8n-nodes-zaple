import type { INodeProperties } from 'n8n-workflow';

export const batchCreateListFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description:
			'Name of the new contact list. Zaple returns a duplicate_list_name error if a list with this name already exists.',
		displayOptions: { show: { resource: ['batch'], operation: ['createList'] } },
		routing: { send: { type: 'body', property: 'name' } },
	},
];
