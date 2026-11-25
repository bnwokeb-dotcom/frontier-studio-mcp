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
import { appendLine, writeJsonAtomic } from '../../src/store/fs.js';
import { patchFilmMeta } from '../../src/store/film.js';
import { VultrLane } from '../../src/lanes/vultr.js';
import type { FetchLike } from '../../src/lanes/types.js';

const MODELS_URL = `${VultrLane.BASE_URL}/videos/models`;
const VIDEOS_URL = `${VultrLane.BASE_URL}/videos`;
const jobUrl = (id: string) => `${VIDEOS_URL}/${id}`;
const CONTENT_URL = (id: string) => `${VIDEOS_URL}/${id}/content`;

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

// --- M3 Task 4 helpers ---------------------------------------------------------

const FINAL_FRAME_BYTES = 'final-frame-png-bytes';

// Recorded content fixture — the fake mp4 bytes the lane tests pin too.
const videoBytes = () =>
  Buffer.from(readFileSync(new URL('../fixtures/vultr/video.mp4.txt', import.meta.url), 'utf8'), 'utf8');

interface ScriptedBody {
  status?: number;
  body?: string;
  bytes?: Buffer;
}

// Queue-based fake fetch: scripted per METHOD+URL, responses consumed in order
// (the lane-test pattern); records every call into `calls` like fetchOk does.
function scriptFetch(routes: Record<string, ScriptedBody[]>): FetchLike {
  const queue = new Map<string, ScriptedBody[]>(Object.entries(routes).map(([k, v]) => [k, [...v]]));
  return async (url, init) => {
    const key = `${init?.method ?? 'GET'} ${url}`;
    calls.push({ url, method: init?.method, headers: init?.headers, body: init?.body });
    const next = queue.get(key)?.shift();
    if (!next) throw new Error(`unexpected ${key} — no scripted response`);
    return {
      ok: (next.status ?? 200) >= 200 && (next.status ?? 200) < 300,
      status: next.status ?? 200,
      text: async () => next.body ?? '',
      arrayBuffer: async () => new Uint8Array(next.bytes ?? Buffer.alloc(0)).buffer,
    };
  };
}

// A Vultr job payload; expires_at/usage.cost/output ride only when given.
// expiresHours is RELATIVE to now — the recorded fixture's fixed expires_at
// (2026-11-22) would rot every assertion the moment the calendar moved past it.
function jobPayload(o: {
  id?: string;
  status: string;
  progress?: number;
  error?: string;
  expiresHours?: number;
  cost?: number;
  duration?: number;
}): string {
  return JSON.stringify({
    id: o.id ?? 'vid-fixture-0001',
    status: o.status,
    ...(o.progress !== undefined ? { progress: o.progress } : {}),
    ...(o.error !== undefined ? { error: o.error } : {}),
    ...(o.expiresHours !== undefined
      ? { expires_at: new Date(Date.now() + o.expiresHours * 3_600_000).toISOString() }
      : {}),
    ...(o.cost !== undefined ? { usage: { cost: o.cost } } : {}),
    ...(o.duration !== undefined
      ? { output: { duration: o.duration, width: 1366, height: 768, has_audio: true } }
      : {}),
  });
}

// Hand-seed jobs.json (refusal tests must stage handles without a fetch).
async function seedJobs(filmId: string, entries: Record<string, unknown>[]): Promise<void> {
  await writeJsonAtomic(studioPaths(root).jobsPath(filmId), entries);
}

