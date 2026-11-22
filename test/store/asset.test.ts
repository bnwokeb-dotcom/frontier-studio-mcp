// test/store/asset.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, stat, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { studioPaths } from '../../src/store/paths.js';
import { initStudio } from '../../src/store/studio.js';
import { filmCreate } from '../../src/store/film.js';
import { assetRegister, assetRefCheck } from '../../src/store/asset.js';

let root: string; let paths: ReturnType<typeof studioPaths>;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'fsm-'));
  paths = studioPaths(root);
  await initStudio(paths);
  await filmCreate(paths, 'film_t', { title: 'T', logline: 'L' });
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe('asset registry', () => {
  it('registers a character with voice+acting, reads back descriptor', async () => {
    const r = await assetRegister(paths, 'film_t', {
      kind: 'character', assetId: 'char_mara',
      descriptor: 'MARA — late 30s, frost-pale skin, wool coat over fur, snow-crusted boots.',
      voice: 'low, careful, mountain accent; never raises her voice.',
      acting: 'paces when cornered; hands stay busy; jaw sets before she speaks.',
    });
    expect(r.assetDir).toContain('characters');
    // assetRefCheck passes for a complete character
    await expect(assetRefCheck(paths, 'film_t', { assetId: 'char_mara', role: 'character' })).resolves.toBeUndefined();
  });
  it('refuses a character without voice or acting — the completeness law', async () => {
    await expect(assetRegister(paths, 'film_t', {
      kind: 'character', assetId: 'char_incomplete', descriptor: 'A woman.',
    })).rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('registers a location with geo_block advisory file', async () => {
    await assetRegister(paths, 'film_t', {
      kind: 'location', assetId: 'loc_forest', descriptor: 'A frozen pine forest, blue hour.',
      geoBlock: '— CLEARING = center; — CABIN: frame-LEFT edge; camera always north of the treeline',
    });
    await expect(assetRefCheck(paths, 'film_t', { assetId: 'loc_forest', role: 'location' })).resolves.toBeUndefined();
  });
  it('refuses unknown asset in refs with NOT_FOUND', async () => {
    await expect(assetRefCheck(paths, 'film_t', { assetId: 'char_ghost', role: 'character' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
  it('refuses duplicate asset ids', async () => {
    await assetRegister(paths, 'film_t', { kind: 'prop', assetId: 'prop_egg', descriptor: 'A dragon egg, cracked.' });
    await expect(assetRegister(paths, 'film_t', { kind: 'prop', assetId: 'prop_egg', descriptor: 'dup' }))
      .rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('registers a character with voice_sample and voice_profile (dual-anchor)', async () => {
    const sampleFile = join(root, 'sample.wav');
    await writeFile(sampleFile, 'RIFFfakeWAVdata');
    const r = await assetRegister(paths, 'film_t', {
      kind: 'character',
      assetId: 'char_corvus',
      descriptor: 'CORVUS — scarred blacksmith, charcoal-dusted leather apron.',
      voice: 'deep weathered baritone with gravelly resonance.',
      acting: 'steady motionless stance, deliberate eye movements.',
      voiceSamplePath: sampleFile,
      voiceId: 'corvus_clone_v1',
      voiceProvider: 'elevenlabs',
    });
    const wavStat = await stat(join(r.assetDir, 'voice_sample.wav'));
    expect(wavStat.size).toBeGreaterThan(0);
    const profile = JSON.parse(await readFile(join(r.assetDir, 'voice_profile.json'), 'utf8'));
    expect(profile.voiceId).toBe('corvus_clone_v1');
    expect(profile.provider).toBe('elevenlabs');
  });
});
