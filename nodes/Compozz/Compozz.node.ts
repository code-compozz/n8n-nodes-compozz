import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

// Token cache to avoid re-authenticating for each item
interface TokenCache {
	token: string;
	expiresAt: number;
}

const REFRESH_TOKEN_INTERVAL = 5 * 60 * 1000; // 5 minutes
const tokenCache = new Map<string, TokenCache>();

export class Compozz implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Compozz',
		name: 'compozz',
		icon: { light: 'file:compozz.svg', dark: 'file:compozz.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Compozz API',
		usableAsTool: undefined,
		defaults: {
			name: 'Compozz',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'compozzApi',
				required: true,
			},
		],
		properties: [
			// Resource
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Record',
						value: 'record',
					},
				],
				default: 'record',
			},
			// Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['record'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new record',
						action: 'Create a record',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Retrieve multiple records',
						action: 'Get many records',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update an existing record',
						action: 'Update a record',
					},
				],
				default: 'create',
			},
			// Common fields
			{
				displayName: 'Workspace',
				name: 'workspace',
				type: 'string',
				required: true,
				default: '',
				description: 'The name of the workspace',
				displayOptions: {
					show: {
						resource: ['record'],
					},
				},
			},
			{
				displayName: 'Object',
				name: 'object',
				type: 'string',
				required: true,
				default: '',
				description: 'The name of the object',
				displayOptions: {
					show: {
						resource: ['record'],
					},
				},
			},
			// Record Key (for update)
			{
				displayName: 'Record Key',
				name: 'recordKey',
				type: 'string',
				required: true,
				default: '',
				description: 'The key of the record to update',
				displayOptions: {
					show: {
						resource: ['record'],
						operation: ['update'],
					},
				},
			},
			// Link By Value (for create)
			{
				displayName: 'Link By Value',
				name: 'linkByValue',
				type: 'boolean',
				default: true,
				description: 'Whether to link records by the value of the field instead of by the record key',
				displayOptions: {
					show: {
						resource: ['record'],
						operation: ['create'],
					},
				},
			},
			// Fields (for create and update)
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Field',
				description: 'Fields to set on the record',
				displayOptions: {
					show: {
						resource: ['record'],
						operation: ['create', 'update'],
					},
				},
				options: [
					{
						name: 'fieldValues',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the field',
							},
							{
								displayName: 'Field Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the field',
							},
						],
					},
				],
			},
			// Fields to retrieve (for getMany)
			{
				displayName: 'Fields to Retrieve',
				name: 'fieldsToRetrieve',
				type: 'string',
				default: '',
				placeholder: 'field1, field2, field3',
				description: 'Comma-separated list of field names to retrieve (leave empty for all)',
				displayOptions: {
					show: {
						resource: ['record'],
						operation: ['getMany'],
					},
				},
			},
			// Filters (for getMany)
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Filter',
				description: 'Filters to apply when retrieving records',
				displayOptions: {
					show: {
						resource: ['record'],
						operation: ['getMany'],
					},
				},
				options: [
					{
						name: 'filterValues',
						displayName: 'Filter',
						values: [
							{
								displayName: 'Field Name',
								name: 'fieldName',
								type: 'string',
								default: '',
								description: 'Name of the field to filter on',
							},
							{
								displayName: 'Field Value',
								name: 'fieldValue',
								type: 'string',
								default: '',
								description: 'Value to filter by',
							},
							{
								displayName: 'Value as Boolean',
								name: 'valueAsBool',
								type: 'boolean',
								default: false,
								description: 'Whether to treat the value as a boolean',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('compozzApi');
		const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

		// Get access token (with caching)
		const accessToken = await getAccessToken.call(this, baseUrl, credentials);

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[];

				if (resource === 'record') {
					const workspace = this.getNodeParameter('workspace', i) as string;
					const object = this.getNodeParameter('object', i) as string;

					if (operation === 'create') {
						responseData = await createRecord.call(
							this,
							baseUrl,
							accessToken,
							workspace,
							object,
							i,
						);
					} else if (operation === 'getMany') {
						responseData = await getRecords.call(
							this,
							baseUrl,
							accessToken,
							workspace,
							object,
							i,
						);
					} else if (operation === 'update') {
						const recordKey = this.getNodeParameter('recordKey', i) as string;
						responseData = await updateRecord.call(
							this,
							baseUrl,
							accessToken,
							workspace,
							object,
							recordKey,
							i,
						);
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, {
							itemIndex: i,
						});
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

/**
 * Get access token with caching
 */
async function getAccessToken(
	this: IExecuteFunctions,
	baseUrl: string,
	credentials: IDataObject,
): Promise<string> {
	const cacheKey = `${credentials.username}@${baseUrl}`;
	const cached = tokenCache.get(cacheKey);

	// Return cached token if still valid (with 1 minute buffer)
	if (cached && cached.expiresAt > Date.now() + 60000) {
		return cached.token;
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

	const response = await this.helpers.httpRequest(options);

	if (!response.access_token) {
		throw new NodeOperationError(this.getNode(), 'Failed to obtain access token from Compozz API');
	}

	// Cache token for 5 minutes (assuming 1 hour expiry)
	tokenCache.set(cacheKey, {
		token: response.access_token,
		expiresAt: Date.now() + REFRESH_TOKEN_INTERVAL,
	});

	return response.access_token;
}

/**
 * Create a record
 */
async function createRecord(
	this: IExecuteFunctions,
	baseUrl: string,
	accessToken: string,
	workspace: string,
	object: string,
	itemIndex: number,
): Promise<IDataObject> {
	const fieldsInput = this.getNodeParameter('fields', itemIndex) as {
		fieldValues?: Array<{ name: string; value: string }>;
	};
	const linkByValue = this.getNodeParameter('linkByValue', itemIndex, true) as boolean;

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${baseUrl}/data/records`,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body: {
			workspace,
			object,
			fieldByName: true,
			fields: fieldsInput.fieldValues,
			linkByValue,
		},
		json: true,
		returnFullResponse: true,
	};

	const response = await this.helpers.httpRequest(options);

	if (response.statusCode !== 201) {
		throw new NodeOperationError(this.getNode(), response.body, {
			itemIndex: itemIndex,
		});
	}

	return JSON.parse(JSON.stringify(response.body));
}

/**
 * Retrieve records
 */
async function getRecords(
	this: IExecuteFunctions,
	baseUrl: string,
	accessToken: string,
	workspace: string,
	object: string,
	itemIndex: number,
): Promise<IDataObject> {
	const fieldsToRetrieve = this.getNodeParameter('fieldsToRetrieve', itemIndex) as string;
	const filtersInput = this.getNodeParameter('filters', itemIndex) as {
		filterValues?: Array<{ fieldName: string; fieldValue: string; valueAsBool: boolean }>;
	};

	// Parse fields to retrieve
	const fields = fieldsToRetrieve
		? fieldsToRetrieve.split(',').map((f) => f.trim()).filter((f) => f)
		: [];

	/* eslint-disable @typescript-eslint/no-explicit-any */
	const filters: Record<string, any> = {};
	for (const filter of filtersInput.filterValues || []) {
		let fieldValue: any = filter.fieldValue;
		if (filter.valueAsBool) {
			fieldValue = filter.fieldValue.toLowerCase() === 'true';
		}
		filters[filter.fieldName] = fieldValue;
	}
	/* eslint-enable @typescript-eslint/no-explicit-any */

	const body: IDataObject = {
		workspace,
		object,
		fieldByName: true,
		filters: filters,
	};

	if (fields.length > 0) {
		body.fields = fields;
	}

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${baseUrl}/data/records/paths?mode=simple`,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body,
		json: true,
		returnFullResponse: true,
	};

	const response = await this.helpers.httpRequest(options);

	if (response.statusCode !== 200) {
		throw new NodeOperationError(this.getNode(), response.response, {
			itemIndex: itemIndex,
		});
	}

	// Ensure we only return serializable data
	return JSON.parse(JSON.stringify(response.body));
}

/**
 * Update a record
 */
async function updateRecord(
	this: IExecuteFunctions,
	baseUrl: string,
	accessToken: string,
	workspace: string,
	object: string,
	recordKey: string,
	itemIndex: number,
): Promise<IDataObject> {
	const fieldsInput = this.getNodeParameter('fields', itemIndex) as {
		fieldValues?: Array<{ name: string; value: string }>;
	};

	const options: IHttpRequestOptions = {
		method: 'PATCH',
		url: `${baseUrl}/data/records`,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body: {
			workspace,
			object,
			recordKey,
			fieldByName: true,
			fields: fieldsInput.fieldValues,
		},
		json: true,
		returnFullResponse: true,
	};

	const response = await this.helpers.httpRequest(options);

	if (response.statusCode !== 204) {
		throw new NodeOperationError(this.getNode(), response.body, {
			itemIndex: itemIndex,
		});
	}

	return {};
}
