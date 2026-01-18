# GraphQL MCP Server

A generic Model Context Protocol (MCP) server that turns any GraphQL API into Claude Code tools.

## What It Does

- **Point it at any GraphQL endpoint** (GitHub, Shopify, Hasura, etc.)
- **Drop `.graphql` query files in a folder**
- **Automatically exposes them as Claude Code tools**

No coding required - just write GraphQL queries.

## Why Use This?

### Token Savings

GraphQL lets you request only the fields you need, dramatically reducing response size:

| API Type | Response Size | Tokens Used | Savings |
|----------|---------------|-------------|---------|
| REST | 168 KB | ~42,000 | - |
| GraphQL (minimal) | 500 bytes | ~125 | 99.7% |
| GraphQL (targeted) | 5 KB | ~1,250 | 97% |

### Convenience

Instead of writing custom MCP server code for each API, just:
1. Configure the endpoint
2. Write GraphQL queries
3. Done

## Installation

```bash
npm install -g graphql-mcp-server
```

Or clone and build:

```bash
git clone https://github.com/YOUR_USERNAME/graphql-mcp-server.git
cd graphql-mcp-server
npm install
npm run build
```

## Quick Start

### 1. Create a project directory

```bash
mkdir my-graphql-mcp
cd my-graphql-mcp
mkdir operations
```

### 2. Create `config.json`

```json
{
  "endpoint": "https://api.github.com/graphql",
  "operationsDir": "./operations",
  "headers": {
    "Authorization": "Bearer YOUR_TOKEN_HERE"
  },
  "name": "my-mcp-server",
  "version": "1.0.0"
}
```

### 3. Create GraphQL query files

Create `operations/GetRepository.graphql`:

```graphql
# @description Get repository information

query GetRepository($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    name
    description
    stargazerCount
    url
  }
}
```

### 4. Configure Claude Code

Add to `~/.config/claude-code/mcp_settings.json`:

```json
{
  "mcpServers": {
    "my-graphql-mcp": {
      "command": "node",
      "args": ["/path/to/graphql-mcp-server/dist/index.js"],
      "env": {
        "GRAPHQL_MCP_CONFIG": "/path/to/my-graphql-mcp/config.json"
      }
    }
  }
}
```

### 5. Restart Claude Code

The MCP server will automatically load your GraphQL operations as tools.

## Configuration Reference

### `config.json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `endpoint` | string | Yes | GraphQL API endpoint URL |
| `operationsDir` | string | Yes | Path to directory containing `.graphql` files |
| `headers` | object | No | HTTP headers (e.g., Authorization) |
| `name` | string | No | MCP server name (default: "graphql-mcp-server") |
| `version` | string | No | MCP server version (default: "1.0.0") |

### Environment Variables

- `GRAPHQL_MCP_CONFIG`: Path to config file (default: `./config.json`)

## Writing GraphQL Operations

### Basic Query

```graphql
# @description Brief description shown in Claude

query OperationName($param1: String!, $param2: Int) {
  field1
  field2
}
```

### Features

- **`@description` comment**: Appears in Claude's tool list
- **Variables**: Automatically become tool parameters
- **Type support**: String, Int, Float, Boolean, ID, arrays
- **Required params**: Variables ending with `!` are required

### Example: Search Query

```graphql
# @description Search repositories by keyword

query SearchRepos($query: String!, $limit: Int!) {
  search(query: $query, type: REPOSITORY, first: $limit) {
    repositoryCount
    edges {
      node {
        ... on Repository {
          name
          url
          stargazerCount
        }
      }
    }
  }
}
```

## Examples

### GitHub API

**Config:**
```json
{
  "endpoint": "https://api.github.com/graphql",
  "operationsDir": "./operations",
  "headers": {
    "Authorization": "Bearer ghp_YOUR_TOKEN"
  }
}
```

**Operations:**
- See `examples/github/operations/` for sample queries

### Shopify API

**Config:**
```json
{
  "endpoint": "https://YOUR_STORE.myshopify.com/admin/api/2024-01/graphql.json",
  "operationsDir": "./operations",
  "headers": {
    "X-Shopify-Access-Token": "YOUR_TOKEN"
  }
}
```

**Operations:**
- See `examples/shopify/operations/` for sample queries

### Hasura / Self-Hosted

**Config:**
```json
{
  "endpoint": "http://localhost:8080/v1/graphql",
  "operationsDir": "./operations",
  "headers": {
    "x-hasura-admin-secret": "YOUR_SECRET"
  }
}
```

## How It Works

```
┌──────────┐     ┌──────────────┐     ┌────────────────┐
│  Claude  │────▶│  MCP Server  │────▶│ GraphQL API    │
│   Code   │     │  (this tool) │     │ (any endpoint) │
└──────────┘     └──────────────┘     └────────────────┘
                        │
                        ▼
                 Loads *.graphql
                 from operations/
```

1. MCP server reads all `.graphql` files from `operationsDir`
2. Registers each as a Claude Code tool
3. When Claude calls a tool:
   - Sends GraphQL query to configured endpoint
   - Passes variables from Claude
   - Returns response to Claude

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in dev mode (with auto-reload)
npm run dev

# Run built version
npm start
```

## Troubleshooting

### "Configuration file not found"

- Check `GRAPHQL_MCP_CONFIG` environment variable
- Ensure `config.json` exists in current directory or specified path

### "No .graphql files found"

- Check `operationsDir` path in config
- Ensure `.graphql` or `.gql` files exist in that directory

### "HTTP 401 Unauthorized"

- Check `headers.Authorization` in config
- Verify your API token is valid

### "GraphQL errors in response"

- Test your query directly against the API first
- Check variable types match the schema
- Verify required fields are present

## Requirements

- Node.js 16+
- A GraphQL API endpoint
- Valid authentication credentials (if required by API)

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Related Projects

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Code](https://claude.ai/claude-code)
