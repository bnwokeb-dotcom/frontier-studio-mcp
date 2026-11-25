import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  H3_ESTIMATE_USD_PER_SECOND,
  H3_REAL_LENGTHS,
  VULTR_PRICING_PER_SECOND,
  type VideoLaneRequest,
} from '../../src/lanes/video.js';
import { VultrLane } from '../../src/lanes/vultr.js';
import { StudioError } from '../../src/errors.js';
import type { FetchLike } from '../../src/lanes/types.js';

// Recorded fixtures: JSON bodies + fake mp4 bytes ('VULTRFAKE') — fake ids,
// no real video, no credentials, no network.
const fixture = (name: string) =>
  readFileSync(new URL(`../fixtures/vultr/${name}.json`, import.meta.url), 'utf8');
const videoBytes = () =>
  Buffer.from(
    readFileSync(new URL('../fixtures/vultr/video.mp4.txt', import.meta.url), 'utf8'),
    'utf8',
  );

interface RecordedCall {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

interface ScriptedResponse {
  status: number;
  body?: string;
  bytes?: Buffer;
  throws?: Error; // fetch itself rejects (network down)
  textThrows?: Error; // response resolves but body read fails
}

const MODELS_URL = `${VultrLane.BASE_URL}/videos/models`;
const VIDEOS_URL = `${VultrLane.BASE_URL}/videos`;
const jobUrl = (id: string) => `${VIDEOS_URL}/${id}`;
const contentUrl = (id: string) => `${VIDEOS_URL}/${id}/content`;

/** Queue-based fake fetch: scripted per METHOD+URL, responses consumed in order. */
function laneWith() {
  const calls: RecordedCall[] = [];
  const queue = new Map<string, ScriptedResponse[]>();
  const enqueue = (method: string, url: string, ...resps: ScriptedResponse[]) => {
    const key = `${method} ${url}`;
    queue.set(key, [...(queue.get(key) ?? []), ...resps]);
  };
  const fetchFn: FetchLike = async (url, init) => {
    const method = init?.method ?? 'GET';
    calls.push({ url, method, headers: init?.headers, body: init?.body });
    const next = queue.get(`${method} ${url}`)?.shift();
    if (!next) throw new Error(`unexpected ${method} ${url} — no scripted response`);
    if (next.throws) throw next.throws;
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      text: async () => {
        if (next.textThrows) throw next.textThrows;
        return next.body ?? '';
      },
      arrayBuffer: async () =>
        next.bytes ? new Uint8Array(next.bytes).buffer : new ArrayBuffer(0),
    };
  };
  return { lane: new VultrLane('test-key', fetchFn), calls, enqueue };
}

async function catchStudio(fn: () => Promise<unknown>): Promise<StudioError> {
  try {
    await fn();
  } catch (e) {
    expect(e).toBeInstanceOf(StudioError);
    return e as StudioError;
  }
  throw new Error('expected a StudioError but nothing was thrown');
}

const baseReq = (overrides: Partial<VideoLaneRequest> = {}): VideoLaneRequest => ({
  prompt: 'a lone lighthouse at dusk, waves breaking, static camera',
  durationS: 8,
  aspectRatio: '16:9',
  quality: 'standard',
  ...overrides,
});

// Submit needs the catalog check first (model-ID pinning) — convenience pair.
const submitScript = (enqueue: ReturnType<typeof laneWith>['enqueue']) => {
  enqueue('GET', MODELS_URL, { status: 200, body: fixture('models-list') });
  enqueue('POST', VIDEOS_URL, { status: 202, body: fixture('submit-202') });
};

const posted = (calls: RecordedCall[]) => calls.find((c) => c.method === 'POST');

