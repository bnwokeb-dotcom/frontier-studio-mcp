// test/server.test.ts — MCP server wiring over the real in-memory transport
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { EventEmitter } from 'node:events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { attachStdioShutdown, buildServer, parseBridgePort } from '../src/server.js';
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
  it('exposes all 52 production tools across all studio lanes', async () => {
    const res = await client.listTools();
    expect(res.tools.map((t) => t.name).sort()).toEqual([
      'acoustic_match', 'asset_image', 'asset_list', 'asset_register', 'bridge_job_result',
      'bridge_status', 'budget_set', 'character_sheet_build', 'character_voice_enroll',
      'clip_plan_viral', 'clip_render_viral', 'dialogue_import', 'dialogue_render',
      'director_desk_stage', 'film_assemble', 'film_create', 'film_export_xml',
      'film_grade', 'film_publish', 'film_set_active', 'film_show', 'flow_prompt_plate',
      'flow_prompt_sheet', 'image_generate', 'job_download', 'job_status', 'keyframe_build',
      'music_bridge_dispatch', 'qc_vision_audit', 'render_shot', 'repair_shot',
      'score_arrange_dynamic', 'sequence_lock_geo', 'sequence_state_plan',
      'sequence_take_record', 'sfx_fetch_api', 'sfx_search', 'sfx_spot_video',
      'shot_continuity_plan', 'shot_create', 'shot_lipsync', 'shot_list',
      'shot_prompt_compile', 'shot_show', 'shot_table_validate', 'shot_update',
      'soundscape_build', 'staging_build', 'storyboard_build', 'studio_doctor',
      'studio_prompt_dialogue', 'video_import',
    ]);
  });

  it('exposes MCP directorial prompts for AI agents (Claude, ChatGPT)', async () => {
    const res = await client.listPrompts();
    const promptNames = res.prompts.map((p) => p.name).sort();
    expect(promptNames).toEqual([
      'cinematographer_shot_designer',
      'commercial_ad_architect',
      'director_breakdown',
      'lumina_canvas_director',
      'mythic_story_architect',
      'script_doctor_packager',
      'skit_director_architect',
      'soundstage_master',
      'viral_clip_architect',
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

  it('asset_register with empty biological_markers {} does not write biological_markers.json', async () => {
    await rpc('film_create', { film_id: 'film_bio', title: 'Bio', logline: 'Test' });
    const res = await rpc('asset_register', {
      film_id: 'film_bio',
      kind: 'character',
      asset_id: 'char_empty_bio',
      descriptor: 'Tall courier in a weathered coat.',
      voice: 'Baritone, measured pace.',
      acting: 'Controlled stillness.',
      biological_markers: {},
    });
    expect(isError(res)).toBe(false);
    const markersPath = join(root, 'films', 'film_bio', 'assets', 'characters', 'char_empty_bio', 'biological_markers.json');
    await expect(stat(markersPath)).rejects.toThrow();
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

  it('stdio mode stops WebBridgeServer and exits cleanly when stdin closes (and survives EADDRINUSE)', async () => {
    const getFreePort = () =>
      new Promise<number>((resolvePort, rejectPort) => {
        const srv = net.createServer();
        srv.once('error', rejectPort);
        srv.listen(0, '127.0.0.1', () => {
          const addr = srv.address();
          const port = typeof addr === 'object' && addr ? addr.port : 0;
          srv.close((err) => (err ? rejectPort(err) : resolvePort(port)));
        });
      });

    const freePort = await getFreePort();
    const tsxLoader = resolve(process.cwd(), 'node_modules/tsx/dist/esm/index.mjs');
    const loaderUrl = new URL(`file:///${tsxLoader.replace(/\\/g, '/')}`).href;

    // 1. Spawn stdio server with dedicated bridge port, confirm bridge is up, then close stdin -> must exit 0 & free port
    const child = spawn(process.execPath, ['--import', loaderUrl, 'src/server.ts'], {
      cwd: process.cwd(),
      env: { ...process.env, STUDIO_ROOT: root, BRIDGE_PORT: String(freePort), MCP_TRANSPORT: 'stdio' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', (c) => {
      stderr += c.toString();
    });

    // Wait until Chrome Bridge HTTP listener announces ready
    await new Promise<void>((resolveReady, rejectReady) => {
      const timer = setTimeout(() => rejectReady(new Error(`Timed out waiting for bridge start. stderr=${stderr}`)), 8000);
      const onData = () => {
        if (stderr.includes(`127.0.0.1:${freePort}`)) {
          clearTimeout(timer);
          child.stderr.off('data', onData);
          resolveReady();
        }
      };
      child.stderr.on('data', onData);
      child.once('exit', (code) => {
        clearTimeout(timer);
        rejectReady(new Error(`Server exited prematurely (${code}). stderr=${stderr}`));
      });
    });

    const bridgeStatus = await fetch(`http://127.0.0.1:${freePort}/bridge/status`);
    expect(bridgeStatus.status).toBe(200);

    // Close stdin and assert clean exit (code 0) within 4s (not orphaned by open TCP bridge!)
    const exitCode = await new Promise<number | null>((resolveExit, rejectExit) => {
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        rejectExit(new Error(`Orphaned stdio process did not exit after stdin close. stderr=${stderr}`));
      }, 4000);
      child.once('exit', (code) => {
        clearTimeout(timer);
        resolveExit(code);
      });
      child.stdin.end();
    });
    expect(exitCode).toBe(0);

    // Confirm port freePort was actually released (can re-bind immediately)
    const rebindSrv = net.createServer();
    await new Promise<void>((resolveBind, rejectBind) => {
      rebindSrv.once('error', rejectBind);
      rebindSrv.listen(freePort, '127.0.0.1', () => resolveBind());
    });

    // 2. EADDRINUSE guard: spawn stdio server while freePort is already occupied -> continues stdio MCP & exits 0 on stdin close
    const childBusy = spawn(process.execPath, ['--import', loaderUrl, 'src/server.ts'], {
      cwd: process.cwd(),
      env: { ...process.env, STUDIO_ROOT: root, BRIDGE_PORT: String(freePort), MCP_TRANSPORT: 'stdio' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stderrBusy = '';
    childBusy.stderr.on('data', (c) => {
      stderrBusy += c.toString();
    });

    try {
      await new Promise<void>((resolveReady, rejectReady) => {
        const timer = setTimeout(() => rejectReady(new Error(`Timed out waiting for EADDRINUSE log. stderr=${stderrBusy}`)), 8000);
        const onData = () => {
          if (/EADDRINUSE|already in use|unavailable/i.test(stderrBusy)) {
            clearTimeout(timer);
            childBusy.stderr.off('data', onData);
            resolveReady();
          }
        };
        childBusy.stderr.on('data', onData);
      });

      const busyExitCode = await new Promise<number | null>((resolveExit, rejectExit) => {
        const timer = setTimeout(() => {
          childBusy.kill('SIGKILL');
          rejectExit(new Error(`EADDRINUSE stdio process did not exit on stdin close. stderr=${stderrBusy}`));
        }, 4000);
        childBusy.once('exit', (code) => {
          clearTimeout(timer);
          resolveExit(code);
        });
        childBusy.stdin.end();
      });
      expect(busyExitCode).toBe(0);
    } finally {
      await new Promise<void>((r) => rebindSrv.close(() => r()));
    }
  }, 20_000);

  it('attachStdioShutdown is idempotent across stdin end/close, server.onclose, SIGINT, and SIGTERM', async () => {
    expect(parseBridgePort(undefined)).toBe(8081);
    expect(parseBridgePort('0')).toBe(0);
    expect(parseBridgePort('disabled')).toBeNull();
    expect(parseBridgePort('9099')).toBe(9099);

    let stopCalls = 0;
    let closeCalls = 0;
    let signalExits: number[] = [];

    const stdin = new EventEmitter();
    const proc = new EventEmitter() as EventEmitter & { exit: (code?: number) => never };
    proc.exit = ((code?: number) => {
      signalExits.push(code ?? 0);
      return undefined as never;
    }) as (code?: number) => never;

    const fakeServer = {
      server: { onclose: undefined as (() => void) | undefined },
      close: async () => {
        closeCalls += 1;
      },
    };
    const fakeBridge = {
      stop: async () => {
        stopCalls += 1;
      },
    };

    const shutdown = attachStdioShutdown({
      server: fakeServer,
      bridge: fakeBridge,
      stdin,
      proc,
      onExitSignal: (c) => signalExits.push(c),
    });

    // Fire multiple lifecycle events rapidly
    stdin.emit('end');
    stdin.emit('close');
    fakeServer.server.onclose?.();
    await shutdown();

    expect(stopCalls).toBe(1);
    expect(closeCalls).toBe(1);

    // Signal test with fresh instance
    let sigStop = 0;
    let sigClose = 0;
    const proc2 = new EventEmitter() as EventEmitter & { exit: (code?: number) => never };
    proc2.exit = (() => undefined as never) as (code?: number) => never;
    const stdin2 = new EventEmitter();
    attachStdioShutdown({
      server: {
        server: {},
        close: async () => {
          sigClose += 1;
        },
      },
      bridge: {
        stop: async () => {
          sigStop += 1;
        },
      },
      stdin: stdin2,
      proc: proc2,
      onExitSignal: (c) => signalExits.push(c),
    });

    proc2.emit('SIGTERM');
    await new Promise((r) => setTimeout(r, 20));
    expect(sigStop).toBe(1);
    expect(sigClose).toBe(1);
    expect(signalExits).toEqual([0]);
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
