// test/server.test.ts — MCP server wiring over the real in-memory transport
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { buildServer } from '../src/server.js';
import { toMcpError } from '../src/tools/registry.js';
import {
  errValidation, errNotFound, errAuth, errBudget, errLaneDown, errJobFailed,
} from '../src/errors.js';

let root: string;
let client: Client;
let server: Awaited<ReturnType<typeof buildServer>>;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'fsm-'));
  server = buildServer({ studioRoot: root });
  // R-client-order: construct the client BEFORE connecting either end.
  client = new Client({ name: 'test', version: '0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
});
afterEach(async () => {
  await Promise.all([client.close(), server.close()]);
  await rm(root, { recursive: true, force: true });
});

function rpc(name: string, args: Record<string, unknown>) {
  return client.callTool({ name, arguments: args });
}

const isError = (res: unknown) => (res as { isError?: boolean }).isError === true;
const codeOf = (e: unknown) => (e as { code?: number }).code;

describe('MCP registry tools', () => {
  it('exposes exactly the 8 registry tools', async () => {
    const res = await client.listTools();
    expect(res.tools.map((t) => t.name).sort()).toEqual([
      'asset_register', 'film_create', 'film_set_active', 'film_show',
      'sequence_lock_geo', 'shot_create', 'shot_show', 'shot_update',
    ]);
  });

  it('film_create → film_show round trip', async () => {
    await rpc('film_create', { film_id: 'film_x', title: 'X', logline: 'Y', budget_usd: 40 });
    const res = await rpc('film_show', {});
    expect(JSON.stringify(res)).toContain('film_x');
  });

  it('shot_create without geo_block returns a VALIDATION refusal naming the fix', async () => {
    await rpc('film_create', { film_id: 'film_x', title: 'X', logline: 'Y' });
    await rpc('film_set_active', { film_id: 'film_x' });
    const res = await rpc('shot_create', { id: 'seq01-shot01', sequence: 'seq01', refs: [], camera: {}, duration_s: 10 });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/geo_block is required/);
  });

  it('film_show with no active film surfaces the NOT_FOUND refusal with its NEXT action', async () => {
    const res = await rpc('film_show', {}); // fresh studio, nothing created or set active
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/no active film set/);
    expect(JSON.stringify(res)).toMatch(/NEXT: /);
  });

  it('maps StudioError codes to MCP error codes (-32602 vs -32000), passing others through', () => {
    for (const e of [errValidation('bad', 'fix it'), errNotFound('gone', 'fix it')]) {
      const mapped = toMcpError(e);
      expect(mapped).toBeInstanceOf(McpError);
      expect(codeOf(mapped)).toBe(-32602);
      expect((mapped as McpError).message).toMatch(/NEXT: fix it/);
    }
    for (const e of [errAuth('no key', 'fix it'), errBudget('over', 'fix it'), errLaneDown('down', 'retry'), errJobFailed('dead', 'retry')]) {
      const mapped = toMcpError(e);
      expect(mapped).toBeInstanceOf(McpError);
      expect(codeOf(mapped)).toBe(-32000);
    }
    const plain = new Error('boom');
    expect(toMcpError(plain)).toBe(plain);
  });

  it('full E2E: asset_register → sequence_lock_geo → shot_create (snake_case wire) → shot_show', async () => {
    await rpc('film_create', { film_id: 'film_x', title: 'X', logline: 'Y' });
    await rpc('film_set_active', { film_id: 'film_x' });
    await rpc('asset_register', { film_id: 'film_x', kind: 'location', asset_id: 'loc_ice', descriptor: 'Frozen forest clearing under grey sky.' });
    const geo = 'ROOM: clearing. N: cliff. Camera: south side.';
    await rpc('sequence_lock_geo', { film_id: 'film_x', sequence: 'seq01', geo_block: geo });
    const created = await rpc('shot_create', {
      film_id: 'film_x', id: 'seq01-shot01', sequence: 'seq01', geo_block: geo,
      refs: [{ asset_id: 'loc_ice', role: 'location' }],
      camera: { lens: '35mm', move: 'slow push-in', reason: 'closing on the choice' },
      audio_block: { sfx: 'wind, distant ice crack', music: 'none' },
      duration_s: 10,
    });
    expect(isError(created)).toBe(false);
    expect(JSON.stringify(created)).toContain('seq01-shot01');
    const shown = await rpc('shot_show', { film_id: 'film_x', shot_id: 'seq01-shot01' });
    expect(JSON.stringify(shown)).toContain('slow push-in');
    expect(JSON.stringify(shown)).toContain('wind, distant ice crack');
  });

  it('shot_update maps snake_case patch keys and falls back to the active film', async () => {
    await rpc('film_create', { film_id: 'film_x', title: 'X', logline: 'Y' });
    await rpc('asset_register', { kind: 'location', asset_id: 'loc_ice', descriptor: 'Frozen forest clearing.' });
    await rpc('shot_create', {
      id: 'seq01-shot01', sequence: 'seq01', geo_block: 'ROOM: clearing.',
      refs: [{ asset_id: 'loc_ice', role: 'location' }],
      camera: { lens: '35mm', move: 'slow push-in', reason: 'closing on the choice' },
      duration_s: 10,
    });
    const updated = await rpc('shot_update', { shot_id: 'seq01-shot01', patch: { duration_s: 15, audio_block: { sfx: 'new wind' } } });
    expect(isError(updated)).toBe(false);
    const shown = JSON.stringify(await rpc('shot_show', { shot_id: 'seq01-shot01' }));
    expect(shown).toMatch(/durationS\\?"\s*: 15/); // \" escaped inside the stringified result
    expect(shown).toContain('new wind');
  });
});
