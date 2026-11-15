// test/tools/video.test.ts — render_shot: async, first-frame I2V, doctrine-gated.
// Fixture-injected: VultrLane's FetchLike defaults to the global fetch, so the
// tests stub global fetch with the recorded Vultr fixture bodies (models list +
// 202 submit) — fake job ids, no credentials, no network. Refusal tests run
// fetchNever: any refusal that touches the network fails the test loudly.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../../src/server.js';
import { studioPaths } from '../../src/store/paths.js';
import { writeJsonAtomic } from '../../src/store/fs.js';
import { VultrLane } from '../../src/lanes/vultr.js';
import type { FetchLike } from '../../src/lanes/types.js';

const MODELS_URL = `${VultrLane.BASE_URL}/videos/models`;
const VIDEOS_URL = `${VultrLane.BASE_URL}/videos`;

// Recorded fixtures — the same bodies the lane tests pin (submit-202 carries
// the job id the happy path asserts on).
const modelsBody = readFileSync(new URL('../fixtures/vultr/models-list.json', import.meta.url), 'utf8');
const submitBody = readFileSync(new URL('../fixtures/vultr/submit-202.json', import.meta.url), 'utf8');

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

// Routes the two submit-time endpoints; anything else is a test failure.
const fetchOk: FetchLike = async (url, init) => {
  calls.push({ url, method: init?.method, headers: init?.headers, body: init?.body });
  if (url === MODELS_URL) return { ok: true, status: 200, text: async () => modelsBody };
  if (url === VIDEOS_URL && init?.method === 'POST') return { ok: true, status: 202, text: async () => submitBody };
  throw new Error(`unexpected ${init?.method ?? 'GET'} ${url} — no scripted fixture response`);
};
const fetchNever: FetchLike = () => {
  throw new Error('network touched — refusal must precede any API call');
};

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'fsm-video-'));
  calls = [];
  vi.stubEnv('STUDIO_LIVE', '1');
  vi.stubEnv('VULTR_INFERENCE_API_KEY', 'test-vultr-key');
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

async function jobsJson(filmId: string): Promise<Record<string, unknown>[]> {
  return JSON.parse(await readFile(join(root, 'films', filmId, 'jobs.json'), 'utf8')) as Record<string, unknown>[];
}

// The n-th POST body (0-based) — the fixture fetch records every call.
function postedBody(n: number): Record<string, unknown> {
  const posts = calls.filter((c) => c.method === 'POST');
  return JSON.parse(posts[n].body as string) as Record<string, unknown>;
}

// --- doctrine constants -------------------------------------------------------

const ACTION = 'Mara stops at the treeline, breath fogging. She looks back once.';
const CAMERA = { lens: '35mm', move: 'slow push-in', reason: 'closing on the choice' };
const SEQ_GEO = 'CLEARING = center; CABIN frame-LEFT; camera north of treeline';
const ASSET_GEO = 'dock runs east-west; winch house at the west end';
const LOCATION_DESC = 'A rain-slicked fishing dock at low tide, diesel sheen on black water';
const VOICE = 'low, gravel, unhurried coastal drawl';
const LINE = "Don't move.";
const SFX = 'wind, distant ice crack';
const PLATE_BYTES = 'plate-png-bytes';

