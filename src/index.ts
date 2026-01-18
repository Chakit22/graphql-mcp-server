#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Config {
  endpoint: string;
  operationsDir: string;
  headers?: Record<string, string>;
  name?: string;
  version?: string;
}

interface GraphQLOperation {
  name: string;
  query: string;
  file: string;
  description?: string;
}

interface GraphQLVariable {
  name: string;
  type: string;
  required: boolean;
  isArray: boolean;
}

// Load configuration
function loadConfig(): Config {
  const configPath = process.env.GRAPHQL_MCP_CONFIG || join(process.cwd(), 'config.json');

  if (!existsSync(configPath)) {
    throw new Error(
      `Configuration file not found at ${configPath}\n` +
      `Create a config.json file or set GRAPHQL_MCP_CONFIG environment variable.\n` +
      `Example config.json:\n` +
      JSON.stringify({
        endpoint: 'https://api.example.com/graphql',
        operationsDir: './operations',
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN'
        }
      }, null, 2)
    );
  }

  const config = JSON.parse(readFileSync(configPath, 'utf-8')) as Config;

  if (!config.endpoint) {
    throw new Error('Configuration must include "endpoint" field');
  }

  if (!config.operationsDir) {
    throw new Error('Configuration must include "operationsDir" field');
  }

  return config;
}

// Load all GraphQL operations from directory
function loadOperations(operationsDir: string): GraphQLOperation[] {
  if (!existsSync(operationsDir)) {
    throw new Error(`Operations directory not found: ${operationsDir}`);
  }

  const operations: GraphQLOperation[] = [];
  const files = readdirSync(operationsDir);

  for (const file of files) {
    if (file.endsWith('.graphql') || file.endsWith('.gql')) {
      const filePath = join(operationsDir, file);
      const content = readFileSync(filePath, 'utf-8');

      // Extract operation name and description from file
      const name = file.replace(/\.(graphql|gql)$/, '');
      const descMatch = content.match(/#\s*@description\s+(.+)/);
      const description = descMatch ? descMatch[1].trim() : undefined;

      operations.push({
        name,
        query: content,
        file,
        description
      });
    }
  }

  if (operations.length === 0) {
    throw new Error(`No .graphql or .gql files found in ${operationsDir}`);
  }

  return operations;
}

// Execute GraphQL query
async function executeGraphQL(
  endpoint: string,
  query: string,
  variables: Record<string, any> = {},
  headers: Record<string, string> = {}
): Promise<any> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json() as any;

  if (result.errors) {
    throw new Error(JSON.stringify(result.errors, null, 2));
  }

  return result.data;
}

// Extract variables from GraphQL query
function extractVariables(query: string): GraphQLVariable[] {
  const varRegex = /\$(\w+):\s*([^\s,)]+)/g;
  const variables: GraphQLVariable[] = [];
  let match;

  while ((match = varRegex.exec(query)) !== null) {
    const [, name, type] = match;
    const isRequired = type.endsWith('!');
    const isArray = type.includes('[');
    const cleanType = type.replace(/[!\[\]]/g, '');

    variables.push({
      name,
      type: cleanType,
      required: isRequired,
      isArray,
    });
  }

  return variables;
}

// Convert GraphQL type to JSON Schema type
function gqlTypeToJsonSchema(gqlType: string): string {
  const typeMap: Record<string, string> = {
    'String': 'string',
    'Int': 'number',
    'Float': 'number',
    'Boolean': 'boolean',
    'ID': 'string',
  };
  return typeMap[gqlType] || 'string';
}

// Main
async function main() {
  try {
    // Load configuration
    const config = loadConfig();
    const operations = loadOperations(config.operationsDir);

    console.error(`Loaded ${operations.length} GraphQL operations from ${config.operationsDir}`);
    console.error(`GraphQL endpoint: ${config.endpoint}`);

    // Create MCP server
    const server = new Server(
      {
        name: config.name || 'graphql-mcp-server',
        version: config.version || '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: operations.map(op => {
          const variables = extractVariables(op.query);
          const properties: Record<string, any> = {};
          const required: string[] = [];

          for (const v of variables) {
            const jsonType = gqlTypeToJsonSchema(v.type);

            properties[v.name] = {
              type: v.isArray ? 'array' : jsonType,
              description: `${v.type}${v.isArray ? ' array' : ''}`,
            };

            if (v.isArray) {
              properties[v.name].items = { type: jsonType };
            }

            if (v.required) {
              required.push(v.name);
            }
          }

          return {
            name: op.name,
            description: op.description || `Execute ${op.name} GraphQL operation`,
            inputSchema: {
              type: 'object' as const,
              properties,
              required,
            },
          };
        }),
      };
    });

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const operation = operations.find(op => op.name === name);

      if (!operation) {
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        const data = await executeGraphQL(
          config.endpoint,
          operation.query,
          args || {},
          config.headers || {}
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error executing ${name}: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });

    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('GraphQL MCP server running');
  } catch (error) {
    console.error('Fatal error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error);
