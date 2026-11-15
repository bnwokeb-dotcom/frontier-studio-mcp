// test/live/gemini.live.test.ts — LIVE SMOKE against the real Gemini Interactions API.
//
// Runs ONLY when both env vars are set: STUDIO_LIVE=1 and GEMINI_API_KEY.
// Skipped everywhere else (CI, plain `npm test`) — this suite makes one real
// billed call (~$0.134) and uses the REAL GeminiLane: no fake fetch, no
// fixture bodies, no env stubbing. The temp studio root is created under the
// OS tmpdir and removed afterwards.
//
// Spec §12.3 verification note: if the live response shape differs from the
// recorded fixtures (e.g. steps-only output, a different id field), EXTEND the
// result() parser in src/lanes/gemini.ts to accept it — the fixtures stay
// authoritative for the contract tests. Report what the live shape was in the
// task report so the fixtures can be re-recorded deliberately.
import { describe, it, expect, afterEach } from 'vitest';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../../src/server.js';

const LIVE = process.env.STUDIO_LIVE === '1' && !!process.env.GEMINI_API_KEY;

// One billed 1K take at the fixed price law.
const PROMPT = 'a single red apple on a white plate, studio light';
const PRICE_1K = 0.134;

let root: string;
let client: Client | undefined;
let server: Awaited<ReturnType<typeof buildServer>> | undefined;

afterEach(async () => {
  await client?.close();
  await server?.close();
  if (root) await rm(root, { recursive: true, force: true });
  client = undefined;
  server = undefined;
});

describe.skipIf(!LIVE)('Gemini live smoke (STUDIO_LIVE=1, real API, one billed call)', () => {
  it('generates a real PNG, ledgers $0.134 and accrues it on film.json', async () => {
    root = join(tmpdir(), `fsm-live-${Date.now()}`);
    server = buildServer({ studioRoot: root });
    client = new Client({ name: 'live-smoke', version: '0' });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(a), client.connect(b)]);

    const rpc = (name: string, args: Record<string, unknown>) =>
      client!.callTool({ name, arguments: args });

    // seed a film with enough headroom for exactly this take
    await rpc('film_create', {
      film_id: 'live_smoke',
      title: 'Live Smoke',
      logline: 'One real billed generation against the Gemini Interactions API',
      budget_usd: 1,
    });
    await rpc('film_set_active', { film_id: 'live_smoke' });

    // the one real generate — 1K, 16:9, explicit for self-documentation
    const res = await rpc('image_generate', {
      prompt: PROMPT,
      aspect_ratio: '16:9',
      image_size: '1K',
    });
    expect((res as { isError?: boolean }).isError).not.toBe(true);

    const text = (res as { content: { text: string }[] }).content[0].text;
    const o = JSON.parse(text) as Record<string, unknown>;

    // output shape: the snake_case law holds live too
    expect(Object.keys(o).sort()).toEqual([
      'artifact_path', 'aspect_ratio', 'cost_usd', 'image_size', 'interaction_id',
    ]);
    expect(o.cost_usd).toBe(PRICE_1K);
    expect(o.image_size).toBe('1K');
    expect(o.aspect_ratio).toBe('16:9');
    expect(typeof o.interaction_id).toBe('string');
    expect(o.interaction_id).not.toBe(''); // a real provider id, not the fixture's

    // PNG magic bytes on disk: \x89 P N G
    const bytes = await readFile(String(o.artifact_path));
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(bytes.length).toBeGreaterThan(1000); // a real image, not a stub

    // one ledger line for the take, Task 3 shape
    const raw = await readFile(join(root, 'films', 'live_smoke', 'ledger.jsonl'), 'utf8');
    const lines = raw.trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(lines).toHaveLength(1);
    expect(lines[0].tool).toBe('image_generate');
    expect(lines[0].lane).toBe('gemini');
    expect(lines[0].film_id).toBe('live_smoke');
    expect(lines[0].cost_usd).toBe(PRICE_1K);
    expect(lines[0].interaction_id).toBe(o.interaction_id);
    expect(lines[0].artifact_path).toBe(o.artifact_path);

    // spend accrued on the film
    const meta = JSON.parse(
      await readFile(join(root, 'films', 'live_smoke', 'film.json'), 'utf8'),
    ) as Record<string, unknown>;
    expect(meta.spentUsd).toBeCloseTo(PRICE_1K, 12);
  }, 180_000); // real generation can take up to a few minutes
});
