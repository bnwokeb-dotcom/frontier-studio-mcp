// test/tools/image.test.ts — image_generate: billed, budgeted, ledgered.
// Fixture-injected: GeminiLane's FetchLike defaults to the global fetch, so the
// tests stub global fetch with the recorded fixture body (no network, no creds).
// Billed happy paths run with STUDIO_LIVE=1 (stubbed below); the gate describe
// pins the registry-only refusal when the switch is off.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, rm, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../../src/server.js';
import type { FetchLike } from '../../src/lanes/types.js';

// Recorded fixture: JSON body only — fake base64 'aGVsbG8=' ('hello'), no real images, no credentials, no network.
const successBody = readFileSync(
  new URL('../fixtures/gemini/success-output-image.json', import.meta.url),
  'utf8',
);

interface RecordedCall {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

let root: string;
let client: Client;
let server: Awaited<ReturnType<typeof buildServer>>;
let calls: RecordedCall[];

const fetchOk: FetchLike = async (url, init) => {
  calls.push({ url, method: init?.method, headers: init?.headers, body: init?.body });
  return { ok: true, status: 200, text: async () => successBody };
};
const fetchNever: FetchLike = () => {
  throw new Error('network touched — refusal must precede any API call');
};

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'fsm-image-'));
  calls = [];
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
  vi.stubEnv('STUDIO_LIVE', '1'); // billed happy paths are live; gate tests re-stub to '0'/'' 
  vi.stubGlobal('fetch', fetchOk);
  server = buildServer({ studioRoot: root });
  // R-client-order: construct the client BEFORE connecting either end.
  client = new Client({ name: 'test', version: '0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
});
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await Promise.all([client.close(), server.close()]);
  await rm(root, { recursive: true, force: true });
});

function rpc(name: string, args: Record<string, unknown>) {
  return client.callTool({ name, arguments: args });
}
const isError = (res: unknown) => (res as { isError?: boolean }).isError === true;

function recordOf(res: unknown): Record<string, unknown> {
  const text = (res as { content: { text: string }[] }).content[0].text;
  return JSON.parse(text) as Record<string, unknown>;
}

async function filmJson(filmId: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(join(root, 'films', filmId, 'film.json'), 'utf8')) as Record<string, unknown>;
}

async function ledgerLines(filmId: string): Promise<Record<string, unknown>[]> {
  const raw = await readFile(join(root, 'films', filmId, 'ledger.jsonl'), 'utf8');
  return raw.trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>);
}

async function seedFilm(filmId = 'film_x', budgetUsd?: number) {
  await rpc('film_create', {
    film_id: filmId, title: 'X', logline: 'Y',
    ...(budgetUsd !== undefined ? { budget_usd: budgetUsd } : {}),
  });
  await rpc('film_set_active', { film_id: filmId });
}

