// m1-e2e-smoke.mjs — scripted stdio JSON-RPC smoke test of the M1 registry core.
// Throwaway harness: lives in the git-ignored SDD workspace, never in the repo.
// Spawns `node dist/server.js` with a temp STUDIO_ROOT and drives newline-delimited
// JSON-RPC over stdin/stdout, asserting doctrine refusals AND acceptances.
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const REPO = 'C:/Users/hp/Documents/PROJECTS/frontier-studio-mcp';
const SERVER_JS = join(REPO, 'dist', 'server.js');
const TRANSCRIPT = join(fileURLToPath(new URL('.', import.meta.url)), 'm1-e2e-transcript.txt');

const transcript = [];
function log(line) {
  transcript.push(line);
  console.log(line);
}

// The geo block used for the verbatim-lock test — must be byte-identical in the
// sequence lock and the shot that references it.
const GEO = [
  'SEQ-101 GEO BLOCK — diner interior, night.',
  'Landmarks: counter along the north wall; jukebox at the NW corner; booth row along the south wall.',
  'Frame sides: WEST = kitchen pass window, EAST = front windows (rain).',
  'Camera side: camera lives on the EAST side shooting WEST, never crosses the 180 axis.',
].join('\n');

const EXPECTED_TOOLS = [
  'film_create', 'film_set_active', 'film_show',
  'asset_register', 'shot_create', 'shot_update', 'shot_show',
  'sequence_lock_geo',
].sort();

// --- minimal JSON-RPC stdio client -------------------------------------------

let proc = null;
let nextId = 1;
const pending = new Map();

function startServer(studioRoot) {
  proc = spawn(process.execPath, [SERVER_JS], {
    env: { ...process.env, STUDIO_ROOT: studioRoot },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const rl = createInterface({ input: proc.stdout });
  rl.on('line', (line) => {
    if (!line.trim()) return;
    log(`<< ${line}`);
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    if (msg.id !== undefined && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      clearTimeout(p.timer);
      pending.delete(msg.id);
      p.resolve(msg);
    }
  });
  proc.stderr.on('data', (d) => transcript.push(`[stderr] ${d.toString().trim()}`));
}

function request(method, params) {
  const id = nextId++;
  const body = JSON.stringify({ jsonrpc: '2.0', id, method, params });
  log(`>> ${body}`);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`timeout waiting for response to id=${id} (${method})`));
    }, 15000);
    pending.set(id, { resolve, timer });
    proc.stdin.write(body + '\n');
  });
}

function notify(method, params) {
  const body = JSON.stringify({ jsonrpc: '2.0', method, params });
  log(`>> ${body}`);
  proc.stdin.write(body + '\n');
}

// A refusal may arrive as a JSON-RPC error (McpError -32602) or as an isError
// result with text content; collapse both shapes into { ok, text }.
function outcome(res) {
  if (res.error) return { ok: false, text: String(res.error.message) };
  const r = res.result ?? {};
  const text = Array.isArray(r.content)
    ? r.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n')
    : JSON.stringify(r);
  return { ok: !r.isError, text };
}

// --- step harness -------------------------------------------------------------

