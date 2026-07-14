import type { IAuthenticateGeneric, ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

// No credential test on purpose: the only Leads endpoint is a state-creating POST /api/v1/leads —
// no safe read-only request exists to validate these credentials.
// eslint-disable-next-line @n8n/community-nodes/credential-test-required
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
}
