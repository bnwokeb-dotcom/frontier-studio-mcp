// src/server.ts — Frontier Studio MCP server over stdio or SSE/HTTP transport.
import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { registerRegistryTools } from './tools/registry.js';
import { registerImageTools } from './tools/image.js';
import { registerVideoTools } from './tools/video.js';
import { registerAudioTools } from './tools/audio.js';
import { registerStagingTools } from './tools/staging.js';
import { registerStoryboardTools } from './tools/storyboard.js';
import { registerEditorTools } from './tools/editor.js';
import { registerFilmmakerPrompts } from './prompts/filmmaker.js';
import { startHttpServer } from './http.js';

export function buildServer(opts: { studioRoot: string }): McpServer {
  const server = new McpServer({ name: 'frontier-studio-mcp', version: '0.1.0' });
  registerRegistryTools(server, opts.studioRoot);
  registerImageTools(server, opts.studioRoot);
  registerVideoTools(server, opts.studioRoot);
  registerAudioTools(server, opts.studioRoot);
  registerStagingTools(server, opts.studioRoot);
  registerStoryboardTools(server, opts.studioRoot);
  registerEditorTools(server, opts.studioRoot);
  registerFilmmakerPrompts(server);
  return server;
}

// Main entry — only runs when executed directly (npm run dev / bin / docker).
// R-windows-main: a naive `import.meta.url === \`file://${process.argv[1]}\``
// breaks on win32; compare through pathToFileURL so vitest/tsx imports never
// double-connect the stdio transport.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cfg = loadConfig();
  if (cfg.mcpTransport === 'sse') {
    const http = await startHttpServer({
      studioRoot: cfg.studioRoot,
      port: cfg.port,
      host: cfg.host,
    });
    console.log(
      `[frontier-studio-mcp] Remote SSE server running on http://${http.host}:${http.port} (SSE: /sse, Artifacts: /artifacts)`,
    );
  } else {
    const server = buildServer({ studioRoot: cfg.studioRoot });
    await server.connect(new StdioServerTransport());
  }
}
