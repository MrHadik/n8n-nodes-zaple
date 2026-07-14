import type { INodeProperties } from 'n8n-workflow';

import { catalogConnectWabaFields } from './connectWaba';
import { catalogCreateFields } from './create';
import { catalogCreateProductFields } from './createProduct';
import { catalogDisconnectWabaFields } from './disconnectWaba';
import { catalogGetAllFields } from './getAll';
import { catalogGetCommerceSettingsFields } from './getCommerceSettings';
import { catalogListProductsFields } from './listProducts';
import { catalogSetVisibilityFields } from './setVisibility';

export const catalogDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['catalog'] } },
		options: [
			{
				name: 'Connect WABA',
				value: 'connectWaba',
				action: 'Connect a catalog to WABA',
				description: 'Connect a catalog to your WhatsApp Business Account',
				routing: {
					request: { method: 'POST', url: '=/api/v2/catalogs/{{$parameter.catalogId}}/connect' },
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a catalog',
				description: 'Create a new product catalog',
				routing: { request: { method: 'POST', url: '/api/v2/catalogs' } },
			},
			{
				name: 'Create Product',
				value: 'createProduct',
				action: 'Create a product',
				description: 'Add a product to a catalog',
				routing: {
					request: { method: 'POST', url: '=/api/v2/catalogs/{{$parameter.catalogId}}/products' },
				},
			},
			{
				name: 'Disconnect WABA',
				value: 'disconnectWaba',
				action: 'Disconnect a catalog from WABA',
				description: 'Disconnect a catalog from your WhatsApp Business Account',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v2/catalogs/{{$parameter.catalogId}}/disconnect',
					},
				},
			},
			{
				name: 'Get Commerce Settings',
				value: 'getCommerceSettings',
				action: 'Get commerce settings',
				description: 'Get the WhatsApp commerce settings of the connected account',
				routing: { request: { method: 'GET', url: '/api/v2/commerce/settings' } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many catalogs',
				description: 'Retrieve a list of many product catalogs',
				routing: { request: { method: 'GET', url: '/api/v2/catalogs' } },
			},
			{
				name: 'List Products',
				value: 'listProducts',
				action: 'List products in a catalog',
				description: 'Retrieve the products of a catalog',
				routing: {
					request: { method: 'GET', url: '=/api/v2/catalogs/{{$parameter.catalogId}}/products' },
				},
			},
			{
				name: 'Set Visibility',
				value: 'setVisibility',
				action: 'Set catalog visibility',
				description: 'Show or hide a catalog',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v2/catalogs/{{$parameter.catalogId}}/visibility',
					},
				},
			},
		],
		default: 'getAll',
	},
	...catalogConnectWabaFields,
	...catalogCreateFields,
	...catalogCreateProductFields,
	...catalogDisconnectWabaFields,
	...catalogGetAllFields,
	...catalogGetCommerceSettingsFields,
	...catalogListProductsFields,
	...catalogSetVisibilityFields,
];