describe('image_generate happy path (fixture fetch)', () => {
  it('generates, writes the artifact bytes, ledgers one line, accrues spentUsd', async () => {
    await seedFilm('film_x', 1);
    await mkdir(join(root, 'films', 'film_x', 'refs'), { recursive: true });
    await writeFile(join(root, 'films', 'film_x', 'refs', 'hero.png'), 'refbytes');

    const res = await rpc('image_generate', {
      prompt: 'A lone lighthouse at dusk, 35mm',
      ref_image_paths: ['refs/hero.png'], // film-relative, resolves under the film dir
    });
    expect(isError(res)).toBe(false);

    const o = recordOf(res);
    expect(Object.keys(o).sort()).toEqual([
      'artifact_path', 'aspect_ratio', 'cost_usd', 'image_size', 'interaction_id',
    ]);
    expect(o.interaction_id).toBe('int-fixture-output-image');
    expect(o.cost_usd).toBe(0.134);
    expect(o.image_size).toBe('1K'); // default
    expect(o.aspect_ratio).toBe('16:9'); // default

    // artifact exists on disk with the fixture base64 decoded: 'aGVsbG8=' → 104 101 108 108 111
    // name law: <YYYYMMDD-HHmmss>-<hex4>-<slug>.png — the 4 hex chars break same-second collisions
    expect(String(o.artifact_path)).toMatch(/films\/film_x\/generated\/\d{8}-\d{6}-[0-9a-f]{4}-a-lone-lighthouse-at-dusk-35mm\.png$/);
    const bytes = await readFile(String(o.artifact_path));
    expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111]);

    // exactly one API call; the ref rides along with its extension-inferred mime
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://generativelanguage.googleapis.com/v1beta/interactions');
    const body = JSON.parse(calls[0].body as string);
    expect(body.input[1]).toEqual({
      type: 'image',
      mime_type: 'image/png',
      data: Buffer.from('refbytes').toString('base64'),
    });

    // ledger line count 1, full shape
    const lines = await ledgerLines('film_x');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual({
      ts: expect.any(String),
      tool: 'image_generate',
      lane: 'gemini',
      film_id: 'film_x',
      cost_usd: 0.134,
      verdict: 'pending',
      interaction_id: 'int-fixture-output-image',
      artifact_path: String(o.artifact_path),
    });

    // spend accrued on the film
    expect((await filmJson('film_x')).spentUsd).toBeCloseTo(0.134, 12);
  });

  it('resolves studio-root-relative refs and infers .jpg → image/jpeg', async () => {
    await seedFilm('film_x', 1);
    await mkdir(join(root, 'refs'), { recursive: true });
    await writeFile(join(root, 'refs', 'hero.jpg'), 'jpgbytes');

    const res = await rpc('image_generate', { prompt: 'x', ref_image_paths: ['refs/hero.jpg'] });
    expect(isError(res)).toBe(false);
    const body = JSON.parse(calls[0].body as string);
    expect(body.input[1]).toEqual({
      type: 'image',
      mime_type: 'image/jpeg',
      data: Buffer.from('jpgbytes').toString('base64'),
    });
  });

  it('two rapid same-slug takes → two distinct living files, two ledger lines (hex4 breaks the second-resolution tie)', async () => {
    await seedFilm('film_x', 1); // two takes = 0.268 < 1
    const prompt = 'A lone lighthouse at dusk, 35mm';

    const r1 = await rpc('image_generate', { prompt });
    const r2 = await rpc('image_generate', { prompt });
    expect(isError(r1)).toBe(false);
    expect(isError(r2)).toBe(false);

    const a1 = String(recordOf(r1).artifact_path);
    const a2 = String(recordOf(r2).artifact_path);
    expect(a1).toMatch(/generated\/\d{8}-\d{6}-[0-9a-f]{4}-a-lone-lighthouse-at-dusk-35mm\.png$/);
    expect(a2).toMatch(/generated\/\d{8}-\d{6}-[0-9a-f]{4}-a-lone-lighthouse-at-dusk-35mm\.png$/);
    expect(a1).not.toBe(a2); // no silent overwrite, even inside the same second

    // each ledger line points at its own artifact, and both files hold their own bytes
    const lines = await ledgerLines('film_x');
    expect(lines).toHaveLength(2);
    expect(lines[0].artifact_path).toBe(a1);
    expect(lines[1].artifact_path).toBe(a2);
    expect(Array.from(await readFile(a1))).toEqual([104, 101, 108, 108, 111]);
    expect(Array.from(await readFile(a2))).toEqual([104, 101, 108, 108, 111]);
  });
});

