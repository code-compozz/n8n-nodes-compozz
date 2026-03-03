import type {
	IWebhookFunctions,
	IWebhookResponseData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeApiError } from 'n8n-workflow';
import { getAccessToken } from './utils';

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

			const baseUrl = ((credentials.baseUrl as string) || 'https://app.compozz.com').replace(/\/$/, '');

			// Get access token
			let accessToken: string;
			try {
				accessToken = await getAccessToken(
					this.getNode(),
					this.helpers,
					baseUrl,
					credentials,
					true, // Use cache to reuse token (same as Compozz node)
					true, // Use NodeApiError
				);
			} catch (error: unknown) {
				// If getAccessToken fails, it's likely a credentials issue
				const errorMessage =
					error instanceof Error ? error.message : 'Please check your credentials';
				throw new NodeApiError(this.getNode(), {
					message: `Failed to authenticate with Compozz API: ${errorMessage}`,
					httpCode: 401,
				});
			}

			// Validate signature
			// Use raw JSON string to preserve exact bytes from compozz-data
			const bodyJsonString = JSON.stringify(body);
			const isValid = await validateSignatureCall.call(
				this,
				baseUrl,
				accessToken,
				signature || '',
				bodyJsonString,
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
			// If it's already a NodeApiError, rethrow it
			if (error instanceof NodeApiError) {
				throw error;
			}
			// Otherwise, create a new error
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
 * Validate webhook signature using the validation endpoint
 */
async function validateSignatureCall(
	this: IWebhookFunctions,
	baseUrl: string,
	accessToken: string,
	signature: string,
	payload: string,
	tenantId: string,
): Promise<boolean> {
	// Send payload as raw JSON string to preserve exact bytes from compozz-data
	// Construct the request body manually to embed payload as raw JSON (not parsed object)
	// Go's json.RawMessage will preserve the exact bytes when deserializing
	const escapedSignature = JSON.stringify(signature);
	const escapedTenantId = JSON.stringify(tenantId);
	const requestBody = `{"signature":${escapedSignature},"payload":${payload},"tenantId":${escapedTenantId}}`;
	
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${baseUrl}/admin/webhook/validate`,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body: requestBody,
		json: false, // Send as raw string, not parsed JSON
	};

	try {
		const response = await this.helpers.httpRequest(options);
		return response.valid === true;
	} catch (error: unknown) {
		// If it's an authorization error (401), propagate it so we can see the real issue
		const errorObj = error as IDataObject;
		const statusCode = errorObj.statusCode || errorObj.httpCode;
		
		// Extract detailed error information
		let errorMessage = 'Invalid credentials';
		let errorDetails: string | undefined;
		
		if (errorObj.response) {
			const responseBody = errorObj.response as IDataObject;
			if (responseBody.message && typeof responseBody.message === 'string') {
				errorMessage = responseBody.message;
			} else if (responseBody.error && typeof responseBody.error === 'string') {
				errorMessage = responseBody.error;
			}
			errorDetails = JSON.stringify(responseBody);
		} else if (errorObj.message && typeof errorObj.message === 'string') {
			errorMessage = errorObj.message;
		}
		
		if (statusCode === 401 || statusCode === 403) {
			const fullMessage = errorDetails
				? `Authorization failed - please check your credentials and ensure your account has admin permissions. API response: ${errorDetails}`
				: `Authorization failed - please check your credentials and ensure your account has admin permissions: ${errorMessage}`;
			
			throw new NodeApiError(this.getNode(), {
				message: fullMessage,
				httpCode: statusCode as number,
			});
		} else if (statusCode && statusCode !== 200) {
			throw new NodeApiError(this.getNode(), {
				message: `Webhook validation failed (HTTP ${statusCode}): ${errorDetails || errorMessage}`,
				httpCode: statusCode as number,
			});
		}
		// For other errors (network, etc.), return false (signature invalid)
		return false;
	}
}
