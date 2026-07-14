import type { INodeProperties } from 'n8n-workflow';

export const catalogSetVisibilityFields: INodeProperties[] = [
	{
		displayName: 'Catalog ID',
		name: 'catalogId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the catalog, as returned by Get Many or Create',
		displayOptions: { show: { resource: ['catalog'], operation: ['setVisibility'] } },
	},
	{
		displayName: 'Visible',
		name: 'visible',
		type: 'boolean',
		default: true,
		description: 'Whether the catalog is visible to customers',
		displayOptions: { show: { resource: ['catalog'], operation: ['setVisibility'] } },
		routing: { send: { type: 'body', property: 'visible' } },
	},
];
