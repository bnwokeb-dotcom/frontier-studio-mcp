import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { VertexVideoLane } from '../../src/lanes/vertex_video.js';
import { GeminiLane } from '../../src/lanes/gemini.js';
import { StudioError } from '../../src/errors.js';
import type { FetchLike } from '../../src/lanes/types.js';

describe('VertexVideoLane (GCP ADC Multi-Frame Video Lane)', () => {
  let dir: string;
  let credsPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'fsm-vertex-'));
    credsPath = join(dir, 'adc.json');
    await writeFile(
      credsPath,
      JSON.stringify({
        type: 'authorized_user',
        client_id: 'cid',
        client_secret: 'csec',
        refresh_token: 'rtok',
      }),
    );
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('throws AUTH naming GCP_PROJECT_ID or GOOGLE_APPLICATION_CREDENTIALS when missing', async () => {
    await expect(
      VertexVideoLane.fromConfig({ studioRoot: dir, vertexLocation: 'us-central1', studioLive: true }, fetch, {}),
    ).rejects.toMatchObject({ code: 'AUTH' });

    await expect(
      VertexVideoLane.fromConfig(
        { studioRoot: dir, gcpProjectId: 'p1', vertexLocation: 'us-central1', studioLive: true },
        fetch,
        { GCP_PROJECT_ID: 'p1' },
      ),
    ).rejects.toMatchObject({ code: 'AUTH' });
  });

  it('submits firstFrame + lastFrame via ADC Bearer token, polls operation, and downloads inline MP4 bytes', async () => {
    const calls: Array<{ url: string; body?: string; auth?: string }> = [];
    const fetchMock: FetchLike = async (url, init) => {
      calls.push({ url, body: init?.body, auth: init?.headers?.authorization });
      if (url.includes('oauth2.googleapis.com/token')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ access_token: 'tok-adc-123', expires_in: 3600 }),
        };
      }
      if (url.includes(':predictLongRunning')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ name: 'projects/p1/locations/us-central1/operations/op-1' }),
        };
      }
      if (url.includes(':fetchPredictOperation')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              name: 'projects/p1/locations/us-central1/operations/op-1',
              done: true,
              response: {
                videos: [{ bytesBase64Encoded: Buffer.from('fake-mp4-video-stream').toString('base64') }],
              },
            }),
        };
      }
      throw new Error(`Unexpected fetch ${url}`);
    };

    const lane = await VertexVideoLane.fromConfig(
      {
        studioRoot: dir,
        gcpProjectId: 'p1',
        googleApplicationCredentials: credsPath,
        vertexLocation: 'us-central1',
        studioLive: true,
      },
      fetchMock,
    );

    const job = await lane.submit({
      prompt: 'Warden turns slowly in 5600K shaft',
      durationS: 5,
      aspectRatio: '16:9',
      quality: 'standard',
      firstFrame: { data: Buffer.from('f1'), mimeType: 'image/png' },
      lastFrame: { data: Buffer.from('f2'), mimeType: 'image/png' },
    });

    expect(job.jobId).toContain('op-1');
    const submitCall = calls.find((c) => c.url.includes(':predictLongRunning'));
    expect(submitCall?.auth).toBe('Bearer tok-adc-123');
    const submitted = JSON.parse(submitCall!.body!);
    expect(submitted.instances[0].image.bytesBase64Encoded).toBe(Buffer.from('f1').toString('base64'));
    expect(submitted.instances[0].lastFrame.bytesBase64Encoded).toBe(Buffer.from('f2').toString('base64'));

    const st = await lane.status(job);
    expect(st.status).toBe('completed');
    const art = await lane.result(job);
    expect(art.data.toString('utf8')).toBe('fake-mp4-video-stream');
  });

  it('GeminiLane.fromConfigOrAdc falls back to GOOGLE_APPLICATION_CREDENTIALS cleanly', async () => {
    const fetchMock: FetchLike = async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ access_token: 'adc-img-tok', expires_in: 3600 }),
    });
    const lane = await GeminiLane.fromConfigOrAdc(
      { studioRoot: dir, googleApplicationCredentials: credsPath, vertexLocation: 'us-central1', studioLive: true },
      fetchMock,
    );
    expect(lane).toBeInstanceOf(GeminiLane);

    await expect(
      GeminiLane.fromConfigOrAdc({ studioRoot: dir, vertexLocation: 'us-central1', studioLive: true }, fetchMock, {}),
    ).rejects.toBeInstanceOf(StudioError);
  });
});
