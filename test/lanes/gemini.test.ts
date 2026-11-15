import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GEMINI_PRICES, GeminiLane } from '../../src/lanes/gemini.js';
import { StudioError } from '../../src/errors.js';
import type { FetchLike, ImageLaneRequest } from '../../src/lanes/types.js';

// Recorded fixture: JSON bodies only — fake base64 'aGVsbG8=' ('hello'), no real images, no credentials, no network.
const fixture = (name: string) =>
  readFileSync(new URL(`../fixtures/gemini/${name}.json`, import.meta.url), 'utf8');

interface RecordedCall {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

function respondWith(status: number, body: string) {
  const calls: RecordedCall[] = [];
  const fetchFn: FetchLike = async (url, init) => {
    calls.push({ url, method: init?.method, headers: init?.headers, body: init?.body });
    return { ok: status >= 200 && status < 300, status, text: async () => body };
  };
  return { lane: new GeminiLane('test-key', fetchFn), calls };
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

const baseReq = (overrides: Partial<ImageLaneRequest> = {}): ImageLaneRequest => ({
  prompt: 'a lone lighthouse at dusk, 35mm',
  refImages: [{ data: Buffer.from('hello'), mimeType: 'image/png' }],
  aspectRatio: '16:9',
  imageSize: '1K',
  ...overrides,
});

describe('GeminiLane pricing', () => {
  it('prices 1K/2K at $0.134 and 4K at $0.24', () => {
    const { lane } = respondWith(200, fixture('success-output-image'));
    expect(GEMINI_PRICES).toEqual({ '1K': 0.134, '2K': 0.134, '4K': 0.24 });
    expect(lane.price(baseReq({ imageSize: '1K' }))).toBe(0.134);
    expect(lane.price(baseReq({ imageSize: '2K' }))).toBe(0.134);
    expect(lane.price(baseReq({ imageSize: '4K' }))).toBe(0.24);
    expect(lane.cameraVocabulary).toBe('prose');
  });
});

describe('GeminiLane.fromConfig', () => {
  it('throws AUTH naming GEMINI_API_KEY when no key is configured', () => {
    expect(() =>
      GeminiLane.fromConfig({ studioRoot: 'C:/tmp/studio', studioLive: false }),
    ).toThrow(StudioError);
    try {
      GeminiLane.fromConfig({ studioRoot: 'C:/tmp/studio', studioLive: false });
    } catch (e) {
      const err = e as StudioError;
      expect(err.code).toBe('AUTH');
      expect(err.nextAction).toMatch(/GEMINI_API_KEY/);
    }
    expect(
      GeminiLane.fromConfig({ studioRoot: 'C:/tmp/studio', geminiApiKey: 'k1', studioLive: false }),
    ).toBeInstanceOf(GeminiLane);
  });
});

describe('GeminiLane.submit', () => {
  it('posts to the Interactions endpoint with auth headers, model, response_format and base64 refs', async () => {
    const { lane, calls } = respondWith(200, fixture('success-output-image'));
    const ref = await lane.submit(baseReq());
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(GeminiLane.ENDPOINT);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers?.['x-goog-api-key']).toBe('test-key');
    expect(calls[0].headers?.['Api-Revision']).toBe('2026-05-20');
    expect(calls[0].headers?.['content-type']).toBe('application/json');
    const body = JSON.parse(calls[0].body as string);
    expect(body.model).toBe('gemini-3-pro-image');
    expect(body.response_format).toEqual({
      type: 'image',
      mime_type: 'image/png',
      aspect_ratio: '16:9',
      image_size: '1K',
    });
    expect(body.input[0]).toEqual({ type: 'text', text: 'a lone lighthouse at dusk, 35mm' });
    expect(body.input[1]).toEqual({
      type: 'image',
      mime_type: 'image/png',
      data: Buffer.from('hello').toString('base64'),
    });
    expect(body).not.toHaveProperty('previous_interaction_id');
    expect(ref.interactionId).toBe('int-fixture-output-image');
  });

  it('includes previous_interaction_id only when provided', async () => {
    const { lane, calls } = respondWith(200, fixture('success-steps'));
    const ref = await lane.submit(baseReq({ previousInteractionId: 'int-prev-42' }));
    const body = JSON.parse(calls[0].body as string);
    expect(body.previous_interaction_id).toBe('int-prev-42');
    expect(ref.interactionId).toBe('int-fixture-steps');
  });

  it('maps 401 and 403 to AUTH', async () => {
    for (const status of [401, 403]) {
      const { lane } = respondWith(status, '{"error":{"message":"API key not valid"}}');
      const err = await catchStudio(() => lane.submit(baseReq()));
      expect(err.code).toBe('AUTH');
      expect(err.message).toMatch(/Gemini rejected the API key/);
    }
  });

  it('maps 400 to VALIDATION quoting the provider error text', async () => {
    const { lane } = respondWith(400, fixture('error-400'));
    const err = await catchStudio(() => lane.submit(baseReq({ aspectRatio: '7:3' })));
    expect(err.code).toBe('VALIDATION');
    expect(err.message).toMatch(/Gemini rejected the request:/);
    expect(err.message).toMatch(/aspect_ratio/); // provider text is quoted verbatim
    expect(err.nextAction).toMatch(/aspect_ratio \/ image_size \/ reference count/);
  });

  it('maps 5xx to LANE_DOWN naming the HTTP status', async () => {
    const { lane } = respondWith(503, 'upstream connect error');
    const err = await catchStudio(() => lane.submit(baseReq()));
    expect(err.code).toBe('LANE_DOWN');
    expect(err.message).toMatch(/Gemini unreachable \(HTTP 503\)/);
  });

  it('maps a thrown fetch to LANE_DOWN', async () => {
    const lane = new GeminiLane('test-key', async () => {
      throw new Error('ECONNREFUSED');
    });
    const err = await catchStudio(() => lane.submit(baseReq()));
    expect(err.code).toBe('LANE_DOWN');
    expect(err.message).toMatch(/ECONNREFUSED/);
  });

  it('throws LANE_DOWN on a 200 body without an interaction id (unexpected response shape)', async () => {
    const { lane } = respondWith(200, JSON.stringify({ model: 'gemini-3-pro-image' }));
    const err = await catchStudio(() => lane.submit(baseReq()));
    expect(err.code).toBe('LANE_DOWN');
    expect(err.message).toMatch(/unexpected response shape/);
  });

  it('reports status as always done — images are synchronous', async () => {
    const { lane } = respondWith(200, fixture('success-output-image'));
    const ref = await lane.submit(baseReq());
    await expect(lane.status(ref)).resolves.toEqual({
      done: true,
      interactionId: 'int-fixture-output-image',
    });
  });
});

describe('GeminiLane.result', () => {
  it('reads output_image.data from the cached submit body (fixture 1)', async () => {
    const { lane } = respondWith(200, fixture('success-output-image'));
    const ref = await lane.submit(baseReq({ imageSize: '1K' }));
    const art = await lane.result(ref);
    expect(art.interactionId).toBe('int-fixture-output-image');
    expect(art.data.toString('utf8')).toBe('hello');
    expect(art.mimeType).toBe('image/png');
    expect(art.priceUsd).toBe(0.134);
  });

  it('falls back to the first model_output image block in steps[] (fixture 2)', async () => {
    const { lane } = respondWith(200, fixture('success-steps'));
    const ref = await lane.submit(baseReq({ imageSize: '4K' }));
    const art = await lane.result(ref);
    expect(art.interactionId).toBe('int-fixture-steps');
    expect(art.data.toString('utf8')).toBe('hello');
    expect(art.mimeType).toBe('image/png');
    expect(art.priceUsd).toBe(0.24);
  });

  it('throws LANE_DOWN when the cached body contains no image', async () => {
    const { lane } = respondWith(
      200,
      JSON.stringify({
        id: 'int-no-image',
        steps: [{ type: 'model_output', output: [{ type: 'text', text: 'prompt refused' }] }],
      }),
    );
    const ref = await lane.submit(baseReq());
    const err = await catchStudio(() => lane.result(ref));
    expect(err.code).toBe('LANE_DOWN');
    expect(err.message).toMatch(/no image in the Gemini response/);
  });

  it('throws NOT_FOUND for an interaction never submitted in this session', async () => {
    const lane = new GeminiLane('test-key', async () => ({
      ok: true,
      status: 200,
      text: async () => '{}',
    }));
    const err = await catchStudio(() => lane.result({ interactionId: 'int-never-seen' }));
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toMatch(/interaction not in this session/);
  });
});