describe('image_generate refusals (each precedes any API call where billed)', () => {
  it('no GEMINI_API_KEY → AUTH, and nothing is fetched, written or ledged', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x', 1);

    const res = await rpc('image_generate', { prompt: 'x' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/GEMINI_API_KEY is not set/);
    expect(JSON.stringify(res)).toMatch(/NEXT: /);
    expect(calls).toHaveLength(0);
    await expect(readFile(join(root, 'films', 'film_x', 'ledger.jsonl'), 'utf8'))
      .rejects.toMatchObject({ code: 'ENOENT' });
    expect((await filmJson('film_x')).spentUsd).toBeUndefined();
  });

  it('film without a budget → BUDGET refusal', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_nobudget'); // no budget_usd

    const res = await rpc('image_generate', { prompt: 'x' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/no budget set on film \\?"film_nobudget\\?"/); // \" escaped inside the stringified result
    expect(calls).toHaveLength(0);
  });

  it('over-budget → BUDGET before any fetch (fake fetch throws if called)', async () => {
    await seedFilm('film_capped', 0.25);
    // first generation succeeds and accrues 0.134
    const first = await rpc('image_generate', { prompt: 'x' });
    expect(isError(first)).toBe(false);
    expect(calls).toHaveLength(1);

    // second one is refused: 0.134 spent + 0.134 quote > 0.25 cap — fetch must never fire
    vi.stubGlobal('fetch', fetchNever);
    const res = await rpc('image_generate', { prompt: 'x again' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/budget exceeded: 0\.134 spent \+ 0\.134 quote > 0\.25 cap/);
    expect(calls).toHaveLength(1); // only the first call's fetch
    expect((await ledgerLines('film_capped'))).toHaveLength(1); // no ledger line for the refusal
    expect((await filmJson('film_capped')).spentUsd).toBeCloseTo(0.134, 12); // spend unchanged
  });

  it('15 refs → VALIDATION naming the max', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x', 1);

    const res = await rpc('image_generate', {
      prompt: 'x',
      ref_image_paths: Array.from({ length: 15 }, (_, i) => `refs/r${i}.png`),
    });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/too many ref_image_paths: 15 \(max 14\)/);
    expect(calls).toHaveLength(0);
  });

  it('missing ref file → NOT_FOUND (absolute path resolved as-is)', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x', 1);

    const res = await rpc('image_generate', {
      prompt: 'x',
      ref_image_paths: [join(root, 'films', 'film_x', 'refs', 'ghost.png')],
    });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/reference image not found/);
    expect(calls).toHaveLength(0);
  });

  it('empty prompt → VALIDATION "prompt is required"', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x', 1);

    const res = await rpc('image_generate', { prompt: '   ' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/prompt is required/);
    expect(calls).toHaveLength(0);
  });

  it('empty previous_interaction_id → VALIDATION (must be a non-empty string)', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x', 1);

    const res = await rpc('image_generate', { prompt: 'x', previous_interaction_id: '' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/previous_interaction_id must be a non-empty string/);
    expect(calls).toHaveLength(0);
  });

  it('unknown ref extension → VALIDATION naming the supported set', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x', 1);
    await mkdir(join(root, 'films', 'film_x', 'refs'), { recursive: true });
    await writeFile(join(root, 'films', 'film_x', 'refs', 'hero.tiff'), 'tiffbytes');

    const res = await rpc('image_generate', { prompt: 'x', ref_image_paths: ['refs/hero.tiff'] });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/unsupported reference image type \\?"\.tiff\\?"/); // \" escaped inside the stringified result
    expect(JSON.stringify(res)).toMatch(/\.png, \.jpg, \.jpeg or \.webp/);
    expect(calls).toHaveLength(0);
  });
});

// --- STUDIO_LIVE gate: the switch is live, not decorative ---------------------

