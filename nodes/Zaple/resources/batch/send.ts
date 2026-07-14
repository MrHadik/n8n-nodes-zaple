import type { INodeProperties } from 'n8n-workflow';

export const batchSendFields: INodeProperties[] = [
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		description:
			'Send-API template identifier, as shown in the Zaple template library — NOT the numeric database ID',
		displayOptions: { show: { resource: ['batch'], operation: ['send'] } },
		routing: { send: { type: 'body', property: 'template_id' } },
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the contact list to send to, as returned by Create Contact List',
		displayOptions: { show: { resource: ['batch'], operation: ['send'] } },
		routing: { send: { type: 'body', property: 'list_id' } },
	},
	{
		displayName: 'Scheduled',
		name: 'scheduledEnabled',
		type: 'boolean',
		default: false,
		description:
			'Whether to schedule the batch for later delivery — when off, the batch is sent immediately',
		displayOptions: { show: { resource: ['batch'], operation: ['send'] } },
		routing: { send: { type: 'body', property: 'scheduled_enabled' } },
	},
	{
		displayName: 'Scheduled Datetime',
		name: 'scheduledDatetime',
		type: 'string',
		required: true,
		default: '',
		placeholder: '2026-06-20 15:30:00',
		description: 'Date and time to send the batch at. Normalized to Asia/Kolkata by Zaple.',
		displayOptions: {
			show: { resource: ['batch'], operation: ['send'], scheduledEnabled: [true] },
		},
		routing: { send: { type: 'body', property: 'scheduled_datetime' } },
	},
];
