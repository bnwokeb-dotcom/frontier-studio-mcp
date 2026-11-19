// src/saas/api.ts — VIDUXTOOL SaaS REST API & Headless Daemon
// Built using Node native HTTP for high performance and zero dependency overhead.

import http from 'node:http';
import {
  ViduxToolEngine,
  MODEL_CATALOG,
  NICHE_TOOLKITS,
  type GenerationRequest
} from './viduxtool.js';

export function createViduxApiServer(engine?: ViduxToolEngine): http.Server {
  const vidux = engine ?? new ViduxToolEngine();

  const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    const sendJson = (statusCode: number, data: any) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data, null, 2));
    };

    const parseBody = async (): Promise<any> => {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      try {
        return body ? JSON.parse(body) : {};
      } catch {
        return {};
      }
    };

    try {
      // 1. Health & Discovery
      if (req.method === 'GET' && pathname === '/health') {
        return sendJson(200, {
          status: 'ok',
          platform: 'VIDUXTOOL SaaS Video Toolkit',
          version: '1.0.0',
          models_available: Object.keys(MODEL_CATALOG),
          niches_available: Object.keys(NICHE_TOOLKITS)
        });
      }

      // 2. Catalog: Niches
      if (req.method === 'GET' && pathname === '/api/v1/toolkits') {
        return sendJson(200, {
          total: Object.keys(NICHE_TOOLKITS).length,
          toolkits: Object.values(NICHE_TOOLKITS)
        });
      }

      // 3. Catalog: Models & Credit Pricing
      if (req.method === 'GET' && pathname === '/api/v1/models') {
        return sendJson(200, {
          credit_exchange_rate: '100 credits = $1.00 USD',
          models: Object.values(MODEL_CATALOG)
        });
      }

      // 4. User Registration & Starter Credits
      if (req.method === 'POST' && pathname === '/api/v1/users/register') {
        const body = await parseBody();
        const userId = body.user_id || `usr_${Date.now()}`;
        const email = body.email || `${userId}@viduxtool.com`;
        const tier = body.tier || 'free_starter';

        const wallet = vidux.ledger.registerUser(userId, email, tier);
        return sendJson(201, {
          message: 'User registered successfully. Starter credits granted.',
          wallet
        });
      }

      // 5. User Wallet
      if (req.method === 'GET' && pathname.startsWith('/api/v1/users/') && pathname.endsWith('/wallet')) {
        const parts = pathname.split('/');
        const userId = parts[4];
        const wallet = vidux.ledger.getWallet(userId);
        const txs = vidux.ledger.getTransactions(userId);
        return sendJson(200, { wallet, transactions: txs });
      }

      // 6. Generate Job (Pre-flight Credit Reservation)
      if (req.method === 'POST' && pathname === '/api/v1/generate') {
        const body: GenerationRequest = await parseBody();
        if (!body.user_id || !body.niche_id || !body.model_id || !body.prompt) {
          return sendJson(400, {
            error: 'Missing required fields: user_id, niche_id, model_id, prompt, duration_sec'
          });
        }
        const result = vidux.createProject({
          user_id: body.user_id,
          niche_id: body.niche_id,
          model_id: body.model_id,
          prompt: body.prompt,
          duration_sec: body.duration_sec || 5,
          aspect_ratio: body.aspect_ratio,
          webhook_url: body.webhook_url
        });
        return sendJson(202, {
          message: 'Generation job accepted and queued. Credits reserved.',
          job: result
        });
      }

      // 7. Commit Job (Reconcile Credits)
      if (req.method === 'POST' && pathname.startsWith('/api/v1/jobs/') && pathname.endsWith('/commit')) {
        const parts = pathname.split('/');
        const jobId = parts[4];
        const body = await parseBody();
        const actualDuration = body.actual_duration_sec || 5;

        const debited = vidux.ledger.commit(jobId, actualDuration);
        return sendJson(200, {
          message: 'Job completed. Actual compute credits debited.',
          job_id: jobId,
          debited_credits: debited
        });
      }

      // 8. Refund Job (Failed Render)
      if (req.method === 'POST' && pathname.startsWith('/api/v1/jobs/') && pathname.endsWith('/refund')) {
        const parts = pathname.split('/');
        const jobId = parts[4];
        const body = await parseBody();
        const reason = body.reason || 'Render failure or GPU timeout';

        vidux.ledger.refund(jobId, reason);
        return sendJson(200, {
          message: 'Job refunded. Reserved credits returned to wallet.',
          job_id: jobId,
          reason
        });
      }

      sendJson(404, { error: 'Endpoint not found' });
    } catch (err: any) {
      sendJson(err.statusCode || 500, { error: err.message || 'Internal Server Error' });
    }
  });

  return server;
}
