import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ViduxCreditLedger,
  ViduxToolEngine,
  MODEL_CATALOG,
  NICHE_TOOLKITS
} from '../../src/saas/viduxtool.js';
import { createViduxApiServer } from '../../src/saas/api.js';
import type http from 'node:http';

describe('VIDUXTOOL SaaS: Multi-Model Grid & Credit Economy', () => {
  let ledger: ViduxCreditLedger;
  let engine: ViduxToolEngine;

  beforeEach(() => {
    ledger = new ViduxCreditLedger();
    engine = new ViduxToolEngine(ledger);
  });

  it('exposes all core generative models with credit pricing', () => {
    expect(MODEL_CATALOG['omniflash-1.2']).toBeDefined();
    expect(MODEL_CATALOG['omniflash-1.2'].cost_per_second_credits).toBe(5);

    expect(MODEL_CATALOG['minimax-h3']).toBeDefined();
    expect(MODEL_CATALOG['minimax-h3'].cost_per_second_credits).toBe(6);

    expect(MODEL_CATALOG['kling-4']).toBeDefined();
    expect(MODEL_CATALOG['kling-4'].cost_per_second_credits).toBe(8);

    expect(MODEL_CATALOG['veo-2']).toBeDefined();
    expect(MODEL_CATALOG['canvas-chromium']).toBeDefined();
  });

  it('exposes all 6 upgraded niche toolkits', () => {
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

    // 10 seconds of Kling 4 = 10 * 8 = 80 credits
    const cost = ledger.reserve('usr_alice', 'job_001', 'kling-4', 10);
    expect(cost).toBe(80);

    const wallet = ledger.getWallet('usr_alice');
    expect(wallet.credit_balance).toBe(500);
    expect(wallet.reserved_credits).toBe(80);

    // Overdraft test: try to reserve 100 seconds of Kling 4 (800 credits > 420 available)
    expect(() => {
      ledger.reserve('usr_alice', 'job_002', 'kling-4', 100);
    }).toThrow(/insufficient credits/i);
  });

  it('commits actual duration spend and reconciles wallet', () => {
    ledger.registerUser('usr_bob', 'bob@test.com', 'free_starter'); // 500 credits
    ledger.reserve('usr_bob', 'job_render_01', 'minimax-h3', 10); // 10s * 6 = 60 credits reserved

    // Render completes in 10 seconds
    const debited = ledger.commit('job_render_01', 10);
    expect(debited).toBe(60);

    const wallet = ledger.getWallet('usr_bob');
    expect(wallet.credit_balance).toBe(440); // 500 - 60
    expect(wallet.reserved_credits).toBe(0);

    const txs = ledger.getTransactions('usr_bob');
    expect(txs.some((t) => t.type === 'commit' && t.amount_credits === 60)).toBe(true);
  });

  it('refunds reserved credits immediately on render failure', () => {
    ledger.registerUser('usr_charlie', 'charlie@test.com', 'free_starter');
    ledger.reserve('usr_charlie', 'job_failed_01', 'omniflash-1.2', 15); // 15s * 5 = 75 credits

    ledger.refund('job_failed_01', 'GPU cluster timeout');

    const wallet = ledger.getWallet('usr_charlie');
    expect(wallet.credit_balance).toBe(500); // untouched
    expect(wallet.reserved_credits).toBe(0); // released

    const txs = ledger.getTransactions('usr_charlie');
    expect(txs.some((t) => t.type === 'refund' && t.amount_credits === 75)).toBe(true);
  });

  it('creates full project generation requests via ViduxToolEngine', () => {
    ledger.registerUser('usr_dave', 'dave@test.com', 'free_starter');

    const job = engine.createProject({
      user_id: 'usr_dave',
      niche_id: 'ugc_ecommerce_ads',
      model_id: 'minimax-h3',
      prompt: 'Unboxing aesthetic smartwatch with titanium casing',
      duration_sec: 5,
      aspect_ratio: '9:16'
    });

    expect(job.job_id).toMatch(/^vdx_/);
    expect(job.status).toBe('queued');
    expect(job.reserved_credits).toBe(30); // 5s * 6 credits
    expect(job.aspect_ratio).toBe('9:16');
  });
});

describe('VIDUXTOOL SaaS: REST API Server', () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;

  beforeEach(async () => {
    server = createViduxApiServer();
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('responds to GET /health', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.platform).toContain('VIDUXTOOL');
    expect(data.models_available).toContain('omniflash-1.2');
  });

  it('responds to GET /api/v1/toolkits', async () => {
    const res = await fetch(`${baseUrl}/api/v1/toolkits`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(6);
    expect(data.toolkits.some((t: any) => t.id === 'ugc_ecommerce_ads')).toBe(true);
  });

  it('handles user registration and generation flow via REST', async () => {
    // 1. Register
    const regRes = await fetch(`${baseUrl}/api/v1/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'usr_rest_test', email: 'rest@viduxtool.com', tier: 'free_starter' })
    });
    expect(regRes.status).toBe(201);
    const regData = await regRes.json();
    expect(regData.wallet.credit_balance).toBe(500);

    // 2. Generate
    const genRes = await fetch(`${baseUrl}/api/v1/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'usr_rest_test',
        niche_id: 'episodic_skit_comedy',
        model_id: 'minimax-h3',
        prompt: 'Grok tries to charge phone with lightning bolt',
        duration_sec: 4,
        aspect_ratio: '9:16'
      })
    });
    expect(genRes.status).toBe(202);
    const genData = await genRes.json();
    expect(genData.job.reserved_credits).toBe(24); // 4s * 6 credits

    // 3. Commit
    const commitRes = await fetch(`${baseUrl}/api/v1/jobs/${genData.job.job_id}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actual_duration_sec: 4 })
    });
    expect(commitRes.status).toBe(200);

    // 4. Check Wallet
    const walletRes = await fetch(`${baseUrl}/api/v1/users/usr_rest_test/wallet`);
    expect(walletRes.status).toBe(200);
    const walletData = await walletRes.json();
    expect(walletData.wallet.credit_balance).toBe(476); // 500 - 24
    expect(walletData.wallet.reserved_credits).toBe(0);
  });
});