// Seed the film's spentUsd — for the negative-delta test this IS the true
// post-submit state (the reserve, R-MONEY): spentUsd carries the estimate at
// download time, and the reconcile moves it to the actual (decreasing on a
// negative delta).
async function seedSpent(filmId: string, spentUsd: number): Promise<void> {
  await patchFilmMeta(studioPaths(root), filmId, (m) => ({ ...m, spentUsd }));
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

    // the estimate is a RESERVED accrual at submit (R-MONEY binding ruling) —
    // the budget law counts in-flight renders; job_download reconciles, job_status refunds
    expect((await filmJson('film_x')).spentUsd).toBeCloseTo(1.224, 12);
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

// --- M3 Task 4: job_status — poll + jobs.json lifecycle -------------------------

describe('job_status', () => {
  it('polls the lane and walks the jobs.json entry through in_progress → completed', async () => {
    await seedShot();
    expect(isError(await rpc('render_shot', { shot_id: 's1' }))).toBe(false); // handle + reserve

    vi.stubGlobal('fetch', scriptFetch({
      [`GET ${jobUrl('vid-fixture-0001')}`]: [
        { body: jobPayload({ status: 'in_progress', progress: 45 }) },
        { body: jobPayload({ status: 'completed', progress: 100, expiresHours: 100, cost: 1.36, duration: 8 }) },
      ],
    }));

    // poll 1 — in_progress; no expires_at on the payload → expires_in_hours null;
    // the reserve sits untouched (only a dead or downloaded job moves money)
    const r1 = await rpc('job_status', { job_id: 'vid-fixture-0001' });
    expect(isError(r1)).toBe(false);
    expect(recordOf(r1)).toEqual({
      job_id: 'vid-fixture-0001', status: 'in_progress', progress: 45, expires_in_hours: null,
    });
    expect(await jobsJson('film_x')).toEqual([{
      job_id: 'vid-fixture-0001', shot_id: 's1', lane: 'vultr', status: 'in_progress',
      submitted_ts: expect.any(String), prompt_version: 'h3-v1',
    }]);
    expect((await filmJson('film_x')).spentUsd).toBeCloseTo(1.224, 12); // the reserve
    expect(await ledgerLines('film_x')).toHaveLength(1);

    // poll 2 — completed: expires_in_hours from the payload's expires_at (~100h out);
    // a completed entry must not keep stale failure text; observing completion
    // accrues nothing — job_download reconciles
    const r2 = await rpc('job_status', { job_id: 'vid-fixture-0001' });
    const o2 = recordOf(r2);
    expect(o2.status).toBe('completed');
    expect(o2.progress).toBe(100);
    expect(o2.expires_in_hours).toBeCloseTo(100, 0);
    expect(o2.error_verbatim).toBeUndefined();
    expect((await jobsJson('film_x'))[0]).toEqual({
      job_id: 'vid-fixture-0001', shot_id: 's1', lane: 'vultr', status: 'completed',
      submitted_ts: expect.any(String), prompt_version: 'h3-v1',
    });
    expect((await filmJson('film_x')).spentUsd).toBeCloseTo(1.224, 12); // reserve untouched
    expect(await ledgerLines('film_x')).toHaveLength(1);
  });

  it('failed status refunds the reserved estimate — once (idempotent second poll)', async () => {
    await seedShot();
    expect(isError(await rpc('render_shot', { shot_id: 's1' }))).toBe(false);
    expect((await filmJson('film_x')).spentUsd).toBeCloseTo(1.224, 12); // the reserve

    const failedBody = jobPayload({
      status: 'failed', progress: 30,
      error: 'content policy violation: prompt rejected by the safety filter',
    });
    vi.stubGlobal('fetch', scriptFetch({
      [`GET ${jobUrl('vid-fixture-0001')}`]: [{ body: failedBody }, { body: failedBody }],
    }));

    const res = await rpc('job_status', { job_id: 'vid-fixture-0001' });
    expect(isError(res)).toBe(false);
    expect(recordOf(res)).toEqual({
      job_id: 'vid-fixture-0001', status: 'failed', progress: 30,
      error_verbatim: 'content policy violation: prompt rejected by the safety filter',
      expires_in_hours: null,
    });

    // the reserve is back on the film: spentUsd 1.224 − 1.224 → 0
    expect((await filmJson('film_x')).spentUsd).toBeCloseTo(0, 12);
    expect(await ledgerLines('film_x')).toEqual([
      { ts: expect.any(String), tool: 'render_shot', lane: 'vultr', film_id: 'film_x', cost_usd: 1.224, verdict: 'pending', job_id: 'vid-fixture-0001', artifact_path: '', estimated: true },
      { ts: expect.any(String), tool: 'job_status', lane: 'vultr', film_id: 'film_x', cost_usd: -1.224, verdict: 'pending', job_id: 'vid-fixture-0001', note: 'refund' },
    ]);
    expect((await jobsJson('film_x'))[0]).toEqual({
      job_id: 'vid-fixture-0001', shot_id: 's1', lane: 'vultr', status: 'failed',
      submitted_ts: expect.any(String), prompt_version: 'h3-v1',
      error_verbatim: 'content policy violation: prompt rejected by the safety filter',
      note: 'estimate refunded (only completed jobs bill)',
    });

    // idempotent: the second failed poll does NOT refund again
    await rpc('job_status', { job_id: 'vid-fixture-0001' });
    expect(await ledgerLines('film_x')).toHaveLength(2);
    expect((await filmJson('film_x')).spentUsd).toBeCloseTo(0, 12);
    expect((await jobsJson('film_x'))[0]).toMatchObject({
      status: 'failed', note: 'estimate refunded (only completed jobs bill)',
    });
  });

  it('unknown job id → NOT_FOUND naming the handle file (fetchNever)', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedShot();

    const res = await rpc('job_status', { job_id: 'vid-ghost' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/no such job \\?"vid-ghost\\?"/);
    expect(JSON.stringify(res)).toMatch(/check render_shot output/);
    expect(calls).toHaveLength(0);
  });

  it('STUDIO_LIVE=0 → registry-only refusal before any fetch (status AND download)', async () => {
    vi.stubEnv('STUDIO_LIVE', '0');
    vi.stubGlobal('fetch', fetchNever);
    await seedShot();
    await seedJobs('film_x', [{
      job_id: 'vid-fixture-0001', shot_id: 's1', lane: 'vultr',
      status: 'pending', submitted_ts: 't', prompt_version: 'h3-v1',
    }]);

    const res = await rpc('job_status', { job_id: 'vid-fixture-0001' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/real generation lanes are disabled \(STUDIO_LIVE=0\)/);
    expect(calls).toHaveLength(0);

    const res2 = await rpc('job_download', { job_id: 'vid-fixture-0001' });
    expect(isError(res2)).toBe(true);
    expect(JSON.stringify(res2)).toMatch(/STUDIO_LIVE=0/);
    expect(calls).toHaveLength(0);
  });
});

// --- M3 Task 4: job_download — content + reconcile accrual ----------------------

describe('job_download', () => {
  it('download before completed → VALIDATION naming the current status; no content GET', async () => {
    await seedShot();
    expect(isError(await rpc('render_shot', { shot_id: 's1' }))).toBe(false);
    const submitted = calls.length; // the submit's calls precede the scripted stub
    vi.stubGlobal('fetch', scriptFetch({
      [`GET ${jobUrl('vid-fixture-0001')}`]: [
        { body: jobPayload({ status: 'in_progress', progress: 45 }) },
      ],
    }));

    const res = await rpc('job_download', { job_id: 'vid-fixture-0001' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/job is in_progress, not completed — poll again/);
    // only the poll happened — content exists only on a completed job
    expect(calls.slice(submitted).map((c) => c.url)).toEqual([jobUrl('vid-fixture-0001')]);
    expect((await jobsJson('film_x'))[0]).toMatchObject({ status: 'pending' });
  });

  it('happy path: mp4 written, reconcile delta accrued (+0.102), ledger delta line, completed entry', async () => {
    await seedShot({ durationS: 6 }); // 0.153 × 6 = 0.918 estimate
    expect(isError(await rpc('render_shot', { shot_id: 's1' }))).toBe(false); // the estimate line
    // The estimate's accrual is the RESERVE from submit (R-MONEY ruling) —
    // spentUsd already carries it; the reconcile moves it to the actual.

    vi.stubGlobal('fetch', scriptFetch({
      [`GET ${jobUrl('vid-fixture-0001')}`]: [
        { body: jobPayload({ status: 'completed', progress: 100, expiresHours: 100, cost: 1.02, duration: 6.58 }) },
      ],
      [`GET ${CONTENT_URL('vid-fixture-0001')}`]: [{ bytes: videoBytes() }],
    }));

    const res = await rpc('job_download', { job_id: 'vid-fixture-0001' });
    expect(isError(res)).toBe(false);
    const o = recordOf(res);
    expect(Object.keys(o).sort()).toEqual([
      'actual_cost_usd', 'artifact_path', 'has_audio', 'height', 'job_id', 'real_length_s', 'status', 'width',
    ]);
    expect(o.job_id).toBe('vid-fixture-0001');
    expect(o.status).toBe('completed');
    expect(o.actual_cost_usd).toBeCloseTo(1.02, 12);
    expect(o.real_length_s).toBe(6.58);
    expect(o.width).toBe(1366);
    expect(o.height).toBe(768);
    expect(o.has_audio).toBe(true);
    expect(o.artifact_path).toBe(`${root}/films/film_x/renders/vid-fixture-0001/shot.mp4`);
    expect(o.warning).toBeUndefined(); // ~100h remaining — no retention warning

    // the mp4 holds the fixture bytes
    const mp4 = await readFile(`${root}/films/film_x/renders/vid-fixture-0001/shot.mp4`);
    expect(mp4.toString('utf8')).toBe('VULTRFAKE');

    // reconcile: actual 1.02 − estimate 0.918 = delta 0.102 accrued — and the
    // delta line IS the record (append-only ledger cannot edit the estimate line)
    expect((await filmJson('film_x')).spentUsd).toBeCloseTo(1.02, 12);
    expect(await ledgerLines('film_x')).toEqual([
      { ts: expect.any(String), tool: 'render_shot', lane: 'vultr', film_id: 'film_x', cost_usd: 0.153 * 6, verdict: 'pending', job_id: 'vid-fixture-0001', artifact_path: '', estimated: true },
      { ts: expect.any(String), tool: 'job_download', lane: 'vultr', film_id: 'film_x', cost_usd: 0.102, verdict: 'pending', job_id: 'vid-fixture-0001', note: 'reconcile' },
    ]);

    // jobs.json: the completed entry carries the artifact + the actual facts
    expect(await jobsJson('film_x')).toEqual([{
      job_id: 'vid-fixture-0001', shot_id: 's1', lane: 'vultr', status: 'completed',
      submitted_ts: expect.any(String), prompt_version: 'h3-v1',
      artifact_path: `${root}/films/film_x/renders/vid-fixture-0001/shot.mp4`,
      actual_cost_usd: 1.02, real_seconds: 6.58, width: 1366, height: 768, has_audio: true,
    }]);
  });

  it('zero delta (actual equals the estimate) → no reconcile line, no spend movement', async () => {
    await seedShot({ durationS: 6 });
    expect(isError(await rpc('render_shot', { shot_id: 's1' }))).toBe(false); // estimate 0.918, reserved
    // the reserve from submit already sits on the film; actual == estimate → no movement

    vi.stubGlobal('fetch', scriptFetch({
      [`GET ${jobUrl('vid-fixture-0001')}`]: [
        { body: jobPayload({ status: 'completed', progress: 100, expiresHours: 100, cost: 0.918, duration: 6.58 }) },
      ],
      [`GET ${CONTENT_URL('vid-fixture-0001')}`]: [{ bytes: videoBytes() }],
    }));

    const res = await rpc('job_download', { job_id: 'vid-fixture-0001' });
    expect(isError(res)).toBe(false);
    expect(recordOf(res).actual_cost_usd).toBeCloseTo(0.918, 12);
    expect((await filmJson('film_x')).spentUsd).toBeCloseTo(0.918, 12); // untouched
    expect(await ledgerLines('film_x')).toHaveLength(1); // the estimate line only — no delta line
  });

  it('negative delta (actual below the estimate) → spentUsd DECREASES — money truth', async () => {
    await seedShot();
    // Hand-seeded handles + ledger to hit the exact spec pair (estimate 1.02 vs
    // actual 0.918) — the render_shot → ledger integration is pinned by the
    // happy path. The spentUsd seed IS the true post-submit state now: the
    // submit's reserve.
    await seedJobs('film_x', [{
      job_id: 'vid-fixture-0001', shot_id: 's1', lane: 'vultr',
      status: 'pending', submitted_ts: 't', prompt_version: 'h3-v1',
    }]);
    await appendLine(studioPaths(root).ledgerPath('film_x'), JSON.stringify({
      ts: 't', tool: 'render_shot', lane: 'vultr', film_id: 'film_x', cost_usd: 1.02,
      verdict: 'pending', job_id: 'vid-fixture-0001', artifact_path: '', estimated: true,
    }));
    await seedSpent('film_x', 1.02); // the reserve, as submit accrued it

    vi.stubGlobal('fetch', scriptFetch({
      [`GET ${jobUrl('vid-fixture-0001')}`]: [
        { body: jobPayload({ status: 'completed', progress: 100, expiresHours: 100, cost: 0.918, duration: 8 }) },
      ],
      [`GET ${CONTENT_URL('vid-fixture-0001')}`]: [{ bytes: videoBytes() }],
    }));

    const res = await rpc('job_download', { job_id: 'vid-fixture-0001' });
    expect(isError(res)).toBe(false);
    expect((await filmJson('film_x')).spentUsd).toBeCloseTo(0.918, 12); // 1.02 − 0.102 — the film owes LESS
    expect(await ledgerLines('film_x')).toEqual([
      expect.objectContaining({ tool: 'render_shot', cost_usd: 1.02, estimated: true }),
      { ts: expect.any(String), tool: 'job_download', lane: 'vultr', film_id: 'film_x', cost_usd: -0.102, verdict: 'pending', job_id: 'vid-fixture-0001', note: 'reconcile' },
    ]);
  });

  it('job_download on a failed job → VALIDATION pointing at job_status to release the reserve', async () => {
    await seedShot();
    expect(isError(await rpc('render_shot', { shot_id: 's1' }))).toBe(false); // reserve 1.224

    const failedBody = jobPayload({ status: 'failed', progress: 30, error: 'content policy violation' });
    vi.stubGlobal('fetch', scriptFetch({
      [`GET ${jobUrl('vid-fixture-0001')}`]: [{ body: failedBody }, { body: failedBody }],
    }));

    // the failed poll runs the refund law (which lives ONLY in job_status —
    // job_download's NEXT points at it, it does not refund)
    expect(isError(await rpc('job_status', { job_id: 'vid-fixture-0001' }))).toBe(false);
    expect((await filmJson('film_x')).spentUsd).toBeCloseTo(0, 12);

    const res = await rpc('job_download', { job_id: 'vid-fixture-0001' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/job is failed, not completed/);
    expect(JSON.stringify(res))
      .toMatch(/failed jobs bill \$0 — poll job_status to release the reserved estimate; re-render via repair_shot/);
    // the poll happened; no content GET, no jobs.json completion, no extra money event
    expect(calls.filter((c) => c.url === CONTENT_URL('vid-fixture-0001'))).toHaveLength(0);
    expect(await ledgerLines('film_x')).toHaveLength(2); // estimate + refund only
    expect((await jobsJson('film_x'))[0]).toMatchObject({ status: 'failed' });
  });

  it('job_download on a cancelled job (poll skipped) → VALIDATION naming job_status as the reserve release', async () => {
    await seedShot();
    expect(isError(await rpc('render_shot', { shot_id: 's1' }))).toBe(false); // reserve 1.224

    // the reachable skipped-poll path: NO job_status ran, so no refund has
    // fired yet — the NEXT must say "release any reserved estimate", not claim one was refunded
    vi.stubGlobal('fetch', scriptFetch({
      [`GET ${jobUrl('vid-fixture-0001')}`]: [{ body: jobPayload({ status: 'cancelled', progress: 0 }) }],
    }));

    const res = await rpc('job_download', { job_id: 'vid-fixture-0001' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/job is cancelled, not completed/);
    expect(JSON.stringify(res))
      .toMatch(/cancelled jobs bill \$0 — poll job_status to release any reserved estimate/);
    expect(calls.filter((c) => c.url === CONTENT_URL('vid-fixture-0001'))).toHaveLength(0); // no content GET
    expect(await ledgerLines('film_x')).toHaveLength(1); // estimate still reserved — no refund ran here
    expect((await jobsJson('film_x'))[0]).toMatchObject({ status: 'pending' }); // entry untouched
  });

  it('job_download on an expired job (poll skipped) → the expired analog of the release NEXT', async () => {
    await seedShot();
    expect(isError(await rpc('render_shot', { shot_id: 's1' }))).toBe(false); // reserve 1.224

    vi.stubGlobal('fetch', scriptFetch({
      [`GET ${jobUrl('vid-fixture-0001')}`]: [{ body: jobPayload({ status: 'expired', progress: 0 }) }],
    }));

    const res = await rpc('job_download', { job_id: 'vid-fixture-0001' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/job is expired, not completed/);
    expect(JSON.stringify(res))
      .toMatch(/expired jobs bill \$0 — poll job_status to release any reserved estimate/);
    expect(calls.filter((c) => c.url === CONTENT_URL('vid-fixture-0001'))).toHaveLength(0);
    expect(await ledgerLines('film_x')).toHaveLength(1); // estimate still reserved — no refund ran here
    expect((await jobsJson('film_x'))[0]).toMatchObject({ status: 'pending' }); // entry untouched
  });

  it('download after a refund: the reconcile accrues the ACTUAL in full (net reservation 0)', async () => {
    await seedShot();
    expect(isError(await rpc('render_shot', { shot_id: 's1' }))).toBe(false); // reserve 1.224

    vi.stubGlobal('fetch', scriptFetch({
      [`GET ${jobUrl('vid-fixture-0001')}`]: [
        { body: jobPayload({ status: 'failed', progress: 30, error: 'content policy violation' }) },
        { body: jobPayload({ status: 'completed', progress: 100, expiresHours: 100, cost: 1.02, duration: 8 }) },
      ],
      [`GET ${CONTENT_URL('vid-fixture-0001')}`]: [{ bytes: videoBytes() }],
    }));

    // the failed poll refunds the reserve: spentUsd back at 0
    expect(isError(await rpc('job_status', { job_id: 'vid-fixture-0001' }))).toBe(false);
    expect((await filmJson('film_x')).spentUsd).toBeCloseTo(0, 12);

    // the download then reconciles against a net reservation of 0 — the actual
    // accrues in full; the ledger per job sums to the truth (1.224 − 1.224 + 1.02)
    const res = await rpc('job_download', { job_id: 'vid-fixture-0001' });
    expect(isError(res)).toBe(false);
    expect(recordOf(res).actual_cost_usd).toBeCloseTo(1.02, 12);
    expect((await filmJson('film_x')).spentUsd).toBeCloseTo(1.02, 12);
    expect(await ledgerLines('film_x')).toEqual([
      expect.objectContaining({ tool: 'render_shot', cost_usd: 1.224, estimated: true }),
      expect.objectContaining({ tool: 'job_status', cost_usd: -1.224, note: 'refund' }),
      { ts: expect.any(String), tool: 'job_download', lane: 'vultr', film_id: 'film_x', cost_usd: 1.02, verdict: 'pending', job_id: 'vid-fixture-0001', note: 'reconcile' },
    ]);
    // the completed entry supersedes the interim refund note
    expect((await jobsJson('film_x'))[0]).toEqual({
      job_id: 'vid-fixture-0001', shot_id: 's1', lane: 'vultr', status: 'completed',
      submitted_ts: expect.any(String), prompt_version: 'h3-v1',
      artifact_path: `${root}/films/film_x/renders/vid-fixture-0001/shot.mp4`,
      actual_cost_usd: 1.02, real_seconds: 8, width: 1366, height: 768, has_audio: true,
    });
  });

  it('retention warning when content expires in <48h', async () => {
    await seedShot();
    expect(isError(await rpc('render_shot', { shot_id: 's1' }))).toBe(false);
    vi.stubGlobal('fetch', scriptFetch({
      [`GET ${jobUrl('vid-fixture-0001')}`]: [
        { body: jobPayload({ status: 'completed', progress: 100, expiresHours: 24, cost: 1.36, duration: 8 }) },
      ],
      [`GET ${CONTENT_URL('vid-fixture-0001')}`]: [{ bytes: videoBytes() }],
    }));

    const res = await rpc('job_download', { job_id: 'vid-fixture-0001' });
    expect(isError(res)).toBe(false);
    expect(recordOf(res).warning).toBe('content expires in 24h — download or re-render');
  });

  it('re-download → VALIDATION (the reconcile accrual must never double)', async () => {
    await seedShot();
    expect(isError(await rpc('render_shot', { shot_id: 's1' }))).toBe(false);
    vi.stubGlobal('fetch', scriptFetch({
      [`GET ${jobUrl('vid-fixture-0001')}`]: [
        { body: jobPayload({ status: 'completed', progress: 100, expiresHours: 100, cost: 1.36, duration: 8 }) },
      ],
      [`GET ${CONTENT_URL('vid-fixture-0001')}`]: [{ bytes: videoBytes() }],
    }));
    expect(isError(await rpc('job_download', { job_id: 'vid-fixture-0001' }))).toBe(false);
    const downloaded = calls.length; // the first download's calls precede the re-stub

    vi.stubGlobal('fetch', fetchNever);
    const res = await rpc('job_download', { job_id: 'vid-fixture-0001' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/already downloaded/);
    expect(calls).toHaveLength(downloaded); // the refusal touched no network
  });
});

// --- M3 Task 4: repair_shot — v1 modes with lineage -----------------------------

describe('repair_shot', () => {
  it('repair extend: the agent-supplied first frame replaces the plate; lineage lands in jobs.json + ledger', async () => {
    const filmId = await seedShot();
    expect(isError(await rpc('render_shot', { shot_id: 's1' }))).toBe(false); // the parent job
    // the parent's final-frame screenshot, supplied by the agent (M3.5 extracts it)
    await mkdir(join(root, 'films', filmId, 'refs'), { recursive: true });
    await writeFile(join(root, 'films', filmId, 'refs', 'final-frame.png'), FINAL_FRAME_BYTES);

    vi.stubGlobal('fetch', scriptFetch({
      [`GET ${MODELS_URL}`]: [{ body: modelsBody }],
      [`POST ${VIDEOS_URL}`]: [{ body: JSON.stringify({ id: 'vid-fixture-0002', status: 'pending' }) }],
    }));

    const res = await rpc('repair_shot', {
      shot_id: 's1', parent_job_id: 'vid-fixture-0001', mode: 'extend',
      first_frame_path: 'refs/final-frame.png',
    });
    expect(isError(res)).toBe(false);
    const o = recordOf(res);
    expect(Object.keys(o).sort()).toEqual([
      'duration_s', 'estimated_cost_usd', 'job_id', 'parent_job_id', 'real_length_s', 'status',
    ]);
    expect(o.job_id).toBe('vid-fixture-0002');
    expect(o.parent_job_id).toBe('vid-fixture-0001');
    expect(o.status).toBe('pending');
    expect(o.estimated_cost_usd).toBeCloseTo(1.224, 12);
    expect(o.real_length_s).toBe(8);

    // the SUPPLIED frame is the identity carrier — the plate is not sent
    const body = postedBody(1); // POST #0 was the parent render_shot
    expect(body.frame_images).toEqual([
      { frame_type: 'first_frame', type: 'first_frame', image_url: { url: `data:image/png;base64,${Buffer.from(FINAL_FRAME_BYTES).toString('base64')}` } },
    ]);

    // lineage in jobs.json
    const jobs = await jobsJson('film_x');
    expect(jobs).toHaveLength(2);
    expect(jobs[1]).toEqual({
      job_id: 'vid-fixture-0002', shot_id: 's1', lane: 'vultr', parent_job_id: 'vid-fixture-0001',
      status: 'pending', submitted_ts: expect.any(String), prompt_version: 'h3-v1',
    });

    // lineage + the repair tool on the ledger line
    const ledger = await ledgerLines('film_x');
    expect(ledger[1]).toEqual({
      ts: expect.any(String), tool: 'repair_shot', lane: 'vultr', film_id: 'film_x',
      cost_usd: 1.224, verdict: 'pending', job_id: 'vid-fixture-0002',
      artifact_path: '', estimated: true, parent_job_id: 'vid-fixture-0001',
    });
    expect(ledger[0].parent_job_id).toBeUndefined(); // the plain render line carries no lineage
  });

  it('repair restyle: plain re-render of the same shot — the plate still carries identity, lineage recorded', async () => {
    await seedShot();
    expect(isError(await rpc('render_shot', { shot_id: 's1' }))).toBe(false);

    vi.stubGlobal('fetch', scriptFetch({
      [`GET ${MODELS_URL}`]: [{ body: modelsBody }],
      [`POST ${VIDEOS_URL}`]: [{ body: JSON.stringify({ id: 'vid-fixture-0002', status: 'pending' }) }],
    }));

    const res = await rpc('repair_shot', { shot_id: 's1', parent_job_id: 'vid-fixture-0001', mode: 'restyle' });
    expect(isError(res)).toBe(false);
    expect(recordOf(res)).toMatchObject({
      job_id: 'vid-fixture-0002', parent_job_id: 'vid-fixture-0001', status: 'pending',
    });

    // the PLATE is the first frame (same as render_shot) — restyle is a plain re-render
    const body = postedBody(1);
    expect(body.frame_images[0].image_url.url).toBe(
      `data:image/png;base64,${Buffer.from(PLATE_BYTES).toString('base64')}`,
    );

    const jobs = await jobsJson('film_x');
    expect(jobs[1]).toMatchObject({ parent_job_id: 'vid-fixture-0001', shot_id: 's1', status: 'pending' });
    expect((await ledgerLines('film_x'))[1]).toMatchObject({
      tool: 'repair_shot', parent_job_id: 'vid-fixture-0001',
    });
  });

  it('unknown mode → VALIDATION naming both v1 modes (fetchNever)', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedShot();

    const res = await rpc('repair_shot', { shot_id: 's1', parent_job_id: 'vid-fixture-0001', mode: 'stretch' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/mode \\?"stretch\\?" is not a v1 repair mode/);
    expect(JSON.stringify(res)).toMatch(/extend/);
    expect(JSON.stringify(res)).toMatch(/restyle/);
    expect(calls).toHaveLength(0);
  });

  it('unknown parent_job_id → NOT_FOUND (fetchNever)', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedShot();

    const res = await rpc('repair_shot', { shot_id: 's1', parent_job_id: 'vid-ghost', mode: 'restyle' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/no such job \\?"vid-ghost\\?"/);
    expect(calls).toHaveLength(0);
  });

  it('extend without first_frame_path → VALIDATION; missing file → NOT_FOUND; restyle rejects the arg (fetchNever)', async () => {
    vi.stubGlobal('fetch', fetchNever);
    await seedShot();
    await seedJobs('film_x', [{
      job_id: 'vid-fixture-0001', shot_id: 's1', lane: 'vultr',
      status: 'completed', submitted_ts: 't', prompt_version: 'h3-v1',
    }]);

    const res = await rpc('repair_shot', { shot_id: 's1', parent_job_id: 'vid-fixture-0001', mode: 'extend' });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/first_frame_path is required for mode extend/);
    expect(calls).toHaveLength(0);

    const res2 = await rpc('repair_shot', {
      shot_id: 's1', parent_job_id: 'vid-fixture-0001', mode: 'extend', first_frame_path: 'refs/ghost.png',
    });
    expect(isError(res2)).toBe(true);
    expect(JSON.stringify(res2)).toMatch(/reference image not found: refs\/ghost\.png/);
    expect(calls).toHaveLength(0);

    const res3 = await rpc('repair_shot', {
      shot_id: 's1', parent_job_id: 'vid-fixture-0001', mode: 'restyle', first_frame_path: 'refs/final-frame.png',
    });
    expect(isError(res3)).toBe(true);
    expect(JSON.stringify(res3)).toMatch(/first_frame_path applies only to mode extend/);
    expect(calls).toHaveLength(0);
  });
});
