import { errValidation } from './errors.js';

export interface StudioConfig {
  studioRoot: string;
  geminiApiKey?: string;
  vultrApiKey?: string;
  studioLive: boolean;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): StudioConfig {
  const studioRoot = env.STUDIO_ROOT;
  if (!studioRoot) {
    throw errValidation('STUDIO_ROOT is not set', 'set the STUDIO_ROOT env var to your studio folder, then retry');
  }
  return {
    studioRoot,
    geminiApiKey: env.GEMINI_API_KEY || undefined,
    vultrApiKey: env.VULTR_INFERENCE_API_KEY || undefined,
    studioLive: env.STUDIO_LIVE === '1',
  };
}
