import type { INodeProperties } from 'n8n-workflow';

export const batchUpsertContactsFields: INodeProperties[] = [
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the contact list to upsert into, as returned by Create Contact List',
		displayOptions: { show: { resource: ['batch'], operation: ['upsertContacts'] } },
	},
	{
		displayName: 'Input Mode',
		name: 'inputMode',
		type: 'options',
		options: [
			{ name: 'Fields Below', value: 'ui' },
			{ name: 'JSON', value: 'json' },
		],
		default: 'ui',
		description: 'How the contacts are provided — as UI fields below or as a raw JSON array',
		displayOptions: { show: { resource: ['batch'], operation: ['upsertContacts'] } },
	},
	{
		displayName: 'Contacts',
		name: 'contactsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Contact',
		default: {},
		description: 'Contacts to add to the list, or update if the phone number already exists',
		displayOptions: {
			show: { resource: ['batch'], operation: ['upsertContacts'], inputMode: ['ui'] },
		},
		options: [
			{
				displayName: 'Contact',
				name: 'contact',
				values: [
					{
						displayName: 'Country Code',
						name: 'countryCode',
						type: 'string',
						default: '',
						placeholder: 'e.g. 91',
						description: 'Contact country calling code without the + sign, e.g. 91 for India',
					},
					{
						displayName: 'Phone Number',
						name: 'phoneNumber',
						type: 'string',
						default: '',
						description: 'Contact phone number without the country code',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Optional display name stored with the contact',
					},
				],
			},
		],
	},
	{
		displayName: 'Contacts (JSON)',
		name: 'contactsJson',
		type: 'json',
		default: '[]',
		description:
			'JSON array of contact objects, e.g. [{"country_code":"91","phone_number":"9876543210","name":"John Doe"}]',
		displayOptions: {
			show: { resource: ['batch'], operation: ['upsertContacts'], inputMode: ['json'] },
		},
	},
];
