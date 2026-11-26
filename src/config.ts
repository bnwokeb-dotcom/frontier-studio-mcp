import { errValidation } from './errors.js';

export interface StudioConfig {
  studioRoot: string;
  geminiApiKey?: string;
  vultrApiKey?: string;
  elevenLabsApiKey?: string;
  freesoundApiKey?: string;
  syncLabsApiKey?: string;
  r2Configured: boolean;
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
  const r2Configured = Boolean(
    env.R2_ACCOUNT_ID?.trim() && env.R2_ACCESS_KEY_ID?.trim() && env.R2_SECRET_ACCESS_KEY?.trim(),
  );

  return {
    studioRoot,
    geminiApiKey: env.GEMINI_API_KEY || undefined,
    vultrApiKey: env.VULTR_INFERENCE_API_KEY || undefined,
    elevenLabsApiKey: env.ELEVENLABS_API_KEY || undefined,
    freesoundApiKey: env.FREESOUND_API_KEY || undefined,
    syncLabsApiKey: env.SYNC_API_KEY || env.SYNCLABS_API_KEY || undefined,
    r2Configured,
    studioLive: env.STUDIO_LIVE === '1',
    mcpTransport,
    port,
    host,
  };
}
