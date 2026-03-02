import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { getAccessToken } from './utils';

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
					{
						name: 'Webhook',
						value: 'webhook',
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
			// Webhook operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['webhook'],
					},
				},
				options: [
					{
						name: 'Validate',
						value: 'validate',
						description: 'Validate a webhook signature',
						action: 'Validate webhook signature',
					},
				],
				default: 'validate',
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
			// Webhook fields
			{
				displayName: 'Signature',
				name: 'signature',
				type: 'string',
				required: true,
				default: '',
				description: 'The webhook signature from X-Compozz-Signature header',
				displayOptions: {
					show: {
						resource: ['webhook'],
					},
				},
			},
			{
				displayName: 'Payload',
				name: 'payload',
				type: 'json',
				required: true,
				default: '={{ $json }}',
				description: 'The webhook payload (JSON object)',
				displayOptions: {
					show: {
						resource: ['webhook'],
					},
				},
			},
			{
				displayName: 'Tenant ID',
				name: 'tenantId',
				type: 'string',
				required: true,
				default: '',
				description: 'The tenant ID from X-Compozz-Tenant header',
				displayOptions: {
					show: {
						resource: ['webhook'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('compozzApi');
		const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

		// Get access token (with caching)
		const accessToken = await getAccessToken(
			this.getNode(),
			this.helpers,
			baseUrl,
			credentials,
			true, // Use cache
			false, // Use NodeOperationError
		);

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
				} else if (resource === 'webhook') {
					if (operation === 'validate') {
						const signature = this.getNodeParameter('signature', i) as string;
						const payload = this.getNodeParameter('payload', i) as IDataObject;
						const tenantId = this.getNodeParameter('tenantId', i) as string;

						responseData = await validateWebhookSignature.call(
							this,
							baseUrl,
							accessToken,
							signature,
							payload,
							tenantId,
						);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray([responseData]),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, {
							itemIndex: i,
						});
					}
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

/**
 * Validate webhook signature using the validation endpoint
 */
async function validateWebhookSignature(
	this: IExecuteFunctions,
	baseUrl: string,
	accessToken: string,
	signature: string,
	payload: IDataObject,
	tenantId: string,
): Promise<IDataObject> {
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
		returnFullResponse: true,
	};

	const response = await this.helpers.httpRequest(options);

	if (response.statusCode !== 200) {
		throw new NodeOperationError(
			this.getNode(),
			`Webhook validation failed: ${JSON.stringify(response.body)}`,
		);
	}

	return response.body as IDataObject;
}