describe('VultrLane pricing + H3 constants', () => {
  it('quotes H3_ESTIMATE_USD_PER_SECOND × durationS for standard ($0.09/s) with clean 4-decimal rounding', () => {
    const { lane } = laneWith();
    expect(H3_ESTIMATE_USD_PER_SECOND).toBe(0.09);
    expect(VULTR_PRICING_PER_SECOND).toEqual({
      turbo: 0.06,
      standard: 0.09,
      max: 0.18,
      '2K': 0.18,
      '4K': 0.18,
      ultra: 0.30,
    });
    expect(lane.estimatePrice(baseReq({ durationS: 4 }))).toBe(0.36);
    expect(lane.estimatePrice(baseReq({ durationS: 6 }))).toBe(0.54);
    expect(lane.estimatePrice(baseReq({ durationS: 8 }))).toBe(0.72);
    expect(lane.estimatePrice(baseReq({ durationS: 15 }))).toBe(1.35);
    expect(lane.cameraVocabulary).toBe('named');
  });

  it('quotes per-quality Vultr live pricing tiers across turbo, standard, max, 2K, 4K, and ultra', () => {
    const { lane } = laneWith();
    expect(lane.estimatePrice(baseReq({ quality: 'turbo', durationS: 10 }))).toBe(0.6);
    expect(lane.estimatePrice(baseReq({ quality: 'standard', durationS: 10 }))).toBe(0.9);
    expect(lane.estimatePrice(baseReq({ quality: 'max', durationS: 10 }))).toBe(1.8);
    expect(lane.estimatePrice(baseReq({ quality: '2K', durationS: 8 }))).toBe(1.44);
    expect(lane.estimatePrice(baseReq({ quality: '4K', durationS: 15 }))).toBe(2.7);
    expect(lane.estimatePrice(baseReq({ quality: 'ultra', durationS: 5 }))).toBe(1.5);
  });

  it('carries the H3 real-lengths table (whole 24fps blocks run long)', () => {
    expect(Object.keys(H3_REAL_LENGTHS)).toHaveLength(12);
    expect(Object.keys(H3_REAL_LENGTHS).map(Number).sort((a, b) => a - b)).toEqual([
      4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    expect(H3_REAL_LENGTHS[4]).toBe(4.46);
    expect(H3_REAL_LENGTHS[6]).toBe(6.58);
    expect(H3_REAL_LENGTHS[8]).toBe(8.0);
    expect(H3_REAL_LENGTHS[12]).toBe(12.25);
    expect(H3_REAL_LENGTHS[15]).toBe(15.08);
  });
});

describe('VultrLane.fromConfig', () => {
  it('throws AUTH naming VULTR_INFERENCE_API_KEY when no key is configured', () => {
    expect(() =>
      VultrLane.fromConfig({ studioRoot: 'C:/tmp/studio', studioLive: false }),
    ).toThrow(StudioError);
    try {
      VultrLane.fromConfig({ studioRoot: 'C:/tmp/studio', studioLive: false });
    } catch (e) {
      const err = e as StudioError;
      expect(err.code).toBe('AUTH');
      expect(err.nextAction).toMatch(/VULTR_INFERENCE_API_KEY/);
    }
    expect(
      VultrLane.fromConfig({ studioRoot: 'C:/tmp/studio', vultrApiKey: 'vk', studioLive: false }),
    ).toBeInstanceOf(VultrLane);
  });
});

describe('VultrLane.verifyModel', () => {
  it('finds minimax-h3 in the catalog and caches per process (one fetch)', async () => {
    const { lane, calls, enqueue } = laneWith();
    enqueue('GET', MODELS_URL, { status: 200, body: fixture('models-list') });
    await expect(lane.verifyModel()).resolves.toBe('minimax-h3');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(MODELS_URL);
    expect(calls[0].headers?.Authorization).toBe('Bearer test-key');
    await expect(lane.verifyModel()).resolves.toBe('minimax-h3');
    expect(calls).toHaveLength(1); // cache hit — no second fetch
  });

  it('throws LANE_DOWN naming the check when minimax-h3 is absent', async () => {
    const { lane, enqueue } = laneWith();
    enqueue('GET', MODELS_URL, {
      status: 200,
      body: JSON.stringify({ models: [{ id: 'minimax-h2' }] }),
    });
    const err = await catchStudio(() => lane.verifyModel());
    expect(err.code).toBe('LANE_DOWN');
    expect(err.message).toMatch(/model minimax-h3 not in Vultr catalog/);
    expect(err.nextAction).toBe('check GET /v1/videos/models');
  });
});

describe('VultrLane.submit', () => {
  it('verifies the catalog, then POSTs the documented body (model/prompt/duration/aspect_ratio/quality/generate_audio)', async () => {
    const { lane, calls, enqueue } = laneWith();
    submitScript(enqueue);
    const ref = await lane.submit(baseReq());
    expect(calls[0]).toMatchObject({ method: 'GET', url: MODELS_URL });
    expect(calls[1].url).toBe(VIDEOS_URL);
    expect(calls[1].method).toBe('POST');
    expect(calls[1].headers?.Authorization).toBe('Bearer test-key');
    expect(calls[1].headers?.['content-type']).toBe('application/json');
    const body = JSON.parse(calls[1].body as string);
    expect(body).toEqual({
      model: 'minimax-h3',
      prompt: 'a lone lighthouse at dusk, waves breaking, static camera',
      duration: 8,
      aspect_ratio: '16:9',
      quality: 'standard',
      generate_audio: true,
    });
    expect(ref.jobId).toBe('vid-fixture-0001'); // 202 → { id, status pending }
  });

  it('forwards 21:9 aspect_ratio and 4K quality cleanly while preserving { frame_type, type, image_url }', async () => {
    const { lane, calls, enqueue } = laneWith();
    submitScript(enqueue);
    const plate = Buffer.from('plate-21-9');
    await lane.submit(baseReq({
      aspectRatio: '21:9',
      quality: '4K',
      durationS: 6,
      firstFrame: { data: plate, mimeType: 'image/png' },
    }));
    const body = JSON.parse(posted(calls)?.body as string);
    expect(body.aspect_ratio).toBe('21:9');
    expect(body.quality).toBe('4K');
    expect(body.duration).toBe(6);
    expect(body.frame_images).toEqual([
      {
        frame_type: 'first_frame',
        type: 'first_frame',
        image_url: { url: `data:image/png;base64,${plate.toString('base64')}` },
      },
    ]);
  });

  it('sends a provided firstFrame as one first_frame data-URL entry', async () => {
    const { lane, calls, enqueue } = laneWith();
    submitScript(enqueue);
    const plate = Buffer.from('plate-bytes');
    await lane.submit(baseReq({ firstFrame: { data: plate, mimeType: 'image/png' } }));
    const body = JSON.parse(posted(calls)?.body as string);
    expect(body.frame_images).toEqual([
      {
        frame_type: 'first_frame',
        type: 'first_frame',
        image_url: { url: `data:image/png;base64,${plate.toString('base64')}` },
      },
    ]);
  });

  it('sends lastFrame alone as one last_frame data-URL entry', async () => {
    const { lane, calls, enqueue } = laneWith();
    submitScript(enqueue);
    const tail = Buffer.from('tail-bytes');
    await lane.submit(baseReq({ lastFrame: { data: tail, mimeType: 'image/jpeg' } }));
    const body = JSON.parse(posted(calls)?.body as string);
    expect(body.frame_images).toEqual([
      {
        frame_type: 'last_frame',
        type: 'last_frame',
        image_url: { url: `data:image/jpeg;base64,${tail.toString('base64')}` },
      },
    ]);
  });

  it('refuses firstFrame AND lastFrame together before any fetch (v1 sends only firstFrame)', async () => {
    const { lane, calls } = laneWith();
    const err = await catchStudio(() =>
      lane.submit(
        baseReq({
          firstFrame: { data: Buffer.from('a'), mimeType: 'image/png' },
          lastFrame: { data: Buffer.from('b'), mimeType: 'image/png' },
        }),
      ),
    );
    expect(err.code).toBe('VALIDATION');
    expect(err.message).toMatch(/only firstFrame/);
    expect(err.message).toMatch(/frames XOR references/);
    expect(calls).toHaveLength(0); // refusal precedes even the catalog check
  });

  it('enforces the 8000-char composer cap before any fetch and allows exactly 8000', async () => {
    const { lane, calls, enqueue } = laneWith();
    const err = await catchStudio(() =>
      lane.submit(baseReq({ prompt: 'x'.repeat(8001) })),
    );
    expect(err.code).toBe('VALIDATION');
    expect(err.message).toMatch(/8000/);
    expect(err.nextAction).toMatch(/shorten the action text, never the descriptors/);
    expect(calls).toHaveLength(0);
    submitScript(enqueue);
    await lane.submit(baseReq({ prompt: 'y'.repeat(8000) })); // boundary is legal
    expect(posted(calls)).toBeDefined();
  });

  it('refuses to POST when the catalog lacks minimax-h3 (never silently billed against a fallback)', async () => {
    const { lane, calls, enqueue } = laneWith();
    enqueue('GET', MODELS_URL, {
      status: 200,
      body: JSON.stringify({ models: [{ id: 'minimax-h2' }] }),
    });
    const err = await catchStudio(() => lane.submit(baseReq()));
    expect(err.code).toBe('LANE_DOWN');
    expect(err.message).toMatch(/minimax-h3 not in Vultr catalog/);
    expect(posted(calls)).toBeUndefined();
  });

  it('throws LANE_DOWN on a 202 body without an id or malformed JSON (unexpected response shape)', async () => {
    const { lane, enqueue } = laneWith();
    enqueue('GET', MODELS_URL, { status: 200, body: fixture('models-list') });
    enqueue('POST', VIDEOS_URL, { status: 202, body: JSON.stringify({ status: 'pending' }) });
    const err = await catchStudio(() => lane.submit(baseReq()));
    expect(err.code).toBe('LANE_DOWN');
    expect(err.message).toMatch(/unexpected response shape/);

    const second = laneWith();
    second.enqueue('GET', MODELS_URL, { status: 200, body: fixture('models-list') });
    second.enqueue('POST', VIDEOS_URL, { status: 202, body: 'not-json' });
    const err2 = await catchStudio(() => second.lane.submit(baseReq()));
    expect(err2.code).toBe('LANE_DOWN');
    expect(err2.message).toMatch(/malformed JSON/);
  });
});

describe('VultrLane.status', () => {
  it('maps all six provider statuses with progress (and the failed error verbatim)', async () => {
    const failed = JSON.parse(fixture('job-failed'));
    const cases: Array<{ body: unknown; status: string; progress: number; error?: string }> = [
      { body: { status: 'pending', progress: 0 }, status: 'pending', progress: 0 },
      { body: fixture('job-in-progress'), status: 'in_progress', progress: 45 },
      { body: fixture('job-completed'), status: 'completed', progress: 100 },
      {
        body: fixture('job-failed'),
        status: 'failed',
        progress: 30,
        error: failed.error,
      },
      { body: { status: 'cancelled' }, status: 'cancelled', progress: 0 },
      { body: { status: 'expired' }, status: 'expired', progress: 0 },
    ];
    for (const tc of cases) {
      const { lane, enqueue } = laneWith();
      enqueue('GET', jobUrl('vid-fixture-0001'), {
        status: 200,
        body: typeof tc.body === 'string' ? (tc.body as string) : JSON.stringify(tc.body),
      });
      const st = await lane.status({ jobId: 'vid-fixture-0001' });
      expect(st.status).toBe(tc.status);
      expect(st.progress).toBe(tc.progress);
      if (tc.error) expect(st.errorVerbatim).toBe(tc.error);
      else expect(st.errorVerbatim).toBeUndefined();
    }
  });

  it('throws LANE_DOWN on a status outside the documented enum (contract drift)', async () => {
    const { lane, enqueue } = laneWith();
    enqueue('GET', jobUrl('vid-fixture-0001'), {
      status: 200,
      body: JSON.stringify({ status: 'processing_forever' }),
    });
    const err = await catchStudio(() => lane.status({ jobId: 'vid-fixture-0001' }));
    expect(err.code).toBe('LANE_DOWN');
    expect(err.message).toMatch(/unexpected response shape/);
  });
});

describe('VultrLane.result', () => {
  it('polls a cold job, gates on completed, downloads content and surfaces usage.cost + output facts', async () => {
    const { lane, calls, enqueue } = laneWith();
    submitScript(enqueue);
    enqueue('GET', jobUrl('vid-fixture-0001'), { status: 200, body: fixture('job-completed') });
    enqueue('GET', contentUrl('vid-fixture-0001'), { status: 200, bytes: videoBytes() });
    const ref = await lane.submit(baseReq());
    const art = await lane.result(ref);
    expect(art.data.toString('utf8')).toBe('VULTRFAKE');
    expect(art.jobId).toBe('vid-fixture-0001');
    expect(art.costUsd).toBe(1.36); // usage.cost, never the estimate
    expect(art.realSeconds).toBe(8.0); // H3_REAL_LENGTHS[8]
    expect(art.width).toBe(1366);
    expect(art.height).toBe(768);
    expect(art.hasAudio).toBe(true);
    const content = calls.find((c) => c.method === 'GET' && c.url === contentUrl('vid-fixture-0001'));
    expect(content?.headers?.Authorization).toBe('Bearer test-key');
  });

  it('refuses content before completion with VALIDATION naming the current status', async () => {
    const { lane, enqueue } = laneWith();
    submitScript(enqueue);
    enqueue('GET', jobUrl('vid-fixture-0001'), { status: 200, body: fixture('job-in-progress') });
    const ref = await lane.submit(baseReq());
    const err = await catchStudio(() => lane.result(ref));
    expect(err.code).toBe('VALIDATION');
    expect(err.message).toMatch(/in_progress/);
  });

  it('throws JOB_FAILED with the provider error verbatim and the bill-$0 note', async () => {
    const { lane, enqueue } = laneWith();
    submitScript(enqueue);
    enqueue('GET', jobUrl('vid-fixture-0001'), { status: 200, body: fixture('job-failed') });
    const ref = await lane.submit(baseReq());
    const err = await catchStudio(() => lane.result(ref));
    expect(err.code).toBe('JOB_FAILED');
    expect(err.message).toMatch(/content policy violation: prompt rejected by the safety filter/);
    expect(err.nextAction).toMatch(/inspect jobs\.json; failed jobs bill \$0/);
  });

  it('reuses a cached completed payload (no second job GET before the download)', async () => {
    const { lane, calls, enqueue } = laneWith();
    submitScript(enqueue);
    enqueue('GET', jobUrl('vid-fixture-0001'), { status: 200, body: fixture('job-completed') });
    enqueue('GET', contentUrl('vid-fixture-0001'), { status: 200, bytes: videoBytes() });
    const ref = await lane.submit(baseReq());
    await lane.status(ref); // poll #1 — the tool layer's gate
    await lane.result(ref); // cache hit — no job GET #2
    const jobGets = calls.filter((c) => c.method === 'GET' && c.url === jobUrl('vid-fixture-0001'));
    expect(jobGets).toHaveLength(1);
  });

  it('throws LANE_DOWN when a completed payload has no usage.cost (money truth never silently zero)', async () => {
    const { lane, enqueue } = laneWith();
    submitScript(enqueue);
    enqueue('GET', jobUrl('vid-fixture-0001'), {
      status: 200,
      body: JSON.stringify({
        id: 'vid-fixture-0001',
        status: 'completed',
        progress: 100,
        output: { duration: 8.0 },
      }),
    });
    enqueue('GET', contentUrl('vid-fixture-0001'), { status: 200, bytes: videoBytes() });
    const ref = await lane.submit(baseReq());
    const err = await catchStudio(() => lane.result(ref));
    expect(err.code).toBe('LANE_DOWN');
    expect(err.message).toMatch(/usage\.cost/);
  });
});

describe('VultrLane error map', () => {
  it('maps 401 and 403 to AUTH', async () => {
    for (const status of [401, 403]) {
      const { lane, enqueue } = laneWith();
      enqueue('GET', MODELS_URL, { status: 200, body: fixture('models-list') });
      enqueue('POST', VIDEOS_URL, {
        status,
        body: JSON.stringify({ error: { message: 'invalid api key' } }),
      });
      const err = await catchStudio(() => lane.submit(baseReq()));
      expect(err.code).toBe('AUTH');
      expect(err.message).toMatch(/Vultr rejected the API key/);
    }
  });

  it('maps 400 to VALIDATION quoting the provider text and naming the composer law', async () => {
    const { lane, enqueue } = laneWith();
    enqueue('GET', MODELS_URL, { status: 200, body: fixture('models-list') });
    enqueue('POST', VIDEOS_URL, {
      status: 400,
      body: JSON.stringify({
        error: { message: 'prompt exceeds the maximum length of 8000 characters' },
      }),
    });
    const err = await catchStudio(() => lane.submit(baseReq()));
    expect(err.code).toBe('VALIDATION');
    expect(err.message).toMatch(/Vultr rejected the submit request:/);
    expect(err.message).toMatch(/prompt exceeds the maximum length of 8000 characters/);
    expect(err.nextAction).toMatch(/shorten the action text, never the descriptors/);
  });

  it('maps 5xx to LANE_DOWN naming the HTTP status', async () => {
    const { lane, enqueue } = laneWith();
    enqueue('GET', MODELS_URL, { status: 200, body: fixture('models-list') });
    enqueue('POST', VIDEOS_URL, { status: 503, body: 'upstream connect error' });
    const err = await catchStudio(() => lane.submit(baseReq()));
    expect(err.code).toBe('LANE_DOWN');
    expect(err.message).toMatch(/Vultr unreachable \(HTTP 503\)/);
  });

  it('maps a thrown fetch and a body-read failure to LANE_DOWN, not raw errors', async () => {
    const { lane, enqueue } = laneWith();
    enqueue('GET', MODELS_URL, { status: 200, body: fixture('models-list') });
    enqueue('POST', VIDEOS_URL, { status: 202, throws: new Error('ECONNREFUSED') });
    const err = await catchStudio(() => lane.submit(baseReq()));
    expect(err.code).toBe('LANE_DOWN');
    expect(err.message).toMatch(/ECONNREFUSED/);

    const second = laneWith();
    second.enqueue('GET', MODELS_URL, { status: 200, body: fixture('models-list') });
    second.enqueue('POST', VIDEOS_URL, {
      status: 202,
      body: fixture('submit-202'),
      textThrows: new Error('socket hang up'),
    });
    const err2 = await catchStudio(() => second.lane.submit(baseReq()));
    expect(err2.code).toBe('LANE_DOWN');
    expect(err2.message).toMatch(/socket hang up/);
  });
});
