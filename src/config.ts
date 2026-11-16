import { errValidation } from './errors.js';

export interface StudioConfig {
  studioRoot: string;
  geminiApiKey?: string;
  vultrApiKey?: string;
  studioLive: boolean;
  mcpTransport: 'stdio' | 'sse';
  port: number;
  host: string;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): StudioConfig {
  const studioRoot = env.STUDIO_ROOT;
  if (!studioRoot) {
    throw errValidation('STUDIO_ROOT is not set', 'set the STUDIO_ROOT env var to your studio folder, then retry');
  }
  const transportEnv = (env.MCP_TRANSPORT || '').toLowerCase();
  const mcpTransport = transportEnv === 'sse' || transportEnv === 'http' ? 'sse' : 'stdio';
  const parsedPort = Number(env.PORT);
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3000;
  const host = env.HOST || '0.0.0.0';

  return {
    studioRoot,
    geminiApiKey: env.GEMINI_API_KEY || undefined,
    vultrApiKey: env.VULTR_INFERENCE_API_KEY || undefined,
    studioLive: env.STUDIO_LIVE === '1',
    mcpTransport,
    port,
    host,
  };
}
