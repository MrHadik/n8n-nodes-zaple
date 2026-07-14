import type { INodeProperties } from 'n8n-workflow';

export const catalogDisconnectWabaFields: INodeProperties[] = [
	{
		displayName: 'Catalog ID',
		name: 'catalogId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the catalog to disconnect, as returned by Get Many or Create',
		displayOptions: { show: { resource: ['catalog'], operation: ['disconnectWaba'] } },
	},
];
