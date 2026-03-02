import type {
	IWebhookFunctions,
	IWebhookResponseData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeApiError } from 'n8n-workflow';

export class CompozzWebhookTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Compozz Webhook Trigger',
		name: 'compozzWebhookTrigger',
		icon: { light: 'file:compozz.svg', dark: 'file:compozz.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: 'Triggered when a Compozz webhook is received',
		description: 'Triggers the workflow when a webhook from Compozz is received',
		usableAsTool: undefined,
		defaults: {
			name: 'Compozz Webhook',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'responseNode',
				path: '={{ $parameter["tenantId"] ? `compozz-webhook-${$parameter["tenantId"]}` : "compozz-webhook" }}',
			},
		],
		credentials: [
			{
				name: 'compozzApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Tenant ID',
				name: 'tenantId',
				type: 'string',
				required: true,
				default: '',
				description: 'Your Compozz tenant ID (used to generate unique webhook URL)',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const headers = req.headers as IDataObject;
		const body = req.body as IDataObject;

		// Extract webhook headers (n8n converts headers to lowercase)
		const signature =
			(headers['x-compozz-signature'] as string) || (headers['X-Compozz-Signature'] as string);
		const tenantId =
			(headers['x-compozz-tenant'] as string) || (headers['X-Compozz-Tenant'] as string);
		const action =
			(headers['x-compozz-action'] as string) || (headers['X-Compozz-Action'] as string);
		const eventId =
			(headers['x-compozz-event-id'] as string) || (headers['X-Compozz-Event-ID'] as string);
		const timestamp =
			(headers['x-compozz-timestamp'] as string) || (headers['X-Compozz-Timestamp'] as string);

		// Validate signature (obligatory)
		try {
			const credentials = await this.getCredentials('compozzApi');
			if (!credentials) {
				throw new NodeApiError(this.getNode(), {
					message: 'Compozz API credentials are required',
					httpCode: 401,
				});
			}

			const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

			// Get access token
			const accessToken = await getAccessToken.call(this, baseUrl, credentials);

			// Validate signature
			const isValid = await validateSignatureCall.call(
				this,
				baseUrl,
				accessToken,
				signature || '',
				body,
				tenantId || '',
			);

			if (!isValid) {
				throw new NodeApiError(this.getNode(), {
					message: 'Invalid webhook signature',
					httpCode: 401,
				});
			}

			// Verify tenant ID isolation: ensure received tenantId matches configured tenantId
			const configuredTenantId = this.getNodeParameter('tenantId', 0) as string;
			const receivedTenantId = tenantId || '';

			if (receivedTenantId !== configuredTenantId) {
				throw new NodeApiError(this.getNode(), {
					message: 'Tenant ID mismatch: webhook tenant does not match configured tenant',
					httpCode: 403,
				});
			}
		} catch (error) {
			// Si c'est déjà une NodeApiError, la relancer
			if (error instanceof NodeApiError) {
				throw error;
			}
			// Sinon, créer une nouvelle erreur
			throw new NodeApiError(this.getNode(), {
				message: `Signature validation failed: ${error.message}`,
				httpCode: 500,
			});
		}

		// Return webhook data
		return {
			workflowData: [
				[
					{
						json: {
							...body,
							_headers: {
								signature,
								tenantId,
								action,
								eventId,
								timestamp,
							},
						},
					},
				],
			],
		};
	}
}

/**
 * Get access token for validation
 */
async function getAccessToken(
	this: IWebhookFunctions,
	baseUrl: string,
	credentials: IDataObject,
): Promise<string> {
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${baseUrl}/auth/login`,
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: {
			username: credentials.username,
			password: credentials.password,
		},
		json: true,
	};

	const response = await this.helpers.httpRequest(options);

	if (!response.access_token) {
		throw new NodeApiError(this.getNode(), {
			message: 'Failed to obtain access token from Compozz API',
		});
	}

	return response.access_token as string;
}

/**
 * Validate webhook signature using the validation endpoint
 */
async function validateSignatureCall(
	this: IWebhookFunctions,
	baseUrl: string,
	accessToken: string,
	signature: string,
	payload: IDataObject,
	tenantId: string,
): Promise<boolean> {
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${baseUrl}/admin/webhook/validate`,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body: {
			signature,
			payload,
			tenantId,
		},
		json: true,
	};

	try {
		const response = await this.helpers.httpRequest(options);
		return response.valid === true;
	} catch {
		return false;
	}
}
