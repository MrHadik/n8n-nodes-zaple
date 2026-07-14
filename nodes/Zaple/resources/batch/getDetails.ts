import type { INodeProperties } from 'n8n-workflow';

export const batchGetDetailsFields: INodeProperties[] = [
	{
		displayName: 'Batch ID',
		name: 'batchId',
		type: 'string',
		required: true,
		default: '',
		description:
			'ID of the batch, as returned by Send Batch. Zaple returns a batch_not_completed error while the batch is still running.',
		displayOptions: { show: { resource: ['batch'], operation: ['getDetails'] } },
	},
];
