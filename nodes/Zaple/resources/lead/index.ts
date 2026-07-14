import type { INodeProperties } from 'n8n-workflow';

import { mapLeadFields } from '../../shared/preSendFunctions';
import { leadSubmitFields } from './submit';

export const leadDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['lead'] } },
		options: [
			{
				name: 'Submit',
				value: 'submit',
				action: 'Submit a lead',
				description: 'Submit a captured lead with optional attribution and custom fields',
				routing: {
					request: { method: 'POST', url: '/api/v1/leads' },
					send: { preSend: [mapLeadFields] },
				},
			},
		],
		default: 'submit',
	},
	...leadSubmitFields,
];
