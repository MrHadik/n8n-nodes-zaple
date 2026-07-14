import type { INodeProperties } from 'n8n-workflow';

import {
	mapMediaFields,
	mapQuickReplyPayloads,
	mapTemplateArguments,
} from '../../shared/preSendFunctions';
import { messageGetCountFields } from './getCount';
import { messageGetStatusFields } from './getStatus';
import { messageSendServiceFields } from './sendService';
import { messageSendTemplateFields } from './sendTemplate';

export const messageDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['message'] } },
		options: [
			{
				name: 'Get Message Count',
				value: 'getCount',
				action: 'Get message count',
				description: 'Get sent/read message counts for a date range',
				routing: { request: { method: 'GET', url: '/api/v2/message-count' } },
			},
			{
				name: 'Get Message Status',
				value: 'getStatus',
				action: 'Get message status',
				description: 'Get the delivery status of a sent message by its message ID',
				routing: { request: { method: 'GET', url: '/api/v2/message-status' } },
			},
			{
				name: 'Send Service Message',
				value: 'sendService',
				action: 'Send a service message',
				description: 'Send a free-form message inside the 24-hour customer service window',
				routing: {
					request: { method: 'POST', url: '/api/v2/send-service-message' },
					send: { preSend: [mapMediaFields, mapTemplateArguments] },
				},
			},
			{
				name: 'Send Template Message',
				value: 'sendTemplate',
				action: 'Send a template message',
				description: 'Send a pre-approved WhatsApp template message',
				routing: {
					request: { method: 'POST', url: '/api/v3/send-template-message' },
					send: { preSend: [mapTemplateArguments, mapQuickReplyPayloads, mapMediaFields] },
				},
			},
		],
		default: 'sendTemplate',
	},
	...messageGetCountFields,
	...messageGetStatusFields,
	...messageSendServiceFields,
	...messageSendTemplateFields,
];
