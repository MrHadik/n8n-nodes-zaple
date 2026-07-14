import type { INodeProperties } from 'n8n-workflow';

export const messageGetStatusFields: INodeProperties[] = [
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID returned when the message was sent',
		displayOptions: { show: { resource: ['message'], operation: ['getStatus'] } },
		routing: { send: { type: 'query', property: 'message_id' } },
	},
];
