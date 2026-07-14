import type { INodeProperties } from 'n8n-workflow';

export const messageSendServiceFields: INodeProperties[] = [
	{
		displayName: 'Country Code',
		name: 'countryCode',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 91',
		description: 'Recipient country calling code without the + sign, e.g. 91 for India',
		displayOptions: { show: { resource: ['message'], operation: ['sendService'] } },
		routing: { send: { type: 'body', property: 'country_code' } },
	},
	{
		displayName: 'Send To',
		name: 'sendTo',
		type: 'string',
		required: true,
		default: '',
		description: 'Recipient phone number without the country code',
		displayOptions: { show: { resource: ['message'], operation: ['sendService'] } },
		routing: { send: { type: 'body', property: 'send_to' } },
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [
			{ name: 'Audio', value: 'audio' },
			{ name: 'Document', value: 'document' },
			{ name: 'Image', value: 'image' },
			{ name: 'Location', value: 'location' },
			{ name: 'Text', value: 'text' },
			{ name: 'Video', value: 'video' },
		],
		default: 'text',
		description: 'Type of service message to send',
		displayOptions: { show: { resource: ['message'], operation: ['sendService'] } },
		routing: { send: { type: 'body', property: 'type' } },
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		default: '',
		description: 'Message text or media caption',
		displayOptions: {
			show: { resource: ['message'], operation: ['sendService'], type: ['image', 'text', 'video'] },
		},
		routing: { send: { type: 'body', property: 'text' } },
	},
	{
		displayName: 'Media URL Type',
		name: 'mediaUrlType',
		type: 'options',
		options: [
			{ name: 'Base64', value: 'base64' },
			{ name: 'None', value: 'none' },
			{ name: 'Public URL', value: 'public_url' },
		],
		default: 'none',
		description: 'How the media file is provided',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendService'],
				type: ['audio', 'document', 'image', 'video'],
			},
		},
	},
	{
		displayName: 'Media URL',
		name: 'mediaUrl',
		type: 'string',
		required: true,
		default: '',
		description: 'Publicly accessible URL of the media file',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendService'],
				type: ['audio', 'document', 'image', 'video'],
				mediaUrlType: ['public_url'],
			},
		},
	},
	{
		displayName: 'Base64 Data',
		name: 'base64Data',
		type: 'string',
		required: true,
		default: '',
		description:
			'Base64-encoded content of the media file, e.g. {{ $binary.data.data }} from a previous node',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendService'],
				type: ['audio', 'document', 'image', 'video'],
				mediaUrlType: ['base64'],
			},
		},
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		description: 'File name shown to the recipient — used for document media',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendService'],
				type: ['audio', 'document', 'image', 'video'],
				mediaUrlType: ['base64', 'public_url'],
			},
		},
	},
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		description:
			'Required for document messages: send-API identifier of a template configured with a document header',
		displayOptions: {
			show: { resource: ['message'], operation: ['sendService'], type: ['document'] },
		},
		routing: { send: { type: 'body', property: 'template_id' } },
	},
	{
		displayName: 'Template Arguments',
		name: 'templateArguments',
		type: 'string',
		typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Argument' },
		default: [],
		description:
			'Values for {{1}}, {{2}}, … in the document template — sent as template_argument1..N',
		displayOptions: {
			show: { resource: ['message'], operation: ['sendService'], type: ['document'] },
		},
	},
	{
		displayName: 'Latitude',
		name: 'latitude',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 19.0760',
		description:
			'Latitude of the location. Note: the Zaple docs are ambiguous about flat vs nested location payloads — the flat body shape used here is verified against the live API in Task 12.',
		displayOptions: {
			show: { resource: ['message'], operation: ['sendService'], type: ['location'] },
		},
		routing: { send: { type: 'body', property: 'latitude' } },
	},
	{
		displayName: 'Longitude',
		name: 'longitude',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 72.8777',
		description: 'Longitude of the location',
		displayOptions: {
			show: { resource: ['message'], operation: ['sendService'], type: ['location'] },
		},
		routing: { send: { type: 'body', property: 'longitude' } },
	},
	{
		displayName: 'Location Name',
		name: 'locationName',
		type: 'string',
		default: '',
		description: 'Name of the place shown above the address',
		displayOptions: {
			show: { resource: ['message'], operation: ['sendService'], type: ['location'] },
		},
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		default: '',
		description: 'Human-readable address of the location',
		displayOptions: {
			show: { resource: ['message'], operation: ['sendService'], type: ['location'] },
		},
		routing: { send: { type: 'body', property: 'address' } },
	},
];
