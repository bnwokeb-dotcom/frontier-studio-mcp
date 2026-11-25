import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type http from 'node:http';
import {
  ViduxCreditLedger,
  ViduxToolEngine,
  MODEL_CATALOG,
  NICHE_TOOLKITS,
  type JobDispatcher,
} from '../../src/saas/viduxtool.js';
import { createViduxApiServer } from '../../src/saas/api.js';
import { StudioError } from '../../src/errors.js';
import { probeMedia } from '../../src/qa/critic.js';

describe('VIDUXTOOL SaaS: Multi-Model Grid & Credit Economy', () => {
  let ledger: ViduxCreditLedger;

  beforeEach(() => {
    ledger = new ViduxCreditLedger();
  });

  it('exposes honest MODEL_CATALOG availability and verified live pricing', () => {
    expect(MODEL_CATALOG['minimax-h3']).toBeDefined();
    expect(MODEL_CATALOG['minimax-h3'].available).toBe(true);
    expect(MODEL_CATALOG['minimax-h3'].provider).toBe('vultr_inference');
    expect(MODEL_CATALOG['minimax-h3'].cost_per_second_credits).toBe(9);
    expect(MODEL_CATALOG['minimax-h3'].aspect_ratios).toContain('21:9');

    expect(MODEL_CATALOG['ffmpeg-compositor']).toBeDefined();
    expect(MODEL_CATALOG['ffmpeg-compositor'].available).toBe(true);
    expect(MODEL_CATALOG['ffmpeg-compositor'].provider).toBe('local_ffmpeg');
    expect(MODEL_CATALOG['ffmpeg-compositor'].cost_per_second_credits).toBe(0.2);

    for (const unbackedId of ['omniflash-1.2', 'kling-4', 'veo-2', 'canvas-chromium'] as const) {
      expect(MODEL_CATALOG[unbackedId]).toBeDefined();
      expect(MODEL_CATALOG[unbackedId].available).toBe(false);
      expect(MODEL_CATALOG[unbackedId].status_note).toMatch(/adapter not implemented/i);
    }
  });

  it('exposes all 6 upgraded niche toolkits recommending backed available models', () => {
    const toolkitKeys = Object.keys(NICHE_TOOLKITS);
    expect(toolkitKeys).toContain('ugc_ecommerce_ads');
    expect(toolkitKeys).toContain('episodic_skit_comedy');
    expect(toolkitKeys).toContain('faceless_deep_dive_3d');
    expect(toolkitKeys).toContain('stream_clips_repurpose');
    expect(toolkitKeys).toContain('kinetic_motion_graphics');
    expect(toolkitKeys).toContain('hollywood_prestige_directing');

    const ugc = NICHE_TOOLKITS['ugc_ecommerce_ads'];
    expect(ugc.default_aspect_ratio).toBe('9:16');
    expect(ugc.beat_count).toBe(5);

    for (const tk of Object.values(NICHE_TOOLKITS)) {
      expect(tk.recommended_models.length).toBeGreaterThan(0);
      expect(MODEL_CATALOG[tk.recommended_models[0]].available).toBe(true);
    }
  });

  it('handles user registration and starter credit grants', () => {
    const wallet = ledger.registerUser('usr_001', 'creator@test.com', 'free_starter');
    expect(wallet.credit_balance).toBe(500);
    expect(wallet.reserved_credits).toBe(0);

    const proWallet = ledger.registerUser('usr_002', 'pro@test.com', 'creator_pro');
    expect(proWallet.credit_balance).toBe(2500);
  });

  it('reserves credits pre-flight and prevents overdrafts', () => {
    ledger.registerUser('usr_alice', 'alice@test.com', 'free_starter'); // 500 credits

    // 10 seconds of minimax-h3 = 10 * 9 = 90 credits
    const cost = ledger.reserve('usr_alice', 'job_001', 'minimax-h3', 10);
    expect(cost).toBe(90);

    const wallet = ledger.getWallet('usr_alice');
    expect(wallet.credit_balance).toBe(500);
    expect(wallet.reserved_credits).toBe(90);

    // Overdraft test: try to reserve 50 seconds of minimax-h3 (450 credits > 410 available)
    expect(() => {
      ledger.reserve('usr_alice', 'job_002', 'minimax-h3', 50);
    }).toThrow(/insufficient credits/i);
  });

  it('commits actual duration spend and reconciles wallet', () => {
    ledger.registerUser('usr_bob', 'bob@test.com', 'free_starter'); // 500 credits
    ledger.reserve('usr_bob', 'job_render_01', 'minimax-h3', 10); // 10s * 9 = 90 credits reserved

    const debited = ledger.commit('job_render_01', 10);
    expect(debited).toBe(90);

    const wallet = ledger.getWallet('usr_bob');
    expect(wallet.credit_balance).toBe(410); // 500 - 90
    expect(wallet.reserved_credits).toBe(0);

    const txs = ledger.getTransactions('usr_bob');
    expect(txs.some((t) => t.type === 'commit' && t.amount_credits === 90)).toBe(true);
  });

  it('refunds reserved credits immediately on render failure', () => {
    ledger.registerUser('usr_charlie', 'charlie@test.com', 'free_starter');
    ledger.reserve('usr_charlie', 'job_failed_01', 'minimax-h3', 10); // 90 credits

    ledger.refund('job_failed_01', 'GPU cluster timeout');

    const wallet = ledger.getWallet('usr_charlie');
    expect(wallet.credit_balance).toBe(500);
    expect(wallet.reserved_credits).toBe(0);

    const txs = ledger.getTransactions('usr_charlie');
    expect(txs.some((t) => t.type === 'refund' && t.amount_credits === 90)).toBe(true);
  });

  it('refuses unbacked models and unwired dispatchers BEFORE reserving credits', async () => {
    ledger.registerUser('usr_guard', 'guard@test.com', 'free_starter');

    const dispatchedIds: string[] = [];
    const engineWithDispatcher = new ViduxToolEngine({
      ledger,
      dispatcher: async (_req, jobId) => {
        dispatchedIds.push(jobId);
        return { status: 'rendering', provider_job_id: 'prov_123' };
      },
    });

    // Unbacked models refused before reserving credits
    for (const unbacked of ['omniflash-1.2', 'kling-4', 'veo-2', 'canvas-chromium'] as const) {
      await expect(
        engineWithDispatcher.createProject({
          user_id: 'usr_guard',
          niche_id: 'ugc_ecommerce_ads',
          model_id: unbacked,
          prompt: 'Test unbacked model refusal',
          duration_sec: 5,
        }),
      ).rejects.toThrow(/no live backend adapter/i);
    }
    expect(dispatchedIds.length).toBe(0);
    expect(ledger.getWallet('usr_guard').reserved_credits).toBe(0);

    // Engine without a wired dispatcher refuses even available models before reserving credits
    const unwiredEngine = new ViduxToolEngine(ledger);
    try {
      await unwiredEngine.createProject({
        user_id: 'usr_guard',
        niche_id: 'ugc_ecommerce_ads',
        model_id: 'minimax-h3',
        prompt: 'Should fail without dispatcher',
        duration_sec: 5,
      });
      expect.fail('Expected unwiredEngine.createProject to refuse');
    } catch (err) {
      expect(err).toBeInstanceOf(StudioError);
      expect((err as StudioError).code).toBe('VALIDATION');
      expect((err as Error).message).toMatch(/no execution dispatcher wired/i);
    }
    expect(ledger.getWallet('usr_guard').reserved_credits).toBe(0);
  });

  it('dispatches project via wired dispatcher without orphaned queued state and refunds on dispatch failure', async () => {
    ledger.registerUser('usr_dave', 'dave@test.com', 'free_starter');

    const okDispatcher: JobDispatcher = async (_req, jobId) => ({
      status: 'rendering',
      provider_job_id: `vultr_${jobId}`,
    });
    const engine = new ViduxToolEngine(ledger, okDispatcher);

    const job = await engine.createProject({
      user_id: 'usr_dave',
      niche_id: 'ugc_ecommerce_ads',
      model_id: 'minimax-h3',
      prompt: 'Unboxing aesthetic smartwatch with titanium casing',
      duration_sec: 5,
      aspect_ratio: '9:16',
    });

    expect(job.job_id).toMatch(/^vdx_/);
    expect(job.status).toBe('rendering');
    expect(job.provider_job_id).toBe(`vultr_${job.job_id}`);
    expect(job.reserved_credits).toBe(45); // 5s * 9 credits
    expect(job.aspect_ratio).toBe('9:16');
    expect(ledger.getWallet('usr_dave').reserved_credits).toBe(45);

    ledger.commit(job.job_id, 5);
    expect(ledger.getWallet('usr_dave').credit_balance).toBe(455);
    expect(ledger.getWallet('usr_dave').reserved_credits).toBe(0);

    // Dispatch error automatically refunds reserved credits
    const failingEngine = new ViduxToolEngine({
      ledger,
      dispatcher: async () => {
        throw new Error('Upstream Vultr timeout');
      },
    });
    await expect(
      failingEngine.createProject({
        user_id: 'usr_dave',
        niche_id: 'ugc_ecommerce_ads',
        model_id: 'minimax-h3',
        prompt: 'Failing job test',
        duration_sec: 4,
      }),
    ).rejects.toThrow(/Upstream Vultr timeout/);
    expect(ledger.getWallet('usr_dave').reserved_credits).toBe(0);
    expect(ledger.getWallet('usr_dave').credit_balance).toBe(455);
  });
});

