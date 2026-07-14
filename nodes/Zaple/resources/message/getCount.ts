import type { INodeProperties } from 'n8n-workflow';

export const messageGetCountFields: INodeProperties[] = [
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['message'], operation: ['getCount'] } },
		options: [
			{
				displayName: 'From Date',
				name: 'fromDate',
				type: 'string',
				default: '',
				placeholder: 'yyyy-mm-dd hh:mm:ss',
				description: 'Start of the date range to count messages in',
				routing: { send: { type: 'query', property: 'from_date' } },
			},
			{
				displayName: 'To Date',
				name: 'toDate',
				type: 'string',
				default: '',
				placeholder: 'yyyy-mm-dd hh:mm:ss',
				description: 'End of the date range to count messages in',
				routing: { send: { type: 'query', property: 'to_date' } },
			},
		],
	},
];
