import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class ZapleLeadsApi implements ICredentialType {
	name = 'zapleLeadsApi';

	displayName = 'Zaple Leads API';

	documentationUrl = 'https://zaple.ai/docs/';

	icon: Icon = {
		light: 'file:../icons/zaple.svg',
		dark: 'file:../icons/zaple.dark.svg',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Lead API Key',
			name: 'leadApiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Lead API key (zpl_lead_…) from Zaple Leads settings',
		},
		{
			displayName: 'Lead API Secret',
			name: 'leadApiSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Lead API secret (zpls_…) shown once at create/rotate time',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Zaple-Api-Key': '={{$credentials.leadApiKey}}',
				'X-Zaple-Api-Secret': '={{$credentials.leadApiSecret}}',
			},
		},
	};

	// Zaple's Leads API has no dedicated validation endpoint; this read of the leads
	// collection confirms the key pair is accepted. Zaple returns 401 for bad credentials.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://app.zaple.ai',
			url: '/api/v1/leads',
			method: 'GET',
		},
	};
}
