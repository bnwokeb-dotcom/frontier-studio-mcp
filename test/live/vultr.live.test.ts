// test/live/vultr.live.test.ts — LIVE SMOKE against the real Vultr Serverless
// Inference API (MiniMax-H3 video lane).
//
// Runs ONLY when both env vars are set: STUDIO_LIVE=1 and
// VULTR_INFERENCE_API_KEY. Skipped everywhere else (CI, plain `npm test`) —
// this suite makes ONE real billed render (4s, standard quality: ≈ $0.61–0.68
// of real money at the $0.153/s estimate law) and uses the REAL VultrLane and
// the REAL money law: no fake fetch, no fixture bodies, no env stubbing. The
// temp studio root is created under the OS tmpdir and removed afterwards (the
// mp4 itself lives on Vultr for 7 days — expires_at — if it must be inspected).
//
// OBSERVED-SHAPE CHECKLIST — the mission of this smoke is to CONFIRM OR
// RE-RECORD the Task 1 fixtures (test/fixtures/vultr/*) against the live API.
// When this suite runs for real, copy what was observed into the task report:
//   1. models-list shape — is it { models: [{ id, ... }] }? (asserted + raw
//      body printed) — fixture: models-list.json
//   2. submit 202 body — does it carry `id`, and is `status` 'pending'?
//      (asserted + raw body printed) — fixture: submit-202.json; render_shot
//      prints status 'pending' hard-coded, so this is the planned bring-up
//      confirm
//   3. job payload fields — status enum, progress, expires_at, usage.cost,
//      output.{duration,width,height,has_audio} (raw terminal payload printed;
//      job_status/job_download outputs surface the parsed projection live)
//   4. usage.cost vs the 0.153 × 4 = 0.612 estimate — the reconcile delta IS
//      the pricing check (H3_ESTIMATE_USD_PER_SECOND bring-up item); the
//      ledger-sums-to-actual assertion pins the money law either way
//   5. frames data-URL acceptance — NOT observable in this smoke: it renders
//      TEXT-TO-VIDEO (no plate, no frame_images — render_shot itself is
//      plate-gated by law, so the smoke submits the lane directly through the
//      runBilledVideoSubmit money law). Data-URL acceptance stays a bring-up
//      item with the documented multipart-binary fallback.
//
// Flow: verifyModel → runBilledVideoSubmit (the render_shot money law:
// estimate → ensureBudget → submit → RESERVE → ledger(estimated) → jobs.json)
// → job_status poll loop (10s interval, 8min timeout; the refund law fires if
// the job dies) → job_download (reconcile accrual → renders/<job_id>/shot.mp4)
// → mp4 magic bytes + ledger sums to the actual charge.
//
// Output hygiene: this file prints ONLY in a deliberate live run (the raw
// observed bodies the report needs) — skipped/CI runs print nothing.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../../src/server.js';
import { VultrLane } from '../../src/lanes/vultr.js';
import { H3_ESTIMATE_USD_PER_SECOND, type VideoLaneRequest } from '../../src/lanes/video.js';
import { runBilledVideoSubmit } from '../../src/tools/billed.js';
import { H3_PROMPT_VERSION } from '../../src/tools/video.js';

const LIVE = process.env.STUDIO_LIVE === '1' && !!process.env.VULTR_INFERENCE_API_KEY;

const FILM = 'live_smoke';
const PROMPT = 'a single red apple on a white plate, studio light, static camera';
const POLL_INTERVAL_MS = 10_000;
const POLL_TIMEOUT_MS = 8 * 60_000;
const TERMINAL = ['completed', 'failed', 'cancelled', 'expired'];

interface ObservedCall {
  method: string;
  url: string;
  status: number;
  body: string;
}

let observed: ObservedCall[] = [];
let root: string;
let client: Client | undefined;
let server: Awaited<ReturnType<typeof buildServer>> | undefined;

