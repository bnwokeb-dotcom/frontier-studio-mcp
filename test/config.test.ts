import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config.js';
import { StudioError } from '../src/errors.js';

describe('loadConfig', () => {
  it('loads studioRoot and flags from env', () => {
    const cfg = loadConfig({ STUDIO_ROOT: 'C:/tmp/studio', GEMINI_API_KEY: 'k1', STUDIO_LIVE: '1' });
    expect(cfg.studioRoot).toBe('C:/tmp/studio');
    expect(cfg.geminiApiKey).toBe('k1');
    expect(cfg.studioLive).toBe(true);
    expect(cfg.vultrApiKey).toBeUndefined();
  });
  it('refuses to start without STUDIO_ROOT, naming the fix', () => {
    expect(() => loadConfig({})).toThrow(StudioError);
    try {
      loadConfig({});
    } catch (e) {
      const err = e as StudioError;
      expect(err.code).toBe('VALIDATION');
      expect(err.nextAction).toMatch(/STUDIO_ROOT/);
    }
  });
});
