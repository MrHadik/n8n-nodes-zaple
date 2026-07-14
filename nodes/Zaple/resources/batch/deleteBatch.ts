import type { INodeProperties } from 'n8n-workflow';

export const batchDeleteBatchFields: INodeProperties[] = [
	{
		displayName: 'Batch ID',
		name: 'batchId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the batch to delete. Only future scheduled batches can be deleted.',
		displayOptions: { show: { resource: ['batch'], operation: ['deleteBatch'] } },
	},
];
