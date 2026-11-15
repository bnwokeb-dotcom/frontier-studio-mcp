// test/store/sequence.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { studioPaths } from '../../src/store/paths.js';
import { initStudio } from '../../src/store/studio.js';
import { filmCreate } from '../../src/store/film.js';
import { sequenceLockGeo, sequenceGeo } from '../../src/store/sequence.js';

let root: string; let paths: ReturnType<typeof studioPaths>;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'fsm-'));
  paths = studioPaths(root);
  await initStudio(paths);
  await filmCreate(paths, 'film_t', { title: 'T', logline: 'L' });
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe('sequence geo lock', () => {
  it('locks once; identical re-lock passes; different text refuses', async () => {
    await sequenceLockGeo(paths, 'film_t', 'seq01', 'GEO-A');
    expect(await sequenceGeo(paths, 'film_t', 'seq01')).toBe('GEO-A');
    await sequenceLockGeo(paths, 'film_t', 'seq01', 'GEO-A'); // idempotent
    await expect(sequenceLockGeo(paths, 'film_t', 'seq01', 'GEO-B'))
      .rejects.toMatchObject({ code: 'VALIDATION' });
  });
});