// Full valid staging: film (+budget), location asset (+geo_block.md + plate.png
// attached via the free asset_image), character asset (+voice.md), locked
// sequence, one schema-v2 shot. Options weaken exactly one rung at a time.
async function seedShot(opts: {
  filmId?: string;
  budgetUsd?: number | null; // null → no budget on the film
  plate?: boolean; // default true — attach docks/plate.png
  lockSequence?: boolean; // default true — sequence_lock_geo seq_night
  assetGeo?: boolean; // default true — register docks with geo_block
  shotId?: string;
  durationS?: number;
  action?: string;
  dialogue?: { voice_ref?: string; line: string }[];
} = {}) {
  const filmId = opts.filmId ?? 'film_x';
  await rpc('film_create', {
    film_id: filmId, title: 'X', logline: 'Y',
    ...(opts.budgetUsd === null ? {} : { budget_usd: opts.budgetUsd ?? 5 }),
  });
  await rpc('film_set_active', { film_id: filmId });
  await rpc('asset_register', {
    kind: 'location', asset_id: 'docks', descriptor: LOCATION_DESC,
    ...(opts.assetGeo === false ? {} : { geo_block: ASSET_GEO }),
  });
  await rpc('asset_register', {
    kind: 'character', asset_id: 'mara', descriptor: 'A weathered trawler captain, mid-50s',
    voice: VOICE, acting: 'still until spoken to; moves in short decisive bursts',
  });
  if (opts.plate !== false) {
    await mkdir(join(root, 'films', filmId, 'refs'), { recursive: true });
    await writeFile(join(root, 'films', filmId, 'refs', 'plate.png'), PLATE_BYTES);
    await rpc('asset_image', { asset_id: 'docks', image_path: 'refs/plate.png' });
  }
  if (opts.lockSequence !== false) {
    await rpc('sequence_lock_geo', { sequence: 'seq_night', geo_block: SEQ_GEO });
  }
  await rpc('shot_create', {
    id: opts.shotId ?? 's1', sequence: 'seq_night',
    action: opts.action ?? ACTION,
    // the store law: a locked sequence forces the shot's stored copy to equal
    // the lock verbatim (the prompt still takes the lock from film.json)
    geo_block: opts.lockSequence === false ? 'free copy — the sequence is unlocked' : SEQ_GEO,
    refs: [{ asset_id: 'mara', role: 'character' }, { asset_id: 'docks', role: 'location' }],
    camera: CAMERA,
    audio_block: { dialogue: opts.dialogue ?? [{ voice_ref: 'mara', line: LINE }], sfx: SFX },
    duration_s: opts.durationS ?? 8,
  });
  return filmId;
}

// --- happy path ---------------------------------------------------------------