describe('STUDIO_LIVE gate (README row: 1 = real lanes, 0 = registry only)', () => {
  it('STUDIO_LIVE=0 → image_generate refuses before any fetch; nothing written or ledged; asset_image stays free', async () => {
    vi.stubEnv('STUDIO_LIVE', '0');
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x', 1);

    const res = await rpc('image_generate', { prompt: 'x' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/real generation lanes are disabled \(STUDIO_LIVE=0\)/);
    expect(JSON.stringify(res)).toMatch(/set STUDIO_LIVE=1 to enable billed calls/);
    expect(calls).toHaveLength(0);
    await expect(readFile(join(root, 'films', 'film_x', 'ledger.jsonl'), 'utf8'))
      .rejects.toMatchObject({ code: 'ENOENT' });
    expect((await filmJson('film_x')).spentUsd).toBeUndefined();

    // the free tool is unaffected by the gate
    await rpc('asset_register', { kind: 'character', asset_id: 'mara', descriptor: DESCRIPTOR, voice: 'low', acting: 'still' });
    await mkdir(join(root, 'films', 'film_x', 'refs'), { recursive: true });
    await writeFile(join(root, 'films', 'film_x', 'refs', 'hand-drawn.png'), 'sheetbytes');
    const free = await rpc('asset_image', { asset_id: 'mara', image_path: 'refs/hand-drawn.png' });
    expect(isError(free)).toBe(false);
    expect(String(recordOf(free).asset_path)).toMatch(/sheet\.png$/);
  });

  it('STUDIO_LIVE absent → same refusal (config default is registry-only)', async () => {
    vi.stubEnv('STUDIO_LIVE', '');
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x', 1);

    const res = await rpc('image_generate', { prompt: 'x' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/real generation lanes are disabled \(STUDIO_LIVE=0\)/);
    expect(calls).toHaveLength(0);
  });

  it('STUDIO_LIVE=1 → the billed happy path proceeds (fixture fetch)', async () => {
    vi.stubEnv('STUDIO_LIVE', '1');
    await seedFilm('film_x', 1);

    const res = await rpc('image_generate', { prompt: 'x' });
    expect(isError(res)).toBe(false);
    expect(calls).toHaveLength(1);
    expect(await ledgerLines('film_x')).toHaveLength(1);
  });
});

// --- Task 4: character_sheet_build + asset_image ------------------------------

const DESCRIPTOR = 'A weathered trawler captain, mid-50s, salt-grey beard, patched oilskin coat';

async function seedCharacter(filmId = 'film_x', assetId = 'mara', budgetUsd?: number) {
  await seedFilm(filmId, budgetUsd ?? 1);
  await rpc('asset_register', {
    kind: 'character', asset_id: assetId, descriptor: DESCRIPTOR,
    voice: 'low, gravel, unhurried coastal drawl',
    acting: 'still until spoken to; moves in short decisive bursts',
  });
}

describe('character_sheet_build (fixture fetch)', () => {
  it('composes the sheet law, attaches sheet.png, seeds interaction.md, ledgers, accrues spend', async () => {
    await seedCharacter();

    const res = await rpc('character_sheet_build', { asset_id: 'mara' });
    expect(isError(res)).toBe(false);

    const o = recordOf(res);
    expect(Object.keys(o).sort()).toEqual(['cost_usd', 'interaction_id', 'sheet_path']);
    expect(o.interaction_id).toBe('int-fixture-output-image');
    expect(o.cost_usd).toBe(0.134);
    expect(String(o.sheet_path)).toMatch(/films\/film_x\/assets\/characters\/mara\/sheet\.png$/);

    // sheet.png holds the fixture image bytes ('aGVsbG8=' decoded)
    expect(Array.from(await readFile(String(o.sheet_path)))).toEqual([104, 101, 108, 108, 111]);

    // interaction.md contains ONLY the interaction id — byte-exact, no newline
    expect(await readFile(join(root, 'films', 'film_x', 'assets', 'characters', 'mara', 'interaction.md'), 'utf8'))
      .toBe('int-fixture-output-image');

    // exactly one API call, carrying the sheet law at the 1K/16:9 defaults
    expect(calls).toHaveLength(1);
    const body = JSON.parse(calls[0].body as string);
    expect(body.input).toHaveLength(1); // no ref images
    expect(body.input[0].type).toBe('text');
    expect(body.input[0].text).toContain(DESCRIPTOR);
    expect(body.input[0].text).toContain('HEADLESS');
    expect(body.input[0].text).toContain('#e8e8e8');
    expect(body.response_format).toEqual({
      type: 'image', mime_type: 'image/png', aspect_ratio: '16:9', image_size: '1K',
    });

    // the staging copy is gone after the attach — the asset dir keeps the only bytes
    expect(await readdir(join(root, 'films', 'film_x', 'generated'))).toEqual([]);

    // one ledger line, Task 3 shape, artifact = the attached sheet
    const lines = await ledgerLines('film_x');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual({
      ts: expect.any(String),
      tool: 'character_sheet_build',
      lane: 'gemini',
      film_id: 'film_x',
      cost_usd: 0.134,
      verdict: 'pending',
      interaction_id: 'int-fixture-output-image',
      artifact_path: String(o.sheet_path),
    });

    // spend accrued on the film
    expect((await filmJson('film_x')).spentUsd).toBeCloseTo(0.134, 12);
  });
});

describe('character_sheet_build refusals (each precedes any API call)', () => {
  it('unknown asset → NOT_FOUND before any fetch', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x', 1);

    const res = await rpc('character_sheet_build', { asset_id: 'ghost' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/asset \\?"ghost\\?" is not registered/); // \" escaped inside the stringified result
    expect(calls).toHaveLength(0);
    expect((await filmJson('film_x')).spentUsd).toBeUndefined();
  });

  it('location asset → NOT_FOUND naming its kind (explicit kind probe, not a blind characters-path hit)', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x', 1);
    await rpc('asset_register', { kind: 'location', asset_id: 'docks', descriptor: 'Rain-slicked fishing docks, diesel and brine' });

    const res = await rpc('character_sheet_build', { asset_id: 'docks' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/is a locations asset/);
    expect(calls).toHaveLength(0);
  });

  it('whitespace-only asset_id → VALIDATION', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x', 1);

    const res = await rpc('character_sheet_build', { asset_id: '  ' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/asset_id is required/);
    expect(calls).toHaveLength(0);
  });

  it('over-budget → BUDGET before any fetch', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x', 0.1);
    await rpc('asset_register', { kind: 'character', asset_id: 'mara', descriptor: DESCRIPTOR, voice: 'low', acting: 'still' });

    const res = await rpc('character_sheet_build', { asset_id: 'mara' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/budget exceeded: 0 spent \+ 0\.134 quote > 0\.1 cap/);
    expect(calls).toHaveLength(0);
    expect((await filmJson('film_x')).spentUsd).toBeUndefined();
  });
});

describe('asset_image (free tool: no lane, no budget, no ledger)', () => {
  it('copies bytes identically into the character dir as sheet.png', async () => {
    vi.stubGlobal('fetch', fetchNever); // free: must never touch the network
    await seedFilm('film_free'); // deliberately NO budget — free tools never see ensureBudget
    await rpc('asset_register', { kind: 'character', asset_id: 'mara', descriptor: DESCRIPTOR, voice: 'low', acting: 'still' });
    await mkdir(join(root, 'films', 'film_free', 'refs'), { recursive: true });
    await writeFile(join(root, 'films', 'film_free', 'refs', 'hand-drawn.png'), 'sheetbytes');

    const res = await rpc('asset_image', { asset_id: 'mara', image_path: 'refs/hand-drawn.png' });
    expect(isError(res)).toBe(false);
    const o = recordOf(res);
    expect(Object.keys(o).sort()).toEqual(['asset_path']);
    expect(String(o.asset_path)).toMatch(/films\/film_free\/assets\/characters\/mara\/sheet\.png$/);
    expect(await readFile(String(o.asset_path), 'utf8')).toBe('sheetbytes');
    // copy, not move — the source file stays
    expect(await readFile(join(root, 'films', 'film_free', 'refs', 'hand-drawn.png'), 'utf8')).toBe('sheetbytes');
    // free: no ledger line is ever written
    await expect(readFile(join(root, 'films', 'film_free', 'ledger.jsonl'), 'utf8'))
      .rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('defaults the name to plate.png for locations', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x');
    await rpc('asset_register', { kind: 'location', asset_id: 'docks', descriptor: 'Rain-slicked fishing docks' });
    await mkdir(join(root, 'films', 'film_x', 'refs'), { recursive: true });
    await writeFile(join(root, 'films', 'film_x', 'refs', 'docks.png'), 'platebytes');

    const res = await rpc('asset_image', { asset_id: 'docks', image_path: 'refs/docks.png' });
    expect(isError(res)).toBe(false);
    expect(String(recordOf(res).asset_path)).toMatch(/assets\/locations\/docks\/plate\.png$/);
    expect(await readFile(join(root, 'films', 'film_x', 'assets', 'locations', 'docks', 'plate.png'), 'utf8')).toBe('platebytes');
  });

  it('defaults the name to plate.png for styles too (extended name law)', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x');
    await rpc('asset_register', { kind: 'style', asset_id: 'noir', descriptor: 'High-contrast 1940s studio noir, hard key, deep blacks' });
    await mkdir(join(root, 'films', 'film_x', 'refs'), { recursive: true });
    await writeFile(join(root, 'films', 'film_x', 'refs', 'grade.png'), 'stylebytes');

    const res = await rpc('asset_image', { asset_id: 'noir', image_path: 'refs/grade.png' });
    expect(isError(res)).toBe(false);
    expect(String(recordOf(res).asset_path)).toMatch(/assets\/styles\/noir\/plate\.png$/);
    expect(await readFile(join(root, 'films', 'film_x', 'assets', 'styles', 'noir', 'plate.png'), 'utf8')).toBe('stylebytes');
  });

  it('prop asset → VALIDATION naming the styles-aware canonical-image doctrine', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x');
    await rpc('asset_register', { kind: 'prop', asset_id: 'lantern', descriptor: 'Brass ship lantern, soot-blackened glass' });
    await mkdir(join(root, 'films', 'film_x', 'refs'), { recursive: true });
    await writeFile(join(root, 'films', 'film_x', 'refs', 'l.png'), 'bytes');

    const res = await rpc('asset_image', { asset_id: 'lantern', image_path: 'refs/l.png' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/props assets have no canonical image \(sheet\.png is characters · plate\.png is locations and styles\)/);
    expect(JSON.stringify(res)).toMatch(/register the asset as a character, location, or style to carry a canonical image/);
  });

  it('sheet.png on a location asset → VALIDATION; NEXT names the canonical-image law', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x');
    await rpc('asset_register', { kind: 'location', asset_id: 'docks', descriptor: 'Rain-slicked fishing docks' });
    await mkdir(join(root, 'films', 'film_x', 'refs'), { recursive: true });
    await writeFile(join(root, 'films', 'film_x', 'refs', 'd.png'), 'bytes');

    const res = await rpc('asset_image', { asset_id: 'docks', image_path: 'refs/d.png', name: 'sheet.png' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/canonical images: sheet\.png for characters · plate\.png for locations and styles/);
  });

  it('unknown asset → NOT_FOUND', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x');

    const res = await rpc('asset_image', { asset_id: 'ghost', image_path: 'refs/x.png' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/asset \\?"ghost\\?" is not registered/); // \" escaped inside the stringified result
  });

  it('missing image file → NOT_FOUND', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x');
    await rpc('asset_register', { kind: 'character', asset_id: 'mara', descriptor: DESCRIPTOR, voice: 'low', acting: 'still' });

    const res = await rpc('asset_image', { asset_id: 'mara', image_path: 'refs/ghost.png' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/image not found: refs\/ghost\.png/);
  });

  it('name outside sheet.png/plate.png → VALIDATION naming the rule', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x');
    await rpc('asset_register', { kind: 'character', asset_id: 'mara', descriptor: DESCRIPTOR, voice: 'low', acting: 'still' });
    await mkdir(join(root, 'films', 'film_x', 'refs'), { recursive: true });
    await writeFile(join(root, 'films', 'film_x', 'refs', 'face.png'), 'bytes');

    const res = await rpc('asset_image', { asset_id: 'mara', image_path: 'refs/face.png', name: 'face.png' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/asset images are sheet\.png or plate\.png/);
  });

  it('name/kind mismatch → VALIDATION naming the rule', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x');
    await rpc('asset_register', { kind: 'character', asset_id: 'mara', descriptor: DESCRIPTOR, voice: 'low', acting: 'still' });
    await mkdir(join(root, 'films', 'film_x', 'refs'), { recursive: true });
    await writeFile(join(root, 'films', 'film_x', 'refs', 'plate.png'), 'bytes');

    const res = await rpc('asset_image', { asset_id: 'mara', image_path: 'refs/plate.png', name: 'plate.png' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/plate\.png is a locations or styles image/); // Task 5 ruling: plate.png ↔ locations OR styles
  });
});

// --- Task 5: keyframe_build (the light law) -----------------------------------

const LOCATION_DESCRIPTOR = 'A rain-slicked fishing dock at low tide, diesel sheen on black water';
const LIGHT_STATEMENT = 'single sodium flood on a pole behind camera left, amber, hard';
const GEO_BLOCK = 'dock runs east-west; winch house at the west end; the tide gate is the only way onto the water';

async function seedLocation(
  filmId = 'film_x',
  assetId = 'docks',
  opts?: { budgetUsd?: number; geoBlock?: string },
) {
  await seedFilm(filmId, opts?.budgetUsd ?? 1);
  await rpc('asset_register', {
    kind: 'location', asset_id: assetId, descriptor: LOCATION_DESCRIPTOR,
    ...(opts?.geoBlock !== undefined ? { geo_block: opts.geoBlock } : {}),
  });
}

describe('keyframe_build (fixture fetch)', () => {
  it('composes the light law with the geo block, attaches plate.png, seeds interaction.md, ledgers, accrues spend', async () => {
    await seedLocation('film_x', 'docks', { geoBlock: GEO_BLOCK });

    const res = await rpc('keyframe_build', { asset_id: 'docks', light_statement: LIGHT_STATEMENT });
    expect(isError(res)).toBe(false);

    const o = recordOf(res);
    expect(Object.keys(o).sort()).toEqual(['cost_usd', 'interaction_id', 'plate_path']);
    expect(o.interaction_id).toBe('int-fixture-output-image');
    expect(o.cost_usd).toBe(0.134);
    expect(String(o.plate_path)).toMatch(/films\/film_x\/assets\/locations\/docks\/plate\.png$/);

    // plate.png holds the fixture image bytes ('aGVsbG8=' decoded)
    expect(Array.from(await readFile(String(o.plate_path)))).toEqual([104, 101, 108, 108, 111]);

    // interaction.md contains ONLY the interaction id — byte-exact, no newline
    expect(await readFile(join(root, 'films', 'film_x', 'assets', 'locations', 'docks', 'interaction.md'), 'utf8'))
      .toBe('int-fixture-output-image');

    // exactly one API call, carrying the light law at the 1K/16:9 defaults;
    // descriptor, light statement and geo block all ride verbatim
    expect(calls).toHaveLength(1);
    const body = JSON.parse(calls[0].body as string);
    expect(body.input).toHaveLength(1); // no ref images
    expect(body.input[0].type).toBe('text');
    const sent = body.input[0].text as string;
    expect(sent).toContain(LOCATION_DESCRIPTOR);
    expect(sent).toContain(LIGHT_STATEMENT);
    expect(sent).toContain(GEO_BLOCK);
    expect(sent).toContain('never two suns');
    expect(sent).toContain('3/4 view');
    expect(sent).toContain('motivated lighting only');
    expect(body.response_format).toEqual({
      type: 'image', mime_type: 'image/png', aspect_ratio: '16:9', image_size: '1K',
    });

    // the staging copy is gone after the attach — the asset dir keeps the only bytes
    expect(await readdir(join(root, 'films', 'film_x', 'generated'))).toEqual([]);

    // one ledger line, Task 3 shape, artifact = the attached plate
    const lines = await ledgerLines('film_x');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual({
      ts: expect.any(String),
      tool: 'keyframe_build',
      lane: 'gemini',
      film_id: 'film_x',
      cost_usd: 0.134,
      verdict: 'pending',
      interaction_id: 'int-fixture-output-image',
      artifact_path: String(o.plate_path),
    });

    // spend accrued on the film
    expect((await filmJson('film_x')).spentUsd).toBeCloseTo(0.134, 12);
  });

  it('style asset → plate.png attaches under the extended name law; no geo_block.md → no spatial-map line', async () => {
    await seedFilm('film_x', 1);
    await rpc('asset_register', {
      kind: 'style', asset_id: 'noir', descriptor: 'High-contrast 1940s studio noir, hard key, deep blacks',
    });

    const res = await rpc('keyframe_build', {
      asset_id: 'noir', light_statement: 'one bare bulb overhead, warm white, a single hard source',
    });
    expect(isError(res)).toBe(false);
    const o = recordOf(res);
    expect(String(o.plate_path)).toMatch(/films\/film_x\/assets\/styles\/noir\/plate\.png$/);
    expect(Array.from(await readFile(String(o.plate_path)))).toEqual([104, 101, 108, 108, 111]);

    const sent = JSON.parse(calls[0].body as string).input[0].text as string;
    expect(sent).toContain('High-contrast 1940s studio noir, hard key, deep blacks');
    expect(sent).toContain('never two suns');
    expect(sent).not.toContain('spatial map');
  });
});

describe('keyframe_build refusals (each precedes any API call)', () => {
  it('character asset → VALIDATION; full refusal pinned (NEXT keeps character_sheet_build)', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedCharacter('film_x', 'mara');

    const res = await rpc('keyframe_build', { asset_id: 'mara', light_statement: LIGHT_STATEMENT });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(
      /keyframes are for locations\/styles — characters get character_sheet_build — NEXT: pass a location or style asset_id, or sheet \\?"mara\\?" with character_sheet_build/,
    );
    expect(calls).toHaveLength(0);
    expect((await filmJson('film_x')).spentUsd).toBeUndefined();
  });

  it('prop asset → VALIDATION; full refusal pinned (truthful NEXT — no character_sheet_build dead end)', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x', 1);
    await rpc('asset_register', { kind: 'prop', asset_id: 'lantern', descriptor: 'Brass ship lantern, soot-blackened glass' });

    const res = await rpc('keyframe_build', { asset_id: 'lantern', light_statement: LIGHT_STATEMENT });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(
      /keyframes are for locations\/styles — props assets don't take keyframes — NEXT: props take no keyframe — register it as a location or style, or keyframe_build a location/,
    );
    expect(calls).toHaveLength(0);
  });

  it('unregistered asset → NOT_FOUND before any fetch', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedFilm('film_x', 1);

    const res = await rpc('keyframe_build', { asset_id: 'ghost', light_statement: LIGHT_STATEMENT });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/asset \\?"ghost\\?" is not registered/); // \" escaped inside the stringified result
    expect(calls).toHaveLength(0);
    expect((await filmJson('film_x')).spentUsd).toBeUndefined();
  });

  it('over-budget → BUDGET before any fetch (tripwire)', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedLocation('film_x', 'docks', { budgetUsd: 0.1 });

    const res = await rpc('keyframe_build', { asset_id: 'docks', light_statement: LIGHT_STATEMENT });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/budget exceeded: 0 spent \+ 0\.134 quote > 0\.1 cap/);
    expect(calls).toHaveLength(0);
    expect((await filmJson('film_x')).spentUsd).toBeUndefined();
  });
});

