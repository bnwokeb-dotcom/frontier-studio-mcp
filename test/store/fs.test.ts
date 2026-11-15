// test/store/fs.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeJsonAtomic, readJson, writeText, readText, appendLine } from '../../src/store/fs.js';
import { studioPaths } from '../../src/store/paths.js';
import { StudioError } from '../../src/errors.js';

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'fsm-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe('atomic store', () => {
  it('write-then-read JSON round-trips', async () => {
    const p = join(root, 'x', 'y.json');
    await writeJsonAtomic(p, { a: 1 });
    expect(await readJson<{ a: number }>(p)).toEqual({ a: 1 });
  });
  it('overwriting an existing file succeeds (rename-replace)', async () => {
    const p = join(root, 'f.json');
    await writeJsonAtomic(p, { v: 1 });
    await writeJsonAtomic(p, { v: 2 });
    expect(await readJson<{ v: number }>(p)).toEqual({ v: 2 });
  });
  it('readJson throws NOT_FOUND with next action for missing files', async () => {
    const p = join(root, 'nope.json');
    try {
      await readJson(p);
      expect.unreachable();
    } catch (e) {
      expect((e as StudioError).code).toBe('NOT_FOUND');
      expect((e as StudioError).nextAction).toMatch(/create it first|register/i);
    }
  });
  it('appendLine creates then appends', async () => {
    const p = join(root, 'ledger.jsonl');
    await appendLine(p, '{"n":1}');
    await appendLine(p, '{"n":2}');
    expect(await readFile(p, 'utf8')).toBe('{"n":1}\n{"n":2}\n');
  });
  it('text helpers round-trip', async () => {
    const p = join(root, 'd', 'readme.md');
    await writeText(p, '# hi');
    expect(await readText(p)).toBe('# hi');
  });
});

describe('studioPaths', () => {
  it('resolves the documented workspace layout', () => {
    const p = studioPaths('R');
    // Forward-slash expectations per plan ruling: paths.ts joins with '/' via joinPath
    // (node:path.join would emit backslashes on win32 and contradict the resolver contract).
    expect(p.studioJson).toBe('R/studio.json');
    expect(p.filmJson('f1')).toBe('R/films/f1/film.json');
    expect(p.assetDir('f1', 'characters', 'mara')).toBe('R/films/f1/assets/characters/mara');
    expect(p.shotPath('f1', 'seq01-shot01')).toBe('R/films/f1/shots/seq01-shot01.json');
    expect(p.ledgerPath('f1')).toBe('R/films/f1/ledger.jsonl');
    expect(p.jobsPath('f1')).toBe('R/films/f1/jobs.json');
  });
});
