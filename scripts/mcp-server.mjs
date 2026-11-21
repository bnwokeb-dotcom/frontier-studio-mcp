import { startHttpServer } from '../dist/http.js';
import { loadConfig } from '../dist/config.js';

const cfg = loadConfig(process.env);
const server = await startHttpServer({
  studioRoot: cfg.studioRoot,
  port: cfg.port || 3000,
  host: cfg.host || '0.0.0.0',
});

console.log(`[vidux-mcp] Remote SSE server running on http://${server.host}:${server.port} (SSE: /sse, Artifacts: /artifacts)`);
