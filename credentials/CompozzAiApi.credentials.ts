import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class CompozzAiApi implements ICredentialType {
	name = 'compozzAiApi';
	displayName = 'Compozz AI Provider';
	icon = { light: 'file:../nodes/Compozz/compozz.svg', dark: 'file:../nodes/Compozz/compozz.dark.svg' } as const;
	documentationUrl = 'https://app.compozz.com/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'Provider',
			name: 'provider',
			type: 'options',
			options: [
				{ name: 'Anthropic', value: 'anthropic' },
				{ name: 'Mistral', value: 'mistral' },
				{ name: 'Ollama', value: 'ollama' },
				{ name: 'OpenAI', value: 'openai' },
			],
			default: 'openai',
			description: 'The AI provider to use',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Your own API key for the selected provider. It is sent to the Compozz AI endpoint with each request and never stored server-side. Not needed for Ollama.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			description: 'Optional override of the provider endpoint (e.g. a proxy or a self-hosted Ollama)',
		},
		{
			displayName: 'Default Model',
			name: 'defaultModel',
			type: 'string',
			default: '',
			description: 'Optional default model (can be overridden per node)',
		},
	];
}