afterEach(async () => {
  await client?.close();
  await server?.close();
  vi.unstubAllGlobals();
  if (root) await rm(root, { recursive: true, force: true });
  client = undefined;
  server = undefined;
  observed = [];
});

// Tee-passthrough observer: performs the REAL fetch and mirrors the JSON bodies
// of every /videos endpoint except /content (binary download passes through
// untouched) into `observed`. Lane behavior is identical — observation only,
// wrapped so it can never break the render.
const realFetch = globalThis.fetch;
const teeFetch: typeof fetch = async (url, init) => {
  const res = await realFetch(url, init);
  const u = String(url);
  if (u.startsWith(VultrLane.BASE_URL) && !u.endsWith('/content')) {
    try {
      observed.push({
        method: init?.method ?? 'GET',
        url: u,
        status: res.status,
        body: await res.clone().text(),
      });
    } catch {
      /* observation must never break the render */
    }
  }
  return res;
};

describe.skipIf(!LIVE)('Vultr live smoke (STUDIO_LIVE=1, real API, one billed 4s render ≈ $0.61–0.68)', () => {
  it('renders a real 4s H3 video end-to-end: reserve → poll → download → reconcile', async () => {
    vi.stubGlobal('fetch', teeFetch); // the tool lanes observe through the same tee
    root = join(tmpdir(), `fsm-vultr-live-${Date.now()}`);
    server = buildServer({ studioRoot: root });
    client = new Client({ name: 'vultr-live-smoke', version: '0' });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(a), client.connect(b)]);

    const rpcJson = async (name: string, args: Record<string, unknown>) => {
      const res = await client!.callTool({ name, arguments: args });
      expect((res as { isError?: boolean }).isError).not.toBe(true);
      return JSON.parse((res as { content: { text: string }[] }).content[0].text) as Record<string, unknown>;
    };

    // the film: $1 headroom against the 0.612 reserve (the estimate is the only
    // budget input — ensureBudget fires before any POST)
    await rpcJson('film_create', {
      film_id: FILM,
      title: 'Vultr Live Smoke',
      logline: 'One real billed 4s H3 render against the Vultr Serverless Inference API',
      budget_usd: 1,
    });

    // 1. verifyModel — the real catalog fetch (model-ID pinning: a wrong or
    //    renamed model id is refused here, never silently billed)
    const lane = new VultrLane(process.env.VULTR_INFERENCE_API_KEY!, teeFetch);
    expect(await lane.verifyModel()).toBe('minimax-h3');

    // 2. the render_shot-equivalent submit: the SAME money law
    //    (runBilledVideoSubmit), direct lane — TEXT-TO-VIDEO (no plate: the
    //    tool is plate-gated by law, and this smoke sends no frames)
    const request: VideoLaneRequest = {
      prompt: PROMPT,
      durationS: 4,
      aspectRatio: '16:9',
      quality: 'standard',
    };
    const estimate = lane.estimatePrice(request);
    expect(estimate).toBeCloseTo(H3_ESTIMATE_USD_PER_SECOND * 4, 12); // 0.612
    const sub = await runBilledVideoSubmit({
      studioRoot: root,
      filmId: FILM,
      shotId: 'live_smoke_text2video', // no stored shot — the smoke's handle id
      tool: 'render_shot', // the render_shot money law, disclosed
      lane,
      request,
      promptVersion: H3_PROMPT_VERSION,
    });
    expect(sub.estimateUsd).toBeCloseTo(estimate, 12);

    // the reserve: spentUsd carries the estimate the moment Vultr accepted
    // the job, the ledger holds the `estimated: true` submit line, jobs.json
    // holds the pending handle
    const metaAfterSubmit = JSON.parse(
      await readFile(join(root, 'films', FILM, 'film.json'), 'utf8'),
    ) as Record<string, unknown>;
    expect(metaAfterSubmit.spentUsd).toBeCloseTo(estimate, 12);
    const jobsAfterSubmit = JSON.parse(
      await readFile(join(root, 'films', FILM, 'jobs.json'), 'utf8'),
    ) as Array<Record<string, unknown>>;
    expect(jobsAfterSubmit).toHaveLength(1);
    expect(jobsAfterSubmit[0].job_id).toBe(sub.jobId);
    expect(jobsAfterSubmit[0].status).toBe('pending');
    expect(jobsAfterSubmit[0].prompt_version).toBe(H3_PROMPT_VERSION);
    const ledgerAfterSubmit = (
      await readFile(join(root, 'films', FILM, 'ledger.jsonl'), 'utf8')
    ).trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(ledgerAfterSubmit).toHaveLength(1);
    expect(ledgerAfterSubmit[0].tool).toBe('render_shot');
    expect(ledgerAfterSubmit[0].lane).toBe('vultr');
    expect(ledgerAfterSubmit[0].estimated).toBe(true);
    expect(ledgerAfterSubmit[0].cost_usd).toBeCloseTo(estimate, 12);
    expect(ledgerAfterSubmit[0].job_id).toBe(sub.jobId);

    // 3. the poll loop — job_status every 10s (jobs.json updated in place per
    //    poll; a dead status would release the reserve via the refund law)
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    const seen: string[] = [];
    let terminal: Record<string, unknown>;
    for (;;) {
      const o = await rpcJson('job_status', { job_id: sub.jobId, film_id: FILM });
      seen.push(String(o.status));
      expect(typeof o.progress).toBe('number');
      if (TERMINAL.includes(String(o.status))) {
        terminal = o;
        break;
      }
      if (Date.now() + POLL_INTERVAL_MS > deadline) {
        throw new Error(
          `poll timed out after ${POLL_TIMEOUT_MS / 60_000}min — observed: ${seen.join(' -> ')}`,
        );
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    if (String(terminal.status) !== 'completed') {
      throw new Error(
        `job ${sub.jobId} ended '${terminal.status}'` +
          (terminal.error_verbatim ? ` — provider error: ${terminal.error_verbatim}` : '') +
          ' (the refund law released the reserve — only completed jobs bill; see the ledger)',
      );
    }

    // 4. the observed submit shapes vs the Task 1 fixtures (raw bodies printed
    //    for the report; a drift fails here — that IS the re-record evidence)
    const modelsCall = observed.find((c) => c.url.endsWith('/videos/models'));
    expect(modelsCall, 'the models-list GET was not observed').toBeDefined();
    const modelsBody = JSON.parse(modelsCall!.body) as { models?: unknown };
    expect(
      Array.isArray(modelsBody.models),
      `models-list is not { models: [...] } — observed: ${modelsCall!.body}`,
    ).toBe(true);
    const shaped = (modelsBody.models as unknown[]).every(
      (m) =>
        typeof m === 'string' ||
        (m !== null && typeof m === 'object' && typeof (m as { id?: unknown }).id === 'string'),
    );
    expect(
      shaped,
      `models entries must be strings or { id } objects (fixture: { models: [{ id }] }) — observed: ${modelsCall!.body}`,
    ).toBe(true);
    console.info(`[vultr-live] GET /videos/models ${modelsCall!.status}: ${modelsCall!.body}`);

    const submitCall = observed.find((c) => c.method === 'POST' && c.url.endsWith('/videos'));
    expect(submitCall, 'the submit POST was not observed').toBeDefined();
    expect(submitCall!.status, `submit must answer 202 — observed ${submitCall!.status}`).toBe(202);
    const submitBody = JSON.parse(submitCall!.body) as Record<string, unknown>;
    expect(
      typeof submitBody.id === 'string' && submitBody.id !== '',
      `202 body must carry an id — observed: ${submitCall!.body}`,
    ).toBe(true);
    expect(
      submitBody.status,
      `202 body status should be 'pending' (fixture; drift = re-record render_shot's hard-coded output) — observed: ${submitCall!.body}`,
    ).toBe('pending');
    console.info(`[vultr-live] POST /videos ${submitCall!.status}: ${submitCall!.body}`);

    const lastPoll = [...observed].reverse().find((c) => /\/videos\/[^/]+$/.test(c.url));
    console.info(`[vultr-live] terminal job payload: ${lastPoll?.body ?? '(not captured)'}`);
    console.info(`[vultr-live] expires_in_hours: ${terminal.expires_in_hours}`);

    // 5. the download — gate → content → RECONCILE → renders/<job_id>/shot.mp4
    const dl = await rpcJson('job_download', { job_id: sub.jobId, film_id: FILM });
    expect(dl.status).toBe('completed');
    expect(typeof dl.artifact_path).toBe('string');
    const actual = dl.actual_cost_usd as number;
    expect(
      actual,
      'usage.cost must be recorded and > 0 (money truth is never silently zero)',
    ).toBeGreaterThan(0);
    console.info(
      `[vultr-live] estimate ${estimate} vs usage.cost ${actual} — reconcile delta ${Math.round((actual - estimate) * 10000) / 10000}`,
    );
    console.info(`[vultr-live] download output: ${JSON.stringify(dl)}`);

    // mp4 magic bytes on disk: 'ftyp' inside the first 12 bytes
    const bytes = await readFile(String(dl.artifact_path));
    expect(bytes.length).toBeGreaterThan(1000); // a real video, not a stub
    expect(bytes.subarray(0, 12).toString('latin1')).toContain('ftyp');

    // 6. the money law held live: a reconcile line exists iff the tool's
    //    threshold (|delta| > 0.001) said so; the ledger for this job then sums
    //    to the ACTUAL charge (estimate + reconcile delta) and spentUsd equals
    //    it. No reconcile line (sub-0.1¢ drift) → the reserve stands by design:
    //    the sum stays the estimate, never silently re-edited toward actual.
    const lines = (
      await readFile(join(root, 'films', FILM, 'ledger.jsonl'), 'utf8')
    ).trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>);
    const jobLines = lines.filter((l) => l.job_id === sub.jobId);
    expect(jobLines.length).toBeGreaterThanOrEqual(1);
    expect(jobLines[0].tool).toBe('render_shot');
    expect(jobLines[0].estimated).toBe(true);
    expect(jobLines[0].cost_usd).toBeCloseTo(estimate, 12);
    const delta = Math.round((actual - estimate) * 10000) / 10000;
    const reconcile = lines.find((l) => l.note === 'reconcile' && l.job_id === sub.jobId);
    expect(
      !!reconcile,
      `a reconcile line must exist iff |actual − estimate| > 0.001 (delta ${delta})`,
    ).toBe(Math.abs(delta) > 0.001);
    const sum = jobLines.reduce((s, l) => s + (l.cost_usd as number), 0);
    const meta = JSON.parse(
      await readFile(join(root, 'films', FILM, 'film.json'), 'utf8'),
    ) as Record<string, unknown>;
    if (reconcile) {
      expect(reconcile.tool).toBe('job_download');
      expect(reconcile.cost_usd).toBeCloseTo(delta, 4);
      expect(sum, `the ledger for this job must sum to the actual charge (${actual})`).toBeCloseTo(actual, 4);
      expect(meta.spentUsd).toBeCloseTo(actual, 4);
    } else {
      expect(sum).toBeCloseTo(estimate, 4); // sub-threshold drift is not accrued
      expect(meta.spentUsd).toBeCloseTo(estimate, 4);
    }

    // 7. jobs.json: the completed entry carries the artifact + the actual facts
    const jobs = JSON.parse(
      await readFile(join(root, 'films', FILM, 'jobs.json'), 'utf8'),
    ) as Array<Record<string, unknown>>;
    expect(jobs).toHaveLength(1);
    expect(jobs[0].job_id).toBe(sub.jobId);
    expect(jobs[0].status).toBe('completed');
    expect(jobs[0].artifact_path).toBe(dl.artifact_path);
    expect(jobs[0].actual_cost_usd).toBeCloseTo(actual, 4);
  }, 540_000); // 8min poll timeout + slack for verifyModel, submit, download
});
