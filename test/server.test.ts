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
  it('exposes all 34 production tools across all studio lanes', async () => {
    const res = await client.listTools();
    expect(res.tools.map((t) => t.name).sort()).toEqual([
      'acoustic_match', 'asset_image', 'asset_register', 'bridge_job_result', 'bridge_status',
      'character_sheet_build', 'dialogue_import', 'dialogue_render', 'film_assemble', 'film_create',
      'film_export_xml', 'film_grade', 'film_set_active', 'film_show', 'flow_prompt_plate',
      'flow_prompt_sheet', 'image_generate', 'job_download', 'job_status', 'keyframe_build',
      'qc_vision_audit', 'render_shot', 'repair_shot', 'score_arrange_dynamic', 'sequence_lock_geo',
      'shot_continuity_plan', 'shot_create', 'shot_lipsync', 'shot_show', 'shot_update',
      'soundscape_build', 'staging_build', 'storyboard_build', 'studio_prompt_dialogue',
    ]);
  });

  it('exposes MCP directorial prompts for AI agents (Claude, ChatGPT)', async () => {
    const res = await client.listPrompts();
    const promptNames = res.prompts.map((p) => p.name).sort();
    expect(promptNames).toEqual([
      'cinematographer_shot_designer',
      'commercial_ad_architect',
      'director_breakdown',
      'skit_director_architect',
      'soundstage_master',
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

  it('shot_create without action returns the schema-v2 refusal (the [Shot N] block needs the beat)', async () => {
    await rpc('film_create', { film_id: 'film_x', title: 'X', logline: 'Y' });
    await rpc('film_set_active', { film_id: 'film_x' });
    await rpc('asset_register', { kind: 'location', asset_id: 'loc_ice', descriptor: 'Frozen forest clearing.' });
    const res = await rpc('shot_create', {
      id: 'seq01-shot01', sequence: 'seq01', geo_block: 'ROOM: clearing.',
      refs: [{ asset_id: 'loc_ice', role: 'location' }],
      camera: { lens: '35mm', move: 'slow push-in', reason: 'closing on the choice' },
      duration_s: 10,
    });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/action is required/);
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
      action: 'Mara stops at the treeline, breath fogging. She looks back once.',
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
    expect(JSON.stringify(shown)).toContain('She looks back once.');
  });

  it('shot_update maps snake_case patch keys and falls back to the active film', async () => {
    await rpc('film_create', { film_id: 'film_x', title: 'X', logline: 'Y' });
    await rpc('asset_register', { kind: 'location', asset_id: 'loc_ice', descriptor: 'Frozen forest clearing.' });
    await rpc('shot_create', {
      id: 'seq01-shot01', sequence: 'seq01', geo_block: 'ROOM: clearing.',
      action: 'Mara stops at the treeline, breath fogging. She looks back once.',
      refs: [{ asset_id: 'loc_ice', role: 'location' }],
      camera: { lens: '35mm', move: 'slow push-in', reason: 'closing on the choice' },
      duration_s: 10,
    });
    const updated = await rpc('shot_update', { shot_id: 'seq01-shot01', patch: { duration_s: 15, audio_block: { sfx: 'new wind' } } });
    expect(isError(updated)).toBe(false);
    const shown = JSON.stringify(await rpc('shot_show', { shot_id: 'seq01-shot01' }));
    expect(shown).toMatch(/duration_s\\?"\s*: 15/); // \" escaped inside the stringified result
    expect(shown).toContain('new wind');
  });

  it('wire round trip: outputs are snake_case and echo back verbatim into shot_update', async () => {
    await rpc('film_create', { film_id: 'film_x', title: 'X', logline: 'Y', budget_usd: 40, target_runtime_min: 90 });
    const film = recordOf(await rpc('film_show', {}));
    expect(Object.keys(film)).toEqual(expect.arrayContaining(['film_id', 'budget_usd', 'target_runtime_min']));
    expect(film.film_id).toBe('film_x');

    await rpc('asset_register', { kind: 'location', asset_id: 'loc_ice', descriptor: 'Frozen forest clearing.' });
    await rpc('shot_create', {
      id: 'seq01-shot01', sequence: 'seq01', geo_block: 'ROOM: clearing.',
      action: 'Mara stops at the treeline, breath fogging. She looks back once.',
      refs: [{ asset_id: 'loc_ice', role: 'location' }],
      camera: { lens: '35mm', move: 'slow push-in', reason: 'closing on the choice' },
      audio_block: { dialogue: [{ voice_ref: 'char_mara', line: 'hold the line' }], sfx: 'wind', music: 'none' },
      duration_s: 10,
    });

    const shown = recordOf(await rpc('shot_show', { shot_id: 'seq01-shot01' }));
    // every output key is snake_case — a client can echo them straight back
    expect(Object.keys(shown).sort()).toEqual([
      'action', 'audio_block', 'camera', 'duration_s', 'geo_block', 'id', 'refs', 'sequence', 'status', 'takes',
    ]);
    expect(shown.geo_block).toBe('ROOM: clearing.');
    expect(shown.refs).toEqual([{ asset_id: 'loc_ice', role: 'location' }]);
    expect(shown.action).toBe('Mara stops at the treeline, breath fogging. She looks back once.');
    expect(shown.audio_block).toEqual({
      dialogue: [{ voice_ref: 'char_mara', line: 'hold the line' }], sfx: 'wind', music: 'none',
    });

    // echo the shot_show output values back verbatim under their wire key names
    const updated = await rpc('shot_update', {
      shot_id: 'seq01-shot01',
      patch: {
        sequence: shown.sequence,
        geo_block: shown.geo_block,
        action: shown.action,
        refs: shown.refs,
        camera: shown.camera,
        audio_block: shown.audio_block,
        duration_s: 15,
      },
    });
    expect(isError(updated)).toBe(false);
    const after = recordOf(await rpc('shot_show', { shot_id: 'seq01-shot01' }));
    expect(after.duration_s).toBe(15); // the new value persisted (echo patch is not a silent no-op)
    expect(after.action).toBe(shown.action); // echoed action survived intact
    expect(after.audio_block).toEqual(shown.audio_block); // echoed audio survived intact
  });

  it('shot_update refuses unknown patch keys loudly (never silently dropped)', async () => {
    await rpc('film_create', { film_id: 'film_x', title: 'X', logline: 'Y' });
    await rpc('asset_register', { kind: 'location', asset_id: 'loc_ice', descriptor: 'Frozen forest clearing.' });
    await rpc('shot_create', {
      id: 'seq01-shot01', sequence: 'seq01', geo_block: 'ROOM: clearing.',
      action: 'Mara stops at the treeline, breath fogging. She looks back once.',
      refs: [{ asset_id: 'loc_ice', role: 'location' }],
      camera: { lens: '35mm', move: 'push-in', reason: 'because' },
      duration_s: 10,
    });
    const res = await rpc('shot_update', { shot_id: 'seq01-shot01', patch: { foo: 1 } });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res)).toMatch(/unknown patch key \\?"foo\\?"/); // \" escaped inside the stringified result
    // the old camelCase output keys must not sneak back in either
    const camel = await rpc('shot_update', { shot_id: 'seq01-shot01', patch: { durationS: 15 } });
    expect(isError(camel)).toBe(true);
    expect(JSON.stringify(camel)).toMatch(/unknown patch key \\?"durationS\\?"/);
  });

  it('shot_update preserves audio_block keys absent from the patch (no silent data loss)', async () => {
    await rpc('film_create', { film_id: 'film_x', title: 'X', logline: 'Y' });
    await rpc('asset_register', { kind: 'location', asset_id: 'loc_ice', descriptor: 'Frozen forest clearing.' });
    await rpc('shot_create', {
      id: 'seq01-shot01', sequence: 'seq01', geo_block: 'ROOM: clearing.',
      action: 'Mara stops at the treeline, breath fogging. She looks back once.',
      refs: [{ asset_id: 'loc_ice', role: 'location' }],
      camera: { lens: '35mm', move: 'slow push-in', reason: 'closing on the choice' },
      audio_block: { dialogue: [{ line: 'hello' }], sfx: 'wind' },
      duration_s: 10,
    });
    const updated = await rpc('shot_update', { shot_id: 'seq01-shot01', patch: { audio_block: { sfx: 'rain' } } });
    expect(isError(updated)).toBe(false);

    const shown = await rpc('shot_show', { shot_id: 'seq01-shot01' });
    const audio = audioBlockOf(shown);
    expect(audio.sfx).toBe('rain');
    expect(audio.dialogue).toEqual([{ line: 'hello' }]); // preserved — absent from the patch
    expect('music' in audio).toBe(false); // absent on the wire → absent in the record

    await rpc('shot_update', { shot_id: 'seq01-shot01', patch: { audio_block: {} } });
    const afterEmpty = audioBlockOf(await rpc('shot_show', { shot_id: 'seq01-shot01' }));
    expect(afterEmpty.sfx).toBe('rain'); // {} leaves the record intact
    expect(afterEmpty.dialogue).toEqual([{ line: 'hello' }]);
    expect(afterEmpty).toEqual(audio);
  });
});

function audioBlockOf(res: unknown): Record<string, unknown> {
  const text = (res as { content: { text: string }[] }).content[0].text;
  return (JSON.parse(text) as { audio_block: Record<string, unknown> }).audio_block;
}

function recordOf(res: unknown): Record<string, unknown> {
  const text = (res as { content: { text: string }[] }).content[0].text;
  return JSON.parse(text) as Record<string, unknown>;
}
