import type { INodeProperties } from 'n8n-workflow';

import { sendJsonField } from '../../shared/preSendFunctions';
import { templateCheckStatusFields } from './checkStatus';
import { templateCreateFields } from './create';
import { templateDeleteFields } from './del';
import { templateGetFields } from './get';
import { templateListFields } from './list';
import { templatePreviewFields } from './preview';
import { templateSetActiveFields } from './setActive';
import { templateUpdateFields } from './update';

export const templateDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['template'] } },
		options: [
			{
				name: 'Activate/Deactivate',
				value: 'setActive',
				action: 'Activate or deactivate a template',
				description: 'Turn a template on or off for sending, addressed by its name identifier',
				routing: { request: { method: 'POST', url: '/api/v3/template-activation' } },
			},
			{
				name: 'Check Status',
				value: 'checkStatus',
				action: 'Check template status',
				description: 'Check the Meta approval status of a template',
				routing: { request: { method: 'GET', url: '/api/v3/template/status' } },
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a template',
				description: 'Create a WhatsApp message template and submit it for approval',
				routing: {
					request: { method: 'POST', url: '/api/v3/create-template' },
					send: {
						preSend: [
							sendJsonField('buttonsJson', 'buttons', 'Buttons (JSON)', 'array'),
							sendJsonField(
								'templateLocationJson',
								'templateLocation',
								'Template Location (JSON)',
								'object',
							),
						],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a template',
				description: 'Delete a template by its numeric database ID',
				routing: { request: { method: 'POST', url: '/api/v3/template/delete' } },
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a template',
				description: 'Retrieve a single template by its send-API identifier',
				routing: {
					request: { method: 'GET', url: '=/api/v3/template/{{$parameter.templateId}}' },
				},
			},
			{
				name: 'Get Many',
				value: 'list',
				action: 'Get many templates',
				description: 'Retrieve a list of templates',
				routing: { request: { method: 'GET', url: '/api/v3/templates' } },
			},
			{
				name: 'Preview',
				value: 'preview',
				action: 'Preview a template',
				description: 'Retrieve a rendered preview of a template by its send-API identifier',
				routing: {
					request: { method: 'GET', url: '=/api/v3/template/{{$parameter.templateId}}/preview' },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a template',
				description: 'Update an existing template, addressed by its numeric database ID',
				routing: {
					request: { method: 'POST', url: '/api/v3/update-template' },
					send: {
						preSend: [
							sendJsonField('buttonsJson', 'buttons', 'Buttons (JSON)', 'array'),
							sendJsonField(
								'templateLocationJson',
								'templateLocation',
								'Template Location (JSON)',
								'object',
							),
						],
					},
				},
			},
		],
		default: 'list',
	},
	...templateCheckStatusFields,
	...templateCreateFields,
	...templateDeleteFields,
	...templateGetFields,
	...templateListFields,
	...templatePreviewFields,
	...templateSetActiveFields,
	...templateUpdateFields,
];
