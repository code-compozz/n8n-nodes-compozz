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
| Webhook | Webhook signature validation |

#### Operations

##### Record

| Operation | Description | API Endpoint |
|-----------|-------------|--------------|
| Create | Create a new record | `POST /data/records` |
| Get Many | Retrieve multiple records | `POST /data/records/paths?mode=simple` |
| Update | Update an existing record | `PATCH /data/records` |

##### Webhook

| Operation | Description | API Endpoint |
|-----------|-------------|--------------|
| Validate | Validate a webhook signature | `POST /admin/webhook/validate` |

### Parameters

#### Common Parameters (all operations)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| Workspace | String | Yes | The name of the workspace |
| Object | String | Yes | The name of the object |

#### Create Record

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| Link By Value | Boolean | No | `true` | Whether to link records by the value of the field instead of by the record key |
| Fields | Collection | No | - | Field name/value pairs to set on the record |

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

#### Validate Webhook Signature

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| Signature | String | Yes | The webhook signature from `X-Compozz-Signature` header |
| Payload | JSON | Yes | The webhook payload (defaults to `{{ $json }}`) |
| Tenant ID | String | Yes | The tenant ID from `X-Compozz-Tenant` header |

---

### Compozz Webhook Trigger

A trigger node that starts a workflow when a webhook from Compozz is received.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| Tenant ID | String | Yes | - | Your Compozz tenant ID (used to generate unique webhook URL) |

**Note**: Compozz API credentials are required for this trigger node.

#### Webhook URL

The webhook URL is dynamically generated based on your tenant ID:
```
https://<your-n8n-instance>/webhook/compozz-webhook-<tenantId>
```

#### Output Data

The trigger outputs the webhook payload along with extracted headers:

| Field | Description |
|-------|-------------|
| `...body` | All fields from the webhook payload |
| `_headers.signature` | Value from `X-Compozz-Signature` header |
| `_headers.tenantId` | Value from `X-Compozz-Tenant` header |
| `_headers.action` | Value from `X-Compozz-Action` header |
| `_headers.eventId` | Value from `X-Compozz-Event-ID` header |
| `_headers.timestamp` | Value from `X-Compozz-Timestamp` header |

#### Signature Validation

Signature validation is **always enabled** and mandatory. The trigger will:
1. Require Compozz API credentials to be configured
2. Call the `POST /admin/webhook/validate` endpoint to verify the signature
3. Reject webhooks with invalid signatures (returns error response)

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

### Validate a Webhook Signature

1. Add the Compozz node to your workflow (after a Webhook node)
2. Select **Webhook** as the resource
3. Select **Validate** as the operation
4. Map the signature from `X-Compozz-Signature` header
5. Pass the payload (defaults to incoming JSON)
6. Map the tenant ID from `X-Compozz-Tenant` header

### Use the Webhook Trigger

1. Add the **Compozz Webhook Trigger** node as the start of your workflow
2. Configure **Compozz API credentials** (required)
3. Enter your **Tenant ID**
4. Copy the generated webhook URL and configure it in Compozz
5. The workflow will trigger when Compozz sends a webhook (signature validation is automatic)

## Release / Publishing

### Prerequisites

- Node.js version 20.x or later (required for `n8n-node release`)
- npm account with 2FA enabled or granular access token with bypass 2FA enabled
- npm authentication token configured: `npm config set //registry.npmjs.org/:_authToken=<YOUR_TOKEN>`

Before starting the release process, ensure you're using Node.js 20:
```bash
nvm use 20
```

### Release Process

> **⚠️ Warning**: Before releasing, ensure that:
> - You are on the `master` branch (or `main` branch)
> - All changes are committed
> - All commits are pushed to the remote repository
> - Your working directory is clean (no uncommitted changes)

The release process is handled automatically by `npm run release`, which will:

1. Run linting and build checks
2. Determine the appropriate version bump (patch, minor, or major)
3. Update the version in `package.json`
4. Create a git commit with the version bump
5. Create a git tag for the new version
6. Publish to npm
7. Push commits and tags to the remote repository

**Do not** use `npm version` commands manually, as `npm run release` handles version management automatically.

### Steps

1. Ensure you're on the master branch and everything is committed and pushed:
   ```bash
   git checkout master
   git status  # Should show "working tree clean"
   git pull origin master
   ```

2. Switch to Node.js 20 (if using nvm):
   ```bash
   nvm use 20
   ```

3. Run the release command (this handles build and publish automatically):
   ```bash
   npm run release
   ```
   
   **Note**: Use `npm run release` instead of manually running `npm run build` and `npm publish`. The release script handles everything automatically.

4. Follow the interactive prompts to select the version bump type (patch/minor/major)

5. The release script will handle the rest automatically

### Manual Publishing (Not Recommended)

> **⚠️ Do not use this method**. Always use `npm run release` instead of manually running `npm run build` and `npm publish`.

If you absolutely need to publish manually (not recommended), you can use:

```bash
npm run build
npm publish
```

However, this will not update git tags or version numbers automatically, and may cause issues with the release process.

## Updating the Node on Your n8n Server

To update the Compozz node to the latest version on your n8n server:

1. Go to the n8n server
2. Install or update the package:
   ```bash
   npm install n8n-nodes-compozz@latest
   ```
3. Go to the n8n launch directory
4. Restart n8n using Docker Compose:
   ```bash
   docker compose restart
   ```
5. Go to the n8n web interface and refresh the page and go to a Compozz node. On settings tab, you should see a button to "Update Node". Click it and wait for the node to be updated.

After restarting, the node will be loaded with the latest version. Existing workflows will continue to work and will use the new version of the node.

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
