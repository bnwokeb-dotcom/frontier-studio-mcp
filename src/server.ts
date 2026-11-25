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
import { registerFlowPromptTools } from './tools/flow_prompts.js';
import { registerFilmmakerPrompts } from './prompts/filmmaker.js';
import { startHttpServer } from './http.js';
import { WebBridgeServer, getSharedBridgeQueue } from './bridge/web_bridge_server.js';

export function buildServer(opts: { studioRoot: string }): McpServer {
  const server = new McpServer({ name: 'frontier-studio-mcp', version: '0.1.0' });
  registerRegistryTools(server, opts.studioRoot);
  registerImageTools(server, opts.studioRoot);
  registerVideoTools(server, opts.studioRoot);
  registerAudioTools(server, opts.studioRoot);
  registerStagingTools(server, opts.studioRoot);
  registerStoryboardTools(server, opts.studioRoot);
  registerEditorTools(server, opts.studioRoot);
  registerFlowPromptTools(server, opts.studioRoot);
  registerFilmmakerPrompts(server);
  return server;
}

export function parseBridgePort(rawPort: string | undefined): number | null {
  if (rawPort === undefined || rawPort.trim() === '') return 8081;
  const trimmed = rawPort.trim().toLowerCase();
  if (trimmed === 'off' || trimmed === 'disabled' || trimmed === 'none' || trimmed === 'false') {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    return 8081;
  }
  return parsed;
}

export interface StdioShutdownOptions {
  server: Pick<McpServer, 'close'> & { server: { onclose?: () => void } };
  bridge: Pick<WebBridgeServer, 'stop'>;
  bridgeStart?: Promise<unknown>;
  stdin?: NodeJS.EventEmitter;
  proc?: Pick<NodeJS.Process, 'once' | 'off' | 'exit'>;
  onExitSignal?: (code: number) => void;
}

/**
 * Attaches idempotent cleanup so closing stdio (stdin end/close, transport close, or SIGINT/SIGTERM)
 * stops the auxiliary Chrome Bridge HTTP server and MCP server cleanly instead of leaving port 8081 orphaned.
 */
export function attachStdioShutdown(opts: StdioShutdownOptions): () => Promise<void> {
  let shutdownPromise: Promise<void> | null = null;
  const stdin = opts.stdin ?? process.stdin;
  const proc = opts.proc ?? process;
  const exitFn = opts.onExitSignal ?? ((code: number) => proc.exit(code));

  const onStreamDone = () => {
    void shutdown();
  };
  const onSignal = () => {
    void shutdown().finally(() => {
      exitFn(0);
    });
  };

  const shutdown = (): Promise<void> => {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      stdin.off?.('end', onStreamDone);
      stdin.off?.('close', onStreamDone);
      proc.off?.('SIGINT', onSignal);
      proc.off?.('SIGTERM', onSignal);
      if (opts.bridgeStart) {
        await opts.bridgeStart.catch(() => {});
      }
      await Promise.allSettled([opts.bridge.stop(), opts.server.close()]);
    })();
    return shutdownPromise;
  };

  const prevOnClose = opts.server.server.onclose;
  opts.server.server.onclose = () => {
    prevOnClose?.();
    void shutdown();
  };

  stdin.once('end', onStreamDone);
  stdin.once('close', onStreamDone);
  proc.once('SIGINT', onSignal);
  proc.once('SIGTERM', onSignal);

  return shutdown;
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
      `[frontier-studio-mcp] Remote SSE server running on http://${http.host}:${http.port} (SSE: /sse, Artifacts: /artifacts, Bridge: /bridge/status)`,
    );
  } else {
    const bridgePort = parseBridgePort(process.env.BRIDGE_PORT);
    const bridge = new WebBridgeServer({
      studioRoot: cfg.studioRoot,
      port: bridgePort ?? 8081,
      host: '127.0.0.1',
      queue: getSharedBridgeQueue(cfg.studioRoot),
    });
    const bridgeStart =
      bridgePort === null
        ? Promise.resolve(null)
        : bridge
            .start()
            .then((addr) => {
              console.error(`[frontier-studio-mcp] Chrome Bridge HTTP listening on http://${addr.host}:${addr.port}/bridge/status`);
              return addr;
            })
            .catch((err) => {
              const code = (err as NodeJS.ErrnoException).code;
              if (code === 'EADDRINUSE') {
                console.error(
                  `[frontier-studio-mcp] Chrome Bridge port ${bridgePort} already in use (EADDRINUSE); continuing stdio MCP without local bridge listener.`,
                );
              } else {
                console.error(`[frontier-studio-mcp] Chrome Bridge HTTP unavailable on port ${bridgePort}: ${(err as Error).message}`);
              }
              return null;
            });
    const server = buildServer({ studioRoot: cfg.studioRoot });
    attachStdioShutdown({ server, bridge, bridgeStart });
    await server.connect(new StdioServerTransport());
  }
}