describe('VIDUXTOOL SaaS: REST API Server', () => {
  let server: http.Server;
  let baseUrl: string;
  let root: string;
  let prevVultrKey: string | undefined;

  async function startServer(opts?: Parameters<typeof createViduxApiServer>[0]): Promise<void> {
    server = createViduxApiServer(opts);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  }

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fsm-vidux-api-'));
    prevVultrKey = process.env.VULTR_INFERENCE_API_KEY;
    delete process.env.VULTR_INFERENCE_API_KEY;
  });

  afterEach(async () => {
    if (prevVultrKey !== undefined) process.env.VULTR_INFERENCE_API_KEY = prevVultrKey;
    else delete process.env.VULTR_INFERENCE_API_KEY;
    if (server?.listening) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it('responds to GET /health with only available backed models', async () => {
    await startServer({ outputDir: root });
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.platform).toContain('VIDUXTOOL');
    expect(data.models_available).toEqual(['minimax-h3', 'ffmpeg-compositor']);
    expect(data.models_available).not.toContain('omniflash-1.2');
    expect(data.models_available).not.toContain('kling-4');
  });

  it('responds to GET /api/v1/toolkits', async () => {
    await startServer({ outputDir: root });
    const res = await fetch(`${baseUrl}/api/v1/toolkits`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(6);
    expect(data.toolkits.some((t: any) => t.id === 'ugc_ecommerce_ads')).toBe(true);
  });

  it('rejects unbacked model and unconfigured minimax-h3 without reserving credits, while executing real ffmpeg-compositor and wired minimax-h3', async () => {
    // 1. Default server without VULTR_INFERENCE_API_KEY
    await startServer({ outputDir: root });

    const regRes = await fetch(`${baseUrl}/api/v1/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'usr_rest_test', email: 'rest@viduxtool.com', tier: 'free_starter' }),
    });
    expect(regRes.status).toBe(201);

    // Unbacked model -> 400
    const badModelRes = await fetch(`${baseUrl}/api/v1/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'usr_rest_test',
        niche_id: 'ugc_ecommerce_ads',
        model_id: 'omniflash-1.2',
        prompt: 'Should reject unbacked model',
        duration_sec: 4,
      }),
    });
    expect(badModelRes.status).toBe(400);

    // Unconfigured Vultr key for minimax-h3 -> 401 and zero credits left reserved
    const noKeyRes = await fetch(`${baseUrl}/api/v1/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'usr_rest_test',
        niche_id: 'episodic_skit_comedy',
        model_id: 'minimax-h3',
        prompt: 'No Vultr API key configured',
        duration_sec: 4,
      }),
    });
    expect(noKeyRes.status).toBe(401);

    // Real local ffmpeg-compositor execution works out of the box!
    const ffGenRes = await fetch(`${baseUrl}/api/v1/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'usr_rest_test',
        niche_id: 'kinetic_motion_graphics',
        model_id: 'ffmpeg-compositor',
        prompt: 'Kinetic motion graphic test',
        duration_sec: 1,
        aspect_ratio: '9:16',
      }),
    });
    expect(ffGenRes.status).toBe(202);
    const ffData = await ffGenRes.json();
    expect(ffData.job.status).toBe('succeeded');
    expect(ffData.job.output_path).toMatch(/\.mp4$/);
    expect(ffData.job.reserved_credits).toBe(1); // ceil(0.2 * 1)

    const ffProbe = await probeMedia(ffData.job.output_path);
    expect(ffProbe.exists).toBe(true);
    expect(ffProbe.hasVideo).toBe(true);
    expect(ffProbe.width).toBe(1080);
    expect(ffProbe.height).toBe(1920);

    const commitFf = await fetch(`${baseUrl}/api/v1/jobs/${ffData.job.job_id}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actual_duration_sec: 1 }),
    });
    expect(commitFf.status).toBe(200);

    const walletAfterFf = await (await fetch(`${baseUrl}/api/v1/users/usr_rest_test/wallet`)).json();
    expect(walletAfterFf.wallet.credit_balance).toBe(499);
    expect(walletAfterFf.wallet.reserved_credits).toBe(0);
  }, 20_000);

  it('dispatches minimax-h3 through wired VultrLane fetch and reconciles wallet via REST', async () => {
    process.env.VULTR_INFERENCE_API_KEY = 'test-vultr-key';
    const fakeFetch = async (url: string) => {
      if (url.endsWith('/videos/models')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ models: [{ id: 'minimax-h3' }] }),
        };
      }
      if (url.endsWith('/videos')) {
        return {
          ok: true,
          status: 202,
          text: async () => JSON.stringify({ id: 'vultr_job_999', status: 'pending' }),
        };
      }
      return { ok: false, status: 404, text: async () => 'not found' };
    };

    await startServer({ outputDir: root, fetchFn: fakeFetch });

    await fetch(`${baseUrl}/api/v1/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'usr_vultr', email: 'v@viduxtool.com', tier: 'free_starter' }),
    });

    const genRes = await fetch(`${baseUrl}/api/v1/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'usr_vultr',
        niche_id: 'episodic_skit_comedy',
        model_id: 'minimax-h3',
        prompt: 'Grok tries to charge phone with lightning bolt',
        duration_sec: 4,
        aspect_ratio: '9:16',
      }),
    });
    expect(genRes.status).toBe(202);
    const genData = await genRes.json();
    expect(genData.job.status).toBe('rendering');
    expect(genData.job.provider_job_id).toBe('vultr_job_999');
    expect(genData.job.reserved_credits).toBe(36); // 4s * 9 credits

    const commitRes = await fetch(`${baseUrl}/api/v1/jobs/${genData.job.job_id}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actual_duration_sec: 4 }),
    });
    expect(commitRes.status).toBe(200);

    const walletRes = await fetch(`${baseUrl}/api/v1/users/usr_vultr/wallet`);
    const walletData = await walletRes.json();
    expect(walletData.wallet.credit_balance).toBe(464); // 500 - 36
    expect(walletData.wallet.reserved_credits).toBe(0);
  });
});
