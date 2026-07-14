import type { INodeProperties } from 'n8n-workflow';

import { mapBatchContacts } from '../../shared/preSendFunctions';
import { batchCreateListFields } from './createList';
import { batchDeleteBatchFields } from './deleteBatch';
import { batchDeleteListFields } from './deleteList';
import { batchGetDetailsFields } from './getDetails';
import { batchGetStatusFields } from './getStatus';
import { batchSendFields } from './send';
import { batchUpsertContactsFields } from './upsertContacts';

export const batchDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['batch'] } },
		options: [
			{
				name: 'Create Contact List',
				value: 'createList',
				action: 'Create a contact list',
				description: 'Create a new contact list for batch messaging',
				routing: { request: { method: 'POST', url: '/api/v2/lists' } },
			},
			{
				name: 'Delete Batch',
				value: 'deleteBatch',
				action: 'Delete a batch',
				description: 'Delete a future scheduled batch before it runs',
				routing: {
					request: { method: 'DELETE', url: '=/api/v2/messages/batch/{{$parameter.batchId}}' },
				},
			},
			{
				name: 'Delete List',
				value: 'deleteList',
				action: 'Delete a contact list',
				description: 'Delete a contact list that was created via the API',
				routing: { request: { method: 'DELETE', url: '=/api/v2/lists/{{$parameter.listId}}' } },
			},
			{
				name: 'Get Batch Details',
				value: 'getDetails',
				action: 'Get batch details',
				description: 'Get the paginated per-recipient results of a completed batch',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v2/messages/batch/{{$parameter.batchId}}/details',
					},
				},
			},
			{
				name: 'Get Batch Status',
				value: 'getStatus',
				action: 'Get batch status',
				description: 'Get the current processing status of a batch send',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v2/messages/batch/{{$parameter.batchId}}/status',
					},
				},
			},
			{
				name: 'Send Batch',
				value: 'send',
				action: 'Send a batch',
				description: 'Send a template message to every contact in a list, immediately or scheduled',
				routing: { request: { method: 'POST', url: '/api/v2/messages/batch' } },
			},
			{
				name: 'Upsert Contacts',
				value: 'upsertContacts',
				action: 'Upsert contacts into a list',
				description: 'Add contacts to a list, updating any that already exist',
				routing: {
					request: { method: 'POST', url: '=/api/v2/lists/{{$parameter.listId}}/contacts' },
					send: { preSend: [mapBatchContacts] },
				},
			},
		],
		default: 'send',
	},
	...batchCreateListFields,
	...batchDeleteBatchFields,
	...batchDeleteListFields,
	...batchGetDetailsFields,
	...batchGetStatusFields,
	...batchSendFields,
	...batchUpsertContactsFields,
];
