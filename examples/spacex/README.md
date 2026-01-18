# SpaceX GraphQL MCP Example

This example demonstrates using the GraphQL MCP Server with the public SpaceX GraphQL API.

## Why This Example?

- **No authentication required** - Works immediately without API keys
- **Real data** - Live SpaceX rocket and launch information
- **Perfect for testing** - Verify the MCP server works before configuring authenticated APIs

## Setup

### 1. Configure Claude Code

Add to `~/.config/claude-code/mcp_settings.json`:

```json
{
  "mcpServers": {
    "spacex": {
      "command": "node",
      "args": [
        "/path/to/graphql-mcp-server/dist/index.js"
      ],
      "env": {
        "GRAPHQL_MCP_CONFIG": "/path/to/graphql-mcp-server/examples/spacex/config.json"
      }
    }
  }
}
```

### 2. Restart Claude Code

The SpaceX GraphQL tools will be available.

## Available Tools

### GetRockets

Get all SpaceX rockets with details (name, type, cost, success rate, etc.)

**Example in Claude Code:**
```
Show me all SpaceX rockets
```

### GetLaunches

Get recent launches with pagination.

**Example in Claude Code:**
```
Show me the last 5 SpaceX launches
```

## What You'll See

When you ask Claude about SpaceX data, it will:
1. Call the appropriate MCP tool
2. Query the SpaceX GraphQL API
3. Return structured data about rockets/launches
4. Use far fewer tokens than fetching raw REST data

## Testing Manually

You can test the queries directly:

```bash
cd examples/spacex
node ../../dist/index.js
```

Then use Claude Code to call the tools.

## API Documentation

SpaceX API docs: https://github.com/r-spacex/SpaceX-API