describe('render_shot happy path (fixture fetch)', () => {
  it('submits the H3 law with the plate as first frame, writes jobs.json + the estimated ledger line, returns the async handle', async () => {
    await seedShot();
    const res = await rpc('render_shot', { shot_id: 's1' });
    expect(isError(res)).toBe(false);

    const o = recordOf(res);
    expect(Object.keys(o).sort()).toEqual([
      'duration_s', 'estimated_cost_usd', 'job_id', 'real_length_s', 'status',
    ]);
    expect(o.job_id).toBe('vid-fixture-0001'); // 202 → { id, status pending }
    expect(o.status).toBe('pending');
    expect(o.estimated_cost_usd).toBeCloseTo(1.224, 12); // 0.153 × 8
    expect(o.duration_s).toBe(8);
    expect(o.real_length_s).toBe(8); // H3_REAL_LENGTHS[8]

    // exactly the catalog check + the POST (model-ID pinning precedes every submit)
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({ method: 'GET', url: MODELS_URL });
    expect(calls[1]).toMatchObject({ method: 'POST', url: VIDEOS_URL });
    const body = postedBody(0);
    expect(body.model).toBe('minimax-h3');
    expect(body.duration).toBe(8);
    expect(body.aspect_ratio).toBe('16:9');
    expect(body.quality).toBe('standard'); // default
    expect(body.generate_audio).toBe(true);

    // the prompt carries the doctrine verbatim
    const p = body.prompt as string;
    expect(p).toContain(ACTION); // the picture beat, byte-for-byte
    expect(p).toContain(`says: <d>[English]${LINE}</d>`); // dialogue line verbatim
    expect(p).toContain(VOICE); // voice.md verbatim as the descriptor
    expect(p).toContain(SEQ_GEO); // the SEQUENCE lock is the prompt's geo…
    expect(p).not.toContain(ASSET_GEO); // …never the asset's advisory copy
    expect(p).toContain('overall_soundscape: room tone; wind, distant ice crack');
    expect(p).toContain('non_diegetic_music: N/A');
    expect(p).toContain('Picture 1 is fully referenced at 0.00s in Shot 1.');
    expect(p).toContain('Camera: The camera slow push-in');

    // the plate is the identity carrier: one first_frame data-URL entry, exact bytes
    expect(body.frame_images).toHaveLength(1);
    expect(body.frame_images[0].type).toBe('first_frame');
    const frameUrl = body.frame_images[0].image_url.url as string;
    expect(frameUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(frameUrl).toBe(`data:image/png;base64,${Buffer.from(PLATE_BYTES).toString('base64')}`);

    // jobs.json entry: the async handle the lifecycle tools poll
    expect(await jobsJson('film_x')).toEqual([{
      job_id: 'vid-fixture-0001',
      shot_id: 's1',
      lane: 'vultr',
      status: 'pending',
      submitted_ts: expect.any(String),
      prompt_version: 'h3-v1',
    }]);

    // ledger: the ESTIMATE line, marked estimated (the append-only reconcile design)
    expect(await ledgerLines('film_x')).toEqual([{
      ts: expect.any(String),
      tool: 'render_shot',
      lane: 'vultr',
      film_id: 'film_x',
      cost_usd: 1.224,
      verdict: 'pending',
      job_id: 'vid-fixture-0001',
      artifact_path: '',
      estimated: true,
    }]);

    // submit accrues NOTHING — recordSpend happens at job_download (reconcile)
    expect((await filmJson('film_x')).spentUsd).toBeUndefined();
  });

  it('geo fallback: unlocked sequence → the location asset geo_block.md, verbatim', async () => {
    await seedShot({ lockSequence: false });
    const res = await rpc('render_shot', { shot_id: 's1' });
    expect(isError(res)).toBe(false);
    const p = postedBody(0).prompt as string;
    expect(p).toContain(ASSET_GEO);
    expect(p).not.toContain(SEQ_GEO);
    expect(p).toContain('Setting (spatial map, locked across every shot of this scene)');
  });

  it('no sequence lock and no asset geo_block.md → the Setting line is omitted entirely', async () => {
    await seedShot({ lockSequence: false, assetGeo: false });
    const res = await rpc('render_shot', { shot_id: 's1' });
    expect(isError(res)).toBe(false);
    expect(postedBody(0).prompt as string).not.toContain('Setting (spatial map');
  });

  it('quality rides the enum through; 15s quotes 2.295 and maps real_length 15.08', async () => {
    await seedShot({ durationS: 15 });
    const res = await rpc('render_shot', { shot_id: 's1', quality: 'max' });
    expect(isError(res)).toBe(false);

    const o = recordOf(res);
    expect(o.estimated_cost_usd).toBeCloseTo(2.295, 12); // 0.153 × 15
    expect(o.duration_s).toBe(15);
    expect(o.real_length_s).toBe(15.08); // H3_REAL_LENGTHS[15]

    const body = postedBody(0);
    expect(body.quality).toBe('max');
    expect(body.duration).toBe(15);
    expect((await ledgerLines('film_x'))[0].cost_usd).toBeCloseTo(2.295, 12);
  });
});

// --- refusals: every rung precedes any fetch -----------------------------------

describe('render_shot refusals (each with fetchNever)', () => {
  it('unknown film_id → NOT_FOUND before any fetch', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedShot();

    const res = await rpc('render_shot', { shot_id: 's1', film_id: 'ghost' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/film \\?"ghost\\?" is not registered/);
    expect(calls).toHaveLength(0);
  });

  it('unknown shot → NOT_FOUND (shot exists rung)', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedShot();

    const res = await rpc('render_shot', { shot_id: 'ghost' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/shot \\?"ghost\\?" not found/);
    expect(calls).toHaveLength(0);
  });

  it('legacy pre-v2 shot (no action) → VALIDATION with the shot_update fix', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedShot();
    // A hand-written pre-v2 record, exactly the legacy files on disk (the store
    // enforces action on new writes only; old files are never migrated). The
    // record's ref HAS a plate — proving the action rung precedes the plate rung.
    const paths = studioPaths(root);
    await writeJsonAtomic(paths.shotPath('film_x', 'legacy'), {
      id: 'legacy', sequence: 'seq_night', status: 'draft',
      geoBlock: SEQ_GEO, refs: [{ assetId: 'docks', role: 'location' }],
      camera: CAMERA, audioBlock: {}, durationS: 8, takes: [],
    });

    const res = await rpc('render_shot', { shot_id: 'legacy' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/has no action \(pre-v2 record\)/);
    expect(JSON.stringify(res)).toMatch(/shot_update the action — the H3 prompt needs the picture beat/);
    expect(calls).toHaveLength(0);
  });

  it('3s duration → VALIDATION: the H3 lane law (the store allows 1–30)', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedShot({ durationS: 3 });

    const res = await rpc('render_shot', { shot_id: 's1' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/H3 lane renders 4–15s/);
    expect(JSON.stringify(res)).toMatch(/split the beat or adjust the shot/);
    expect(calls).toHaveLength(0);
  });

  it('fractional duration (4.5s) → VALIDATION: whole seconds only', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedShot({ durationS: 4.5 });

    const res = await rpc('render_shot', { shot_id: 's1' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/whole number of seconds \(got 4\.5\)/);
    expect(calls).toHaveLength(0);
  });

  it('no keyframe plate → VALIDATION: staging before spend', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedShot({ plate: false });

    const res = await rpc('render_shot', { shot_id: 's1' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/has no keyframe plate/);
    expect(JSON.stringify(res)).toMatch(/keyframe_build the location first \(staging before spend\)/);
    expect(calls).toHaveLength(0);
  });

  it('unknown voice_ref → NOT_FOUND; a non-character ref names its kind', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedShot({ dialogue: [{ voice_ref: 'ghost_voice', line: LINE }] });

    const res = await rpc('render_shot', { shot_id: 's1' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/voice_ref \\?"ghost_voice\\?" is not a registered character/);
    expect(calls).toHaveLength(0);

    // registered, but not a character → same rung, kind named
    await seedShot({ filmId: 'film_y', dialogue: [{ voice_ref: 'docks', line: LINE }] });
    const res2 = await rpc('render_shot', { shot_id: 's1' });
    expect(isError(res2)).toBe(true);
    expect(JSON.stringify(res2)).toMatch(/voice_ref \\?"docks\\?" is a locations asset — dialogue needs a character voice/);
    expect(calls).toHaveLength(0);
  });

  it('dialogue line without voice_ref → VALIDATION (every spoken line needs a registered voice)', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedShot({ dialogue: [{ line: LINE }] });

    const res = await rpc('render_shot', { shot_id: 's1' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/dialogue line S1 has no voice_ref/);
    expect(calls).toHaveLength(0);
  });

  it('film without a budget → BUDGET refusal', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedShot({ budgetUsd: null });

    const res = await rpc('render_shot', { shot_id: 's1' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/no budget set on film \\?"film_x\\?"/);
    expect(calls).toHaveLength(0);
  });

  it('over budget → BUDGET before any fetch', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedShot({ budgetUsd: 1 }); // 8s → 1.224 quote > 1 cap

    const res = await rpc('render_shot', { shot_id: 's1' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/budget exceeded: 0 spent \+ 1\.224 quote > 1 cap/);
    expect(calls).toHaveLength(0);
    expect((await filmJson('film_x')).spentUsd).toBeUndefined();
  });

  it('STUDIO_LIVE=0 → registry-only refusal before any fetch', async () => {
    vi.stubEnv('STUDIO_LIVE', '0');
    vi.stubGlobal('fetch', fetchNever);
    await seedShot();

    const res = await rpc('render_shot', { shot_id: 's1' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/real generation lanes are disabled \(STUDIO_LIVE=0\)/);
    expect(JSON.stringify(res)).toMatch(/set STUDIO_LIVE=1 to enable billed calls/);
    expect(calls).toHaveLength(0);
  });

  it('VULTR_INFERENCE_API_KEY missing → AUTH naming the env var', async () => {
    vi.stubEnv('VULTR_INFERENCE_API_KEY', '');
    vi.stubGlobal('fetch', fetchNever);
    await seedShot();

    const res = await rpc('render_shot', { shot_id: 's1' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/VULTR_INFERENCE_API_KEY is not set/);
    expect(JSON.stringify(res)).toMatch(/NEXT: /);
    expect(calls).toHaveLength(0);
    await expect(readFile(join(root, 'films', 'film_x', 'ledger.jsonl'), 'utf8'))
      .rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('8000-char overflow → VALIDATION naming the H3 cap (composeH3Prompt propagation)', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedShot({ action: 'word '.repeat(1700) }); // 8500 chars of picture beat

    const res = await rpc('render_shot', { shot_id: 's1' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/prompt is \d+ chars \(H3 cap 8000\)/);
    expect(JSON.stringify(res)).toMatch(/shorten the action text — descriptors are verbatim law and never trimmed/);
    expect(calls).toHaveLength(0);
  });
});
