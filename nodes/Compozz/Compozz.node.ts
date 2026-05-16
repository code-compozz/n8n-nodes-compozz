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
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete one or more records',
						action: 'Delete records',
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
				displayName: 'Workspace Name',
				name: 'workspace',
				type: 'string',
				default: '',
				description: 'The name of the workspace (either name or key must be provided)',
				displayOptions: {
					show: {
						resource: ['record'],
					},
				},
			},
			{
				displayName: 'Workspace Key',
				name: 'workspaceKey',
				type: 'string',
				default: '',
				description: 'The key of the workspace (either name or key must be provided)',
				displayOptions: {
					show: {
						resource: ['record'],
					},
				},
			},
			{
				displayName: 'Object Name',
				name: 'object',
				type: 'string',
				default: '',
				description: 'The name of the object (either name or key must be provided)',
				displayOptions: {
					show: {
						resource: ['record'],
					},
				},
			},
			{
				displayName: 'Object Key',
				name: 'objectKey',
				type: 'string',
				default: '',
				description: 'The key of the object (either name or key must be provided)',
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
			// Link By Value (for create and update)
			{
				displayName: 'Link By Value',
				name: 'linkByValue',
				type: 'boolean',
				default: true,
				description: 'Whether to link records by the value of the field instead of by the record key',
				displayOptions: {
					show: {
						resource: ['record'],
						operation: ['create', 'update'],
					},
				},
			},
			// Field By Name (for create, update and getMany)
			{
				displayName: 'Field By Name',
				name: 'fieldByName',
				type: 'boolean',
				default: true,
				description: 'Whether field names are used to identify fields instead of field keys',
				displayOptions: {
					show: {
						resource: ['record'],
						operation: ['create', 'update', 'getMany'],
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
			// Keys of the records to retrieve or delete (for getMany and delete)
			{
				displayName: 'Record Keys',
				name: 'recordKeys',
				type: 'string',
				default: '',
				placeholder: 'key1, key2, key3',
				description: 'Comma-separated list of record keys (leave empty to retrieve all records; required for delete)',
				displayOptions: {
					show: {
						resource: ['record'],
						operation: ['getMany', 'delete'],
					},
				},
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
							{
								displayName: 'Value as Key',
								name: 'valueAsKey',
								type: 'boolean',
								default: false,
								description: 'Whether to treat the value as a key instead of a value',
							},
						],
					},
				],
			},
			// Aggregations (for getMany)
			{
				displayName: 'Aggregations',
				name: 'aggregations',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Aggregation',
				description: 'Per-field aggregation to apply when retrieving records',
				displayOptions: {
					show: {
						resource: ['record'],
						operation: ['getMany'],
					},
				},
				options: [
					{
						name: 'aggregationValues',
						displayName: 'Aggregation',
						values: [
							{
								displayName: 'Field Name',
								name: 'fieldName',
								type: 'string',
								default: '',
								description: 'Name (or key) of the field to aggregate',
							},
							{
								displayName: 'Aggregation Type',
								name: 'aggregationType',
								type: 'options',
								default: 'NO_AGGR',
								options: [
									{ name: 'Average', value: 'AVG' },
									{ name: 'Concat', value: 'CONCAT' },
									{ name: 'Count', value: 'COUNT' },
									{ name: 'First', value: 'FIRST' },
									{ name: 'Max', value: 'MAX' },
									{ name: 'Min', value: 'MIN' },
									{ name: 'Month', value: 'MONTH' },
									{ name: 'None', value: 'NO_AGGR' },
									{ name: 'Quarter', value: 'QUARTER' },
									{ name: 'Sum', value: 'SUM' },
									{ name: 'Value', value: 'VALUE' },
									{ name: 'Week', value: 'WEEK' },
									{ name: 'Year', value: 'YEAR' },
								],
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
					const workspaceKey = this.getNodeParameter('workspaceKey', i) as string;
					const object = this.getNodeParameter('object', i) as string;
					const objectKey = this.getNodeParameter('objectKey', i) as string;

					// Validate that at least one of workspace name or key is provided
					if (!workspace && !workspaceKey) {
						throw new NodeOperationError(
							this.getNode(),
							'Either workspace name or workspace key must be provided',
							{ itemIndex: i },
						);
					}

					// Validate that at least one of object name or key is provided
					if (!object && !objectKey) {
						throw new NodeOperationError(
							this.getNode(),
							'Either object name or object key must be provided',
							{ itemIndex: i },
						);
					}


					if (operation === 'create') {
						responseData = await createRecord.call(
							this,
							baseUrl,
							accessToken,
							workspace,
							workspaceKey,
							object,
							objectKey,
							i,
						);
					} else if (operation === 'getMany') {
						responseData = await getRecords.call(
							this,
							baseUrl,
							accessToken,
							workspace,
							workspaceKey,
							object,
							objectKey,
							i,
						);
					} else if (operation === 'update') {
						responseData = await updateRecord.call(
							this,
							baseUrl,
							accessToken,
							workspace,
							workspaceKey,
							object,
							objectKey,
							i,
						);
					} else if (operation === 'delete') {
						responseData = await deleteRecords.call(
							this,
							baseUrl,
							accessToken,
							workspace,
							workspaceKey,
							object,
							objectKey,
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
	workspaceName: string,
	workspaceKey: string,
	objectName: string,
	objectKey: string,
	itemIndex: number,
): Promise<IDataObject> {

	const fieldsInput = this.getNodeParameter('fields', itemIndex) as {
		fieldValues?: Array<{ name: string; value: string }>;
	};
	const linkByValue = this.getNodeParameter('linkByValue', itemIndex, true) as boolean;
	const fieldByName = this.getNodeParameter('fieldByName', itemIndex, true) as boolean;

	const body: IDataObject = {
		fieldByName,
		fields: fieldsInput.fieldValues,
		linkByValue,
	};

	// Add workspace/workspaceKey (use key if provided, otherwise name)
	if (workspaceKey) {
		body.workspaceKey = workspaceKey;
	} else if (workspaceName) {
		body.workspace = workspaceName;
	}

	// Add object/objectKey (use key if provided, otherwise name)
	if (objectKey) {
		body.objectKey = objectKey;
	} else if (objectName) {
		body.object = objectName;
	}

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${baseUrl}/data/records`,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body,
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
	workspaceName: string,
	workspaceKey: string,
	objectName: string,
	objectKey: string,
	itemIndex: number,
): Promise<IDataObject> {
	const fieldsToRetrieve = this.getNodeParameter('fieldsToRetrieve', itemIndex) as string;
	const filtersInput = this.getNodeParameter('filters', itemIndex) as {
		filterValues?: Array<{ fieldName: string; fieldValue: string; valueAsBool: boolean; valueAsKey: boolean }>;
	};
	const aggregationsInput = this.getNodeParameter('aggregations', itemIndex) as {
		aggregationValues?: Array<{ fieldName: string; aggregationType: string }>;
	};
	const recordKeysInput = this.getNodeParameter('recordKeys', itemIndex) as string;
	const recordKeys = recordKeysInput
		? recordKeysInput.split(',').map((key) => key.trim()).filter((key) => key)
		: [];

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
		} else if (filter.valueAsKey) {
			fieldValue = { valueKey: filter.fieldValue };
		}
		filters[filter.fieldName] = fieldValue;
	}
	/* eslint-enable @typescript-eslint/no-explicit-any */

	const aggregations: Record<string, string> = {};
	for (const aggr of aggregationsInput.aggregationValues || []) {
		if (aggr.fieldName) {
			aggregations[aggr.fieldName] = aggr.aggregationType;
		}
	}

	const fieldByName = this.getNodeParameter('fieldByName', itemIndex, true) as boolean;

	const body: IDataObject = {
		fieldByName,
		filters,
	};

	if (Object.keys(aggregations).length > 0) {
		body.aggregations = aggregations;
	}


	if (workspaceKey) {
		body.workspaceKey = workspaceKey;
	} else if (workspaceName) {
		body.workspace = workspaceName;
	}

	if (objectKey) {
		body.objectKey = objectKey;
	} else if (objectName) {
		body.object = objectName;
	}

	if (fields.length > 0) {
		body.fields = fields;
	}

	if (recordKeys.length > 0) {
		body.recordKeys = recordKeys;
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
	workspaceName: string,
	workspaceKey: string,
	objectName: string,
	objectKey: string,
	itemIndex: number,
): Promise<IDataObject> {
	const fieldsInput = this.getNodeParameter('fields', itemIndex) as {
		fieldValues?: Array<{ name: string; value: string }>;
	};
	const recordKey = this.getNodeParameter('recordKey', itemIndex) as string;
	const linkByValue = this.getNodeParameter('linkByValue', itemIndex, true) as boolean;
	const fieldByName = this.getNodeParameter('fieldByName', itemIndex, true) as boolean;

	const body: IDataObject = {
		recordKey,
		fieldByName,
		fields: fieldsInput.fieldValues,
		linkByValue,
	};

	if (workspaceKey) {
		body.workspaceKey = workspaceKey;
	} else if (workspaceName) {
		body.workspace = workspaceName;
	}

	if (objectKey) {
		body.objectKey = objectKey;
	} else if (objectName) {
		body.object = objectName;
	}

	const options: IHttpRequestOptions = {
		method: 'PATCH',
		url: `${baseUrl}/data/records`,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body,
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
 * Delete records
 */
async function deleteRecords(
	this: IExecuteFunctions,
	baseUrl: string,
	accessToken: string,
	workspaceName: string,
	workspaceKey: string,
	objectName: string,
	objectKey: string,
	itemIndex: number,
): Promise<IDataObject> {
	const recordKeysInput = this.getNodeParameter('recordKeys', itemIndex) as string;
	const recordKeys = recordKeysInput
		? recordKeysInput.split(',').map((k) => k.trim()).filter((k) => k)
		: [];

	if (recordKeys.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'At least one record key must be provided for delete',
			{ itemIndex },
		);
	}

	const body: IDataObject = { recordKeys };

	if (workspaceKey) {
		body.workspaceKey = workspaceKey;
	} else if (workspaceName) {
		body.workspace = workspaceName;
	}

	if (objectKey) {
		body.objectKey = objectKey;
	} else if (objectName) {
		body.object = objectName;
	}

	const options: IHttpRequestOptions = {
		method: 'DELETE',
		url: `${baseUrl}/data/records`,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body,
		json: true,
		returnFullResponse: true,
	};

	const response = await this.helpers.httpRequest(options);

	if (response.statusCode !== 204) {
		throw new NodeOperationError(this.getNode(), response.body, {
			itemIndex,
		});
	}

	return { deleted: recordKeys.length, recordKeys };
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
