import type { IDataObject, IHttpRequestOptions, INode } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

// Token cache to avoid re-authenticating for each item
interface TokenCache {
	token: string;
	expiresAt: number;
}

const REFRESH_TOKEN_INTERVAL = 5 * 60 * 1000; // 5 minutes
const tokenCache = new Map<string, TokenCache>();

interface HttpRequestHelper {
	httpRequest(options: IHttpRequestOptions): Promise<any>;
}

/**
 * Get access token with caching
 * Works with both IExecuteFunctions and IWebhookFunctions
 */
export async function getAccessToken(
	node: INode,
	helpers: HttpRequestHelper,
	baseUrl: string,
	credentials: IDataObject,
	useCache: boolean = true,
	useNodeApiError: boolean = false,
): Promise<string> {
	const cacheKey = `${credentials.username}@${baseUrl}`;

	// Return cached token if still valid (with 1 minute buffer)
	if (useCache) {
		const cached = tokenCache.get(cacheKey);
		if (cached && cached.expiresAt > Date.now() + 60000) {
			return cached.token;
		}
	}

	// Fetch new token
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

	const response = await helpers.httpRequest(options);

	if (!response.access_token) {
		if (useNodeApiError) {
			throw new NodeApiError(node, {
				message: 'Failed to obtain access token from Compozz API',
			});
		} else {
			throw new NodeOperationError(node, 'Failed to obtain access token from Compozz API');
		}
	}

	// Cache token for 5 minutes (assuming 1 hour expiry)
	if (useCache) {
		tokenCache.set(cacheKey, {
			token: response.access_token,
			expiresAt: Date.now() + REFRESH_TOKEN_INTERVAL,
		});
	}

	return response.access_token as string;
}