const results = [];
function record(step, status, detail) {
  results.push({ step, status, detail });
  log(`\n== STEP ${step} -> ${status}${detail ? ` | ${detail}` : ''}`);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function step(stepName, fn) {
  try {
    const detail = await fn();
    record(stepName, 'PASS', detail ?? '');
    return true;
  } catch (e) {
    record(stepName, 'FAIL', e.message);
    return false;
  }
}

// --- the smoke ----------------------------------------------------------------

let studioRoot = null;
let allPass = true;

try {
  studioRoot = await mkdtemp(join(tmpdir(), 'fsm-m1-e2e-'));
  log(`# M1 E2E smoke — ${new Date().toISOString()}`);
  log(`# server: node ${SERVER_JS}`);
  log(`# STUDIO_ROOT: ${studioRoot}`);
  log('');
  startServer(studioRoot);

  allPass = await step('S1 initialize', async () => {
    const res = await request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'm1-e2e-smoke', version: '0.0.1' },
    });
    assert(!res.error, `initialize errored: ${JSON.stringify(res.error)}`);
    assert(res.result?.serverInfo?.name === 'frontier-studio-mcp',
      `serverInfo.name=${res.result?.serverInfo?.name}`);
    notify('notifications/initialized', {});
    return `serverInfo=${res.result.serverInfo.name} v${res.result.serverInfo.version}, protocol=${res.result.protocolVersion}`;
  }) && allPass;

  if (allPass) {
    allPass = await step('S2 tools/list = exact 8 names', async () => {
      const res = await request('tools/list', {});
      assert(!res.error, `tools/list errored: ${JSON.stringify(res.error)}`);
      const names = res.result.tools.map((t) => t.name).sort();
      assert(JSON.stringify(names) === JSON.stringify(EXPECTED_TOOLS),
        `tools=${JSON.stringify(names)} expected=${JSON.stringify(EXPECTED_TOOLS)}`);
      return names.join(', ');
    });
  }

  if (allPass) {
    allPass = await step('S3 film_create accepted', async () => {
      const res = await request('tools/call', {
        name: 'film_create',
        arguments: {
          film_id: 'night-diner',
          title: 'Night at the Diner',
          logline: 'A short-order cook discovers the jukebox plays tomorrow.',
          budget_usd: 5000,
          target_runtime_min: 12,
        },
      });
      const o = outcome(res);
      assert(o.ok, `refused: ${o.text}`);
      assert(o.text.includes('night-diner'), `result text missing film id: ${o.text}`);
      return o.text;
    });
  }

  if (allPass) {
    allPass = await step('S4 character WITHOUT voice refused (names voice+acting)', async () => {
      const res = await request('tools/call', {
        name: 'asset_register',
        arguments: {
          kind: 'character',
          asset_id: 'marlow',
          descriptor: 'Marlow, 50s, line-cook forearms, tired eyes that miss nothing. Apron stained with decades of gravy.',
          // voice and acting deliberately omitted
        },
      });
      const o = outcome(res);
      assert(!o.ok, `expected refusal, got acceptance: ${o.text}`);
      assert(/voice/i.test(o.text), `refusal does not mention voice: ${o.text}`);
      assert(/acting/i.test(o.text), `refusal does not mention acting: ${o.text}`);
      return o.text;
    });
  }

  if (allPass) {
    allPass = await step('S5 character WITH voice+acting accepted', async () => {
      const res = await request('tools/call', {
        name: 'asset_register',
        arguments: {
          kind: 'character',
          asset_id: 'marlow',
          descriptor: 'Marlow, 50s, line-cook forearms, tired eyes that miss nothing. Apron stained with decades of gravy.',
          voice: 'Low register, slow tempo, 40-a-day rasp, flat Midwest accent, never raises volume — leans closer instead.',
          acting: 'Stillness as pressure. Pauses a beat before answering. Watches hands, not faces. Smiles only when the news is bad.',
        },
      });
      const o = outcome(res);
      assert(o.ok, `refused: ${o.text}`);
      assert(o.text.includes('characters/marlow'), `expected asset dir in result: ${o.text}`);
      return o.text;
    });
  }

  if (allPass) {
    allPass = await step('S6 sequence_lock_geo accepted', async () => {
      const res = await request('tools/call', {
        name: 'sequence_lock_geo',
        arguments: { sequence: 'SEQ-101', geo_block: GEO },
      });
      const o = outcome(res);
      assert(o.ok, `refused: ${o.text}`);
      assert(o.text.includes('locked SEQ-101'), `expected lock confirmation: ${o.text}`);
      return o.text;
    });
  }

  if (allPass) {
    allPass = await step('S7 shot WITHOUT geo_block refused', async () => {
      const res = await request('tools/call', {
        name: 'shot_create',
        arguments: {
          id: 'sh-010',
          sequence: 'SEQ-101',
          // geo_block deliberately omitted
          refs: [{ asset_id: 'marlow', role: 'character' }],
          camera: { lens: '35mm', move: 'slow push-in on Marlow', reason: 'the reveal is his silence, not the room' },
          duration_s: 8,
        },
      });
      const o = outcome(res);
      assert(!o.ok, `expected refusal, got acceptance: ${o.text}`);
      assert(/geo_block is required/i.test(o.text), `refusal is not the geo_block refusal: ${o.text}`);
      return o.text;
    });
  }

  if (allPass) {
    allPass = await step('S8 shot WITH verbatim geo_block + valid refs/camera/duration accepted', async () => {
      const res = await request('tools/call', {
        name: 'shot_create',
        arguments: {
          id: 'sh-010',
          sequence: 'SEQ-101',
          geo_block: GEO, // byte-identical to the locked block
          refs: [{ asset_id: 'marlow', role: 'character' }],
          camera: { lens: '35mm', move: 'slow push-in on Marlow', reason: 'the reveal is his silence, not the room' },
          audio_block: { dialogue: [{ voice_ref: 'marlow', line: 'You always did order the special.' }] },
          duration_s: 8,
        },
      });
      const o = outcome(res);
      assert(o.ok, `refused: ${o.text}`);
      assert(o.text.includes('"sh-010"') || o.text.includes('sh-010'), `result missing shot id: ${o.text}`);
      return 'shot record returned (draft)';
    });
  }

  if (allPass) {
    allPass = await step('S9 shot_show: camera.reason (and geo) survived', async () => {
      const res = await request('tools/call', {
        name: 'shot_show',
        arguments: { shot_id: 'sh-010' },
      });
      const o = outcome(res);
      assert(o.ok, `shot_show refused: ${o.text}`);
      let rec;
      try { rec = JSON.parse(o.text); } catch { throw new Error(`shot_show text is not JSON: ${o.text.slice(0, 200)}`); }
      assert(rec.camera?.reason === 'the reveal is his silence, not the room',
        `camera.reason did not survive: ${JSON.stringify(rec.camera)}`);
      assert(rec.geoBlock === GEO, 'geoBlock did not survive verbatim');
      assert(rec.durationS === 8, `durationS=${rec.durationS} expected 8`);
      assert(rec.refs?.[0]?.assetId === 'marlow', `refs[0].assetId=${rec.refs?.[0]?.assetId}`);
      return `status=${rec.status}, camera.reason intact, geoBlock verbatim, duration=${rec.durationS}s`;
    });
  }

  await step('S10 server shuts down on stdin close', async () => {
    // Closing stdin is the graceful stdio-transport shutdown; on win32 a hard
    // kill() would exit non-zero, so give the server 6s to exit on its own.
    const code = await new Promise((resolve) => {
      if (proc.exitCode !== null) return resolve(proc.exitCode);
      const t = setTimeout(() => { proc.kill(); resolve('killed-after-6s'); }, 6000);
      proc.on('exit', (c) => { clearTimeout(t); resolve(c); });
      proc.stdin.end();
    });
    assert(code !== null && code !== undefined, 'process did not exit');
    return `exit code ${code}`;
  });
  const last = results[results.length - 1];
  if (last.status !== 'PASS') allPass = false;
} catch (e) {
  record('HARNESS', 'FAIL', e.message);
  allPass = false;
}

const passCount = results.filter((r) => r.status === 'PASS').length;
log('');
log(`# VERDICT: ${allPass ? 'ALL PASS' : 'FAILURE'} — ${passCount}/${results.length} steps PASS`);
if (allPass && studioRoot) {
  await rm(studioRoot, { recursive: true, force: true });
  log(`# STUDIO_ROOT temp dir removed (was ${studioRoot})`);
} else {
  log(`# STUDIO_ROOT kept for inspection: ${studioRoot}`);
}
log(`# transcript saved: ${TRANSCRIPT}`);
await writeFile(TRANSCRIPT, transcript.join('\n') + '\n', 'utf8');
process.exit(allPass ? 0 : 1);
