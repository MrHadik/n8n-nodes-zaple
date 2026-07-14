import type { INodeProperties } from 'n8n-workflow';

export const batchGetStatusFields: INodeProperties[] = [
	{
		displayName: 'Batch ID',
		name: 'batchId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the batch, as returned by Send Batch',
		displayOptions: { show: { resource: ['batch'], operation: ['getStatus'] } },
	},
];