// --- Task 6: multi-turn editing — the interaction_id loop, end to end ---------
//
// The loop agents will actually drive: take a generation → read its returned
// interaction_id (or the asset's on-disk interaction.md seed) → feed it back as
// previous_interaction_id → assert the NEXT request body carried it. The fixture
// fetch records every call body, so the chain is provable without network.

describe('multi-turn editing (interaction_id loop end-to-end)', () => {
  it('image_generate → returned interaction_id → image_generate(previous_interaction_id) rides in the next body', async () => {
    await seedFilm('film_x', 1); // two takes = 0.268 < 1

    // turn 1: a fresh generation must NOT carry a previous_interaction_id
    const first = await rpc('image_generate', { prompt: 'A lone lighthouse at dusk, 35mm' });
    expect(isError(first)).toBe(false);
    const firstId = recordOf(first).interaction_id;
    expect(firstId).toBe('int-fixture-output-image');
    expect(JSON.parse(calls[0].body as string)).not.toHaveProperty('previous_interaction_id');

    // turn 2: the agent feeds turn 1's id back verbatim
    const second = await rpc('image_generate', {
      prompt: 'The same lighthouse, now wrapped in fog',
      previous_interaction_id: firstId,
    });
    expect(isError(second)).toBe(false);

    const body2 = JSON.parse(calls[1].body as string);
    expect(body2.previous_interaction_id).toBe(firstId);

    // both turns billed and ledgered against the same film
    expect(await ledgerLines('film_x')).toHaveLength(2);
    expect((await filmJson('film_x')).spentUsd).toBeCloseTo(0.268, 12);
  });

  it('character_sheet_build → interaction.md seed → image_generate(previous_interaction_id)', async () => {
    await seedCharacter('film_x', 'mara');

    // the sheet is the multi-turn seed; its id lands in interaction.md
    const sheet = await rpc('character_sheet_build', { asset_id: 'mara' });
    expect(isError(sheet)).toBe(false);
    const sheetId = recordOf(sheet).interaction_id;
    expect(sheetId).toBe('int-fixture-output-image');

    // read the on-disk seed the way an agent would (byte-exact, no newline)
    const seeded = await readFile(
      join(root, 'films', 'film_x', 'assets', 'characters', 'mara', 'interaction.md'),
      'utf8',
    );
    expect(seeded).toBe(sheetId);

    // the seeded id drives the next billed generation
    const res = await rpc('image_generate', {
      prompt: 'Mara at the wheel of the trawler, midnight',
      previous_interaction_id: seeded,
    });
    expect(isError(res)).toBe(false);

    const body2 = JSON.parse(calls[1].body as string);
    expect(body2.previous_interaction_id).toBe(sheetId);
    expect(body2.previous_interaction_id).toBe('int-fixture-output-image');

    expect(await ledgerLines('film_x')).toHaveLength(2); // sheet take + image take
  });
});
