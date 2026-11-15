// test/store/shot.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { studioPaths } from '../../src/store/paths.js';
import { initStudio } from '../../src/store/studio.js';
import { filmCreate, patchFilmMeta } from '../../src/store/film.js';
import { assetRegister } from '../../src/store/asset.js';
import { shotCreate, shotShow, shotUpdate } from '../../src/store/shot.js';

let root: string; let paths: ReturnType<typeof studioPaths>;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'fsm-'));
  paths = studioPaths(root);
  await initStudio(paths);
  await filmCreate(paths, 'film_t', { title: 'T', logline: 'L' });
  await assetRegister(paths, 'film_t', {
    kind: 'character', assetId: 'char_mara', descriptor: 'MARA — frost-pale, wool coat.',
    voice: 'low, careful.', acting: 'paces when cornered.',
  });
  await assetRegister(paths, 'film_t', { kind: 'location', assetId: 'loc_forest', descriptor: 'Frozen pine forest, blue hour.' });
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

const goodShot = {
  id: 'seq01-shot01', sequence: 'seq01',
  geoBlock: '— CLEARING = center; — CABIN: frame-LEFT; camera north of treeline',
  refs: [ { assetId: 'char_mara', role: 'character' }, { assetId: 'loc_forest', role: 'location' } ],
  camera: { lens: '35mm', move: 'slow push-in', reason: 'closing on the choice' },
  audioBlock: { sfx: 'wind, distant ice crack', music: 'none' as const },
  durationS: 10,
};

describe('shot validation matrix', () => {
  it('accepts a fully disciplined shot and round-trips it', async () => {
    const s = await shotCreate(paths, 'film_t', goodShot);
    expect(s.status).toBe('draft');
    expect((await shotShow(paths, 'film_t', 'seq01-shot01')).camera.reason).toBe('closing on the choice');
  });
  it('refuses missing geo_block — doctrine as a validation error', async () => {
    const { geoBlock, ...without } = goodShot;
    await expect(shotCreate(paths, 'film_t', without as typeof goodShot))
      .rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('refuses empty refs', async () => {
    await expect(shotCreate(paths, 'film_t', { ...goodShot, id: 'seq01-shot02', refs: [] }))
      .rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('refuses unknown ref asset with NOT_FOUND', async () => {
    await expect(shotCreate(paths, 'film_t', { ...goodShot, id: 'seq01-shot03',
      refs: [{ assetId: 'char_ghost', role: 'character' }] })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
  it('refuses camera move without reason', async () => {
    await expect(shotCreate(paths, 'film_t', { ...goodShot, id: 'seq01-shot04',
      camera: { lens: '35mm', move: 'push-in', reason: '' } })).rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('refuses duration >30s (single-take ceiling; chain via extend)', async () => {
    await expect(shotCreate(paths, 'film_t', { ...goodShot, id: 'seq01-shot05', durationS: 45 }))
      .rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('refuses a duplicate shot id', async () => {
    await shotCreate(paths, 'film_t', goodShot);
    await expect(shotCreate(paths, 'film_t', goodShot)).rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('enforces the sequence geo lock verbatim', async () => {
    await patchFilmMeta(paths, 'film_t', (m) => ({ ...m, sequences: { seq01: { geoLocked: 'LOCKED-GEO-TEXT' } } }));
    await expect(shotCreate(paths, 'film_t', goodShot)).rejects.toMatchObject({ code: 'VALIDATION' });
    const s = await shotCreate(paths, 'film_t', { ...goodShot, geoBlock: 'LOCKED-GEO-TEXT' });
    expect(s.geoBlock).toBe('LOCKED-GEO-TEXT');
  });
  it('shot_update re-validates patches', async () => {
    await shotCreate(paths, 'film_t', goodShot);
    await expect(shotUpdate(paths, 'film_t', 'seq01-shot01', { camera: { lens: '35mm', move: 'whip', reason: '' } }))
      .rejects.toMatchObject({ code: 'VALIDATION' });
    const s = await shotUpdate(paths, 'film_t', 'seq01-shot01', { durationS: 15 });
    expect(s.durationS).toBe(15);
  });
  it('shot_update refuses breaking a locked sequence geo', async () => {
    await shotCreate(paths, 'film_t', goodShot);
    await patchFilmMeta(paths, 'film_t', (m) => ({ ...m, sequences: { seq01: { geoLocked: 'LOCK-A' } } }));
    await expect(shotUpdate(paths, 'film_t', 'seq01-shot01', { geoBlock: 'OTHER' }))
      .rejects.toMatchObject({ code: 'VALIDATION', message: expect.stringMatching(/locked geo block/) });
    const s = await shotUpdate(paths, 'film_t', 'seq01-shot01', { geoBlock: 'LOCK-A' });
    expect(s.geoBlock).toBe('LOCK-A');
  });
  it('shot_update refuses renaming a shot', async () => {
    await shotCreate(paths, 'film_t', goodShot);
    await expect(shotUpdate(paths, 'film_t', 'seq01-shot01', { id: 'seq01-shot09' }))
      .rejects.toMatchObject({ code: 'VALIDATION', message: expect.stringMatching(/immutable/) });
    expect((await shotShow(paths, 'film_t', 'seq01-shot01')).id).toBe('seq01-shot01');
  });
  it('refuses an unlawful sequence id on create and update (ID law)', async () => {
    await expect(shotCreate(paths, 'film_t', { ...goodShot, sequence: '../../x' }))
      .rejects.toMatchObject({ code: 'VALIDATION', message: expect.stringMatching(/invalid sequence id/) });
    await shotCreate(paths, 'film_t', goodShot);
    await expect(shotUpdate(paths, 'film_t', 'seq01-shot01', { sequence: '../../x' }))
      .rejects.toMatchObject({ code: 'VALIDATION', message: expect.stringMatching(/invalid sequence id/) });
    expect((await shotShow(paths, 'film_t', 'seq01-shot01')).sequence).toBe('seq01'); // not persisted
  });
  it('refuses a status outside the whitelist; a lawful status persists', async () => {
    await shotCreate(paths, 'film_t', goodShot);
    await expect(shotUpdate(paths, 'film_t', 'seq01-shot01', { status: 'banana' as unknown as 'draft' }))
      .rejects.toMatchObject({ code: 'VALIDATION', message: expect.stringMatching(/invalid status "banana"/) });
    const s = await shotUpdate(paths, 'film_t', 'seq01-shot01', { status: 'kept' });
    expect(s.status).toBe('kept');
    expect((await shotShow(paths, 'film_t', 'seq01-shot01')).status).toBe('kept');
  });
});
