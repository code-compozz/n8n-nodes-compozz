import type {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CompozzApi implements ICredentialType {
	name = 'compozzApi';
	displayName = 'Compozz API';
	icon = { light: 'file:../nodes/Compozz/compozz.svg', dark: 'file:../nodes/Compozz/compozz.dark.svg' } as const;
	documentationUrl = 'https://app.compozz.com/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://app.compozz.com',
			description: 'The base URL of the Compozz API',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
			description: 'Your Compozz username',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Compozz password',
		},
	];

	// Note: n8n doesn't support pre-authentication token fetching natively.
	// The token will be fetched in the node itself before making requests.
	// This test endpoint validates the credentials by attempting a login.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/auth/login',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
		},
	};
}

