import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class ZapleApi implements ICredentialType {
	name = 'zapleApi';

	displayName = 'Zaple API';

	documentationUrl = 'https://zaple.ai/docs/';

	icon: Icon = {
		light: 'file:../icons/zaple.svg',
		dark: 'file:../icons/zaple.dark.svg',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'API key from Zaple Settings → API & Developer',
		},
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'API secret from Zaple Settings → API & Developer',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Zaple-Api-Key': '={{$credentials.apiKey}}',
				'Zaple-Api-Secret': '={{$credentials.apiSecret}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://app.zaple.ai',
			url: '/api/v3/templates?per_page=1',
			method: 'GET',
		},
	};
}
