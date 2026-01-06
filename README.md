# n8n-nodes-compozz

This is an n8n community node that allows you to interact with the [Compozz](https://app.compozz.com) API in your n8n workflows.

Compozz is a data management platform that allows you to create, retrieve, and update records across workspaces and objects.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### npm

```bash
npm install n8n-nodes-compozz
```

### n8n GUI

1. Go to **Settings > Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-compozz` in the **Enter npm package name** field
4. Accept the risks and click **Install**

## Credentials

### Compozz API

To use this node, you need to configure the Compozz API credentials:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| Base URL | String | No | `https://app.compozz.com` | The base URL of the Compozz API |
| Username | String | Yes | - | Your Compozz username |
| Password | String (password) | Yes | - | Your Compozz password |

The node automatically handles authentication by obtaining and caching access tokens from the `/auth/login` endpoint.

## Node Reference

### Compozz

The Compozz node allows you to manage records in your Compozz workspaces.

#### Resources

| Resource | Description |
|----------|-------------|
| Record | Manage records within Compozz objects |

#### Operations

##### Record

| Operation | Description | API Endpoint |
|-----------|-------------|--------------|
| Create | Create a new record | `POST /data/records` |
| Get Many | Retrieve multiple records | `POST /data/records/paths?mode=simple` |
| Update | Update an existing record | `PATCH /data/records` |

### Parameters

#### Common Parameters (all operations)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| Workspace | String | Yes | The name of the workspace |
| Object | String | Yes | The name of the object |

#### Create Record

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| Fields | Collection | No | Field name/value pairs to set on the record |

**Fields Collection:**

| Field | Type | Description |
|-------|------|-------------|
| Field Name | String | Name of the field |
| Field Value | String | Value of the field |

#### Get Many Records

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| Fields to Retrieve | String | No | Comma-separated list of field names to retrieve (leave empty for all) |
| Filters | Collection | No | Filters to apply when retrieving records |

**Filters Collection:**

| Field | Type | Description |
|-------|------|-------------|
| Field Name | String | Name of the field to filter on |
| Field Value | String | Value to filter by |
| Value as Boolean | Boolean | Whether to treat the value as a boolean |

#### Update Record

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| Record Key | String | Yes | The key of the record to update |
| Fields | Collection | No | Field name/value pairs to update on the record |

## Usage Examples

### Create a Record

1. Add the Compozz node to your workflow
2. Select **Record** as the resource
3. Select **Create** as the operation
4. Enter your **Workspace** name
5. Enter your **Object** name
6. Add fields with their names and values

### Retrieve Records with Filters

1. Add the Compozz node to your workflow
2. Select **Record** as the resource
3. Select **Get Many** as the operation
4. Enter your **Workspace** and **Object** names
5. Optionally specify fields to retrieve (e.g., `name, email, status`)
6. Add filters to narrow down results

### Update a Record

1. Add the Compozz node to your workflow
2. Select **Record** as the resource
3. Select **Update** as the operation
4. Enter your **Workspace** and **Object** names
5. Enter the **Record Key** of the record to update
6. Add the fields you want to update with their new values

## Compatibility

- n8n version: 1.0.0 or later
- Node.js version: 18.x or later

## Resources

- [Compozz Documentation](https://app.compozz.com/manual)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)

## Support / Contact

If you have any questions or need support, please contact us at [contact@compozz.com](mailto:contact@compozz.com).
