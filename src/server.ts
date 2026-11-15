// src/server.ts — Frontier Studio MCP server (M1 registry core) over stdio.
import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { registerRegistryTools } from './tools/registry.js';
import { registerImageTools } from './tools/image.js';
import { registerVideoTools } from './tools/video.js';

export function buildServer(opts: { studioRoot: string }): McpServer {
  const server = new McpServer({ name: 'frontier-studio-mcp', version: '0.1.0' });
  registerRegistryTools(server, opts.studioRoot);
  registerImageTools(server, opts.studioRoot);
  registerVideoTools(server, opts.studioRoot);
  return server;
}

// Main entry — only runs when executed directly (npm run dev / bin).
// R-windows-main: a naive `import.meta.url === \`file://${process.argv[1]}\``
// breaks on win32; compare through pathToFileURL so vitest/tsx imports never
// double-connect the stdio transport.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cfg = loadConfig();
  const server = buildServer({ studioRoot: cfg.studioRoot });
  await server.connect(new StdioServerTransport());
}
