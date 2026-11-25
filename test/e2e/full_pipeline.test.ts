// test/e2e/full_pipeline.test.ts — Full End-to-End 7-Tier Production Pipeline over real SSE/HTTP & FFmpeg media.
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { startHttpServer, type StudioHttpServer } from '../../src/http.js';
import { VultrLane } from '../../src/lanes/vultr.js';
import { probeMedia } from '../../src/qa/critic.js';

const execFile = promisify(execFileCb);

describe('Frontier Studio MCP — Full End-to-End 7-Tier Pipeline', () => {
  let fixtureDir: string;
  let sheetPng: Buffer;
  let platePng: Buffer;
  let voiceMp3: Buffer;
  let shot01Mp4: Buffer;
  let shot02Mp4: Buffer;

  let root: string;
  let httpServer: StudioHttpServer;
  let baseUrl: string;
  let client: Client;

  beforeAll(async () => {
    fixtureDir = await mkdtemp(join(tmpdir(), 'fsm-e2e-fixtures-'));
    const sheetPath = join(fixtureDir, 'sheet.png');
    const platePath = join(fixtureDir, 'plate.png');
    const voicePath = join(fixtureDir, 'voice_capture.mp3');
    const shot01Path = join(fixtureDir, 'shot01.mp4');
    const shot02Path = join(fixtureDir, 'shot02.mp4');

    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'testsrc=size=1024x576:duration=0.1,noise=alls=30:allf=t+u',
      '-frames:v', '1',
      sheetPath,
    ]);
    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'testsrc2=size=1280x536:duration=0.1,noise=alls=20:allf=t+u',
      '-frames:v', '1',
      platePath,
    ]);
    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=1.2',
      '-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '128k',
      voicePath,
    ]);
    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=24:duration=1.5',
      '-f', 'lavfi', '-i', 'sine=frequency=330:duration=1.5',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
      shot01Path,
    ]);
    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=24:duration=1.5',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1.5',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
      shot02Path,
    ]);

    [sheetPng, platePng, voiceMp3, shot01Mp4, shot02Mp4] = await Promise.all([
      readFile(sheetPath),
      readFile(platePath),
      readFile(voicePath),
      readFile(shot01Path),
      readFile(shot02Path),
    ]);
  }, 30_000);

  afterAll(async () => {
    if (fixtureDir) await rm(fixtureDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fsm-e2e-'));
    httpServer = await startHttpServer({
      studioRoot: root,
      port: 0,
      host: '127.0.0.1',
    });
    baseUrl = `http://127.0.0.1:${httpServer.port}`;
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    if (client) {
      await client.close().catch(() => {});
    }
    await httpServer.close();
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  async function rpcJson(name: string, args: Record<string, unknown>) {
    const res = await client.callTool({ name, arguments: args });
    const isErr = (res as { isError?: boolean }).isError === true;
    const text = (res as { content: Array<{ text: string }> }).content[0].text;
    let parsed: any = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // plain string response
    }
    return { isErr, text, data: parsed };
  }

  it('runs the complete 7-tier multi-shot film pipeline over SSE/HTTP, Chrome Bridge, Vultr H3, FFmpeg Audio/Post, and FCPXML/OTIO export', async () => {
    const originalFetch = globalThis.fetch;
    const vultrPosts: Array<{ url: string; body: Record<string, any> }> = [];
    let nextJobIdx = 0;
    const jobIds = ['vid-e2e-0001', 'vid-e2e-0002'];
    const jobVideos: Record<string, { bytes: Buffer; cost: number; duration: number }> = {
      'vid-e2e-0001': { bytes: shot01Mp4, cost: 0.48, duration: 5.17 },
      'vid-e2e-0002': { bytes: shot02Mp4, cost: 0.45, duration: 5.17 },
    };

    vi.stubEnv('STUDIO_LIVE', '1');
    vi.stubEnv('VULTR_INFERENCE_API_KEY', 'test-vultr-e2e-key');
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (urlStr.startsWith(VultrLane.BASE_URL)) {
        if (urlStr === `${VultrLane.BASE_URL}/videos/models`) {
          return new Response(JSON.stringify({ data: [{ id: 'minimax-h3' }] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (urlStr === `${VultrLane.BASE_URL}/videos` && init?.method === 'POST') {
          const parsedBody = JSON.parse(String(init.body || '{}'));
          vultrPosts.push({ url: urlStr, body: parsedBody });
          const jobId = jobIds[nextJobIdx++];
          return new Response(JSON.stringify({ id: jobId, status: 'pending' }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        const contentMatch = urlStr.match(/\/v1\/videos\/([^/]+)\/content$/);
        if (contentMatch) {
          const entry = jobVideos[contentMatch[1]];
          return new Response(entry.bytes, {
            status: 200,
            headers: { 'Content-Type': 'video/mp4' },
          });
        }
        const statusMatch = urlStr.match(/\/v1\/videos\/([^/]+)$/);
        if (statusMatch) {
          const jobId = statusMatch[1];
          const entry = jobVideos[jobId];
          const expiresAt = new Date(Date.now() + 96 * 3600_000).toISOString();
          return new Response(
            JSON.stringify({
              id: jobId,
              status: 'completed',
              progress: 100,
              expires_at: expiresAt,
              usage: { cost: entry.cost },
              output: { duration: entry.duration, width: 640, height: 360, has_audio: true },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        throw new Error(`Unexpected Vultr URL in E2E test: ${init?.method ?? 'GET'} ${urlStr}`);
      }
      return originalFetch(input, init);
    });

    // Connect real MCP Client via SSEClientTransport
    client = new Client({ name: 'codex-e2e-director', version: '1.0.0' });
    const transport = new SSEClientTransport(new URL(`${baseUrl}/sse`));
    await client.connect(transport);

    // ── Tier 1: Film + Assets (Character with Biological Markers + Location with Geo Block) ──
    const filmId = 'film_colossus_e2e';
    const createdFilm = await rpcJson('film_create', {
      film_id: filmId,
      title: 'Heart of Colossus',
      logline: 'A master smith unearths a molten war engine beneath the basalt ridge.',
      budget_usd: 20,
      target_runtime_min: 12,
    });
    expect(createdFilm.isErr).toBe(false);
    expect(createdFilm.data).toBe(filmId);

    const charReg = await rpcJson('asset_register', {
      kind: 'character',
      asset_id: 'char_corvus',
      descriptor: 'Corvus Vance, late 50s master smith in charcoal leather apron, iron-grey beard, soot-lined knuckles.',
      voice: 'Deep measured baritone with weathered gravel resonance and crisp diction.',
      acting: 'Economical stillness; jaw sets before speaking; keeps hands steady over glowing iron.',
      voice_id: 'Charon',
      voice_provider: 'google',
      biological_markers: {
        iris_color_hex: '#3B596A',
        bone_structure: 'angular jaw, prominent brow ridge',
        signature_marks: 'crescent burn scar along left temple',
      },
    });
    expect(charReg.isErr).toBe(false);
    const bioJson = JSON.parse(
      await readFile(join(root, 'films', filmId, 'assets', 'characters', 'char_corvus', 'biological_markers.json'), 'utf8'),
    );
    expect(bioJson.irisColorHex).toBe('#3B596A');
    expect(bioJson.signatureMarks).toContain('crescent burn scar');

    const geoBlock = 'N: molten crucible pit; E: iron anvil plinth; S: catwalk rail; W: cooling slag trough; Camera: south rail facing north.';
    const locReg = await rpcJson('asset_register', {
      kind: 'location',
      asset_id: 'loc_forge',
      descriptor: 'Subterranean basalt forge lit by molten iron troughs and overhead hanging chains.',
      geo_block: geoBlock,
    });
    expect(locReg.isErr).toBe(false);

    // ── Tier 2: Chrome Bridge Sheet Generation (`flow_prompt_sheet` -> /bridge/* -> `bridge_job_result`) ──
    expect(sheetPng.length).toBeGreaterThanOrEqual(10240);
    const sheetPromptRes = await rpcJson('flow_prompt_sheet', {
      character_id: 'char_corvus',
      dispatch_to_bridge: true,
    });
    expect(sheetPromptRes.isErr).toBe(false);
    expect(sheetPromptRes.data.prompt).toContain('#e8e8e8');
    expect(sheetPromptRes.data.prompt).toContain('#3B596A');
    const bridgeJobId = sheetPromptRes.data.bridge_job_id as string;
    expect(bridgeJobId).toBeTruthy();

    const nextRes = await originalFetch(`${baseUrl}/bridge/jobs/next?client_id=e2e-chrome-ext`);
    expect(nextRes.status).toBe(200);
    const nextPayload = await nextRes.json();
    expect(nextPayload.job?.id).toBe(bridgeJobId);

    const completeRes = await originalFetch(`${baseUrl}/bridge/jobs/${bridgeJobId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data_base64: sheetPng.toString('base64'),
        mime_type: 'image/png',
      }),
    });
    expect(completeRes.status).toBe(200);
    const completeBody = await completeRes.json();
    expect(completeBody.status).toBe('completed');
    expect(completeBody.width).toBe(1024);
    expect(completeBody.height).toBe(576);

    const bridgePoll = await rpcJson('bridge_job_result', { job_id: bridgeJobId });
    expect(bridgePoll.isErr).toBe(false);
    expect(bridgePoll.data.status).toBe('completed');
    const sheetOnDisk = join(root, 'films', filmId, 'assets', 'characters', 'char_corvus', 'sheet.png');
    expect((await stat(sheetOnDisk)).size).toBe(sheetPng.length);

    // ── Tier 3: Plate Prompt & Zero-Cost Manual Attachment (`flow_prompt_plate` -> `asset_image`) ──
    const platePromptRes = await rpcJson('flow_prompt_plate', {
      location_id: 'loc_forge',
      sequence: 'seq01',
      light_statement: 'Molten amber key from north crucible pit against cool steel-blue skylight shafts.',
      dispatch_to_bridge: false,
    });
    expect(platePromptRes.isErr).toBe(false);
    expect(platePromptRes.data.prompt).toContain('Panavision C-Series');
    expect(platePromptRes.data.prompt).toContain(geoBlock);

    const generatedDir = join(root, 'films', filmId, 'generated');
    await mkdir(generatedDir, { recursive: true });
    await writeFile(join(generatedDir, 'loc_forge_plate.png'), platePng);

    const attachPlate = await rpcJson('asset_image', {
      asset_id: 'loc_forge',
      image_path: 'generated/loc_forge_plate.png',
    });
    expect(attachPlate.isErr).toBe(false);
    const plateOnDisk = join(root, 'films', filmId, 'assets', 'locations', 'loc_forge', 'plate.png');
    expect((await stat(plateOnDisk)).size).toBe(platePng.length);

    // ── Tier 4: Sequence Geo Lock + Multi-Shot Creation & 180-Degree Continuity Enforcement ──
    const lockRes = await rpcJson('sequence_lock_geo', {
      sequence: 'seq01',
      geo_block: geoBlock,
    });
    expect(lockRes.isErr).toBe(false);

    const shot1Res = await rpcJson('shot_create', {
      id: 'shot01',
      sequence: 'seq01',
      action: 'Corvus raises a glowing iron billet onto the anvil plinth and lowers his hammer.',
      geo_block: geoBlock,
      refs: [
        { asset_id: 'loc_forge', role: 'location' },
        { asset_id: 'char_corvus', role: 'character' },
      ],
      camera: {
        lens: '35mm',
        move: 'slow dolly push-in',
        reason: 'closing on Corvus as he inspects the glowing iron',
        rig: 'dolly_track',
        movement: 'dolly_in',
        framing: 'medium_ots',
        screen_direction: 'screen_left',
        eyeline_target: 'loc_forge',
      },
      cinematics: {
        film_stock: 'kodak_vision3_500t',
        lens_glass: 'anamorphic_2x_oval_bokeh',
        lighting_setup: 'chiaroscuro_high_contrast',
        color_temp: 'tungsten_3200k',
        atmosphere: 'dust_particulates',
      },
      audio_block: {
        dialogue: [{ voice_ref: 'char_corvus', line: 'Iron remembers every hammer blow.' }],
        sfx: 'molten hiss, heavy anvil ring, cavern wind',
        music: 'none',
      },
      duration_s: 5,
    });
    expect(shot1Res.isErr).toBe(false);

    // Crossing the 180-degree line (same screen_direction with different eyeline_target) must be refused
    const badAxisRes = await rpcJson('shot_create', {
      id: 'shot02_bad',
      sequence: 'seq01',
      action: 'Corvus turns toward the molten crucible as sparks cascade across the floor.',
      geo_block: geoBlock,
      refs: [
        { asset_id: 'loc_forge', role: 'location' },
        { asset_id: 'char_corvus', role: 'character' },
      ],
      camera: {
        lens: '50mm',
        move: 'steady reverse angle',
        reason: 'axis violation test',
        screen_direction: 'screen_left',
        eyeline_target: 'char_corvus',
      },
      duration_s: 5,
    });
    expect(badAxisRes.isErr).toBe(true);
    expect(badAxisRes.text).toMatch(/180-degree axis violation/i);

    const shot2Res = await rpcJson('shot_create', {
      id: 'shot02',
      sequence: 'seq01',
      action: 'Sparks erupt from the anvil as Corvus turns toward the molten crucible.',
      geo_block: geoBlock,
      refs: [
        { asset_id: 'loc_forge', role: 'location' },
        { asset_id: 'char_corvus', role: 'character' },
      ],
      camera: {
        lens: '50mm',
        move: 'dolly track right',
        reason: 'continuous motion tracking sparks toward the crucible',
        rig: 'dolly_track',
        movement: 'truck_right',
        framing: 'medium_ots',
        screen_direction: 'screen_right',
        eyeline_target: 'char_corvus',
      },
      continuity: 'continuous',
      chain_from_shot_id: 'shot01',
      audio_block: {
        sfx: 'cavern wind, cooling steam',
        music: 'none',
      },
      duration_s: 5,
    });
    expect(shot2Res.isErr).toBe(false);

    const continuityPlan = await rpcJson('shot_continuity_plan', {
      shot_id: 'shot01',
      target_shot_id: 'shot02',
    });
    expect(continuityPlan.isErr).toBe(false);
    expect(continuityPlan.data.recommended_transition).toBe('continuous');
    expect(continuityPlan.data.eyeline_continuity).toBe('aligned');
    expect(continuityPlan.data.chain_parent_id).toBe('shot01');

    // ── Tier 5: Vultr MiniMax H3 Render + Status + Download + Post-Download FFprobe/Critic QC ──
    const render1 = await rpcJson('render_shot', {
      shot_id: 'shot01',
      quality: 'standard',
      aspect_ratio: '16:9',
    });
    expect(render1.isErr).toBe(false);
    expect(render1.data.job_id).toBe('vid-e2e-0001');
    expect(render1.data.estimated_cost_usd).toBe(0.45); // $0.09/s * 5s
    expect(vultrPosts[0].body.frame_images[0].image_url.url).toBe(
      `data:image/png;base64,${platePng.toString('base64')}`,
    );

    const status1 = await rpcJson('job_status', { job_id: 'vid-e2e-0001' });
    expect(status1.isErr).toBe(false);
    expect(status1.data.status).toBe('completed');

    const dl1 = await rpcJson('job_download', { job_id: 'vid-e2e-0001' });
    expect(dl1.isErr).toBe(false);
    expect(dl1.data.qc_verdict).toBe('kept');
    expect(dl1.data.qc_score).toBeGreaterThanOrEqual(8.5);
    expect(dl1.data.width).toBe(640);
    expect(dl1.data.height).toBe(360);
    expect(dl1.data.resolution).toBe('640x360');
    expect(dl1.data.actual_cost_usd).toBe(0.48);

    const tailFrame1Path = join(root, 'films', filmId, 'renders', 'vid-e2e-0001', 'tail_frame.png');
    const tailFrame1Bytes = await readFile(tailFrame1Path);
    expect(tailFrame1Bytes.length).toBeGreaterThan(0);

    // Check double-entry ledger math for shot01 (0.45 reserve + 0.03 reconcile = 0.48)
    const ledgerRaw1 = await readFile(join(root, 'films', filmId, 'ledger.jsonl'), 'utf8');
    const ledgerEntries1 = ledgerRaw1.trim().split('\n').map((l) => JSON.parse(l));
    const sumJob1 = ledgerEntries1
      .filter((e) => e.job_id === 'vid-e2e-0001')
      .reduce((acc, e) => acc + Number(e.cost_usd), 0);
    expect(Number(sumJob1.toFixed(4))).toBe(0.48);

    // Auto-chained shot02 render must inject shot01's tail_frame.png as frame_images[0]
    const render2 = await rpcJson('render_shot', {
      shot_id: 'shot02',
      quality: 'standard',
      aspect_ratio: '16:9',
    });
    expect(render2.isErr).toBe(false);
    expect(render2.data.job_id).toBe('vid-e2e-0002');
    expect(vultrPosts[1].body.frame_images[0].image_url.url).toBe(
      `data:image/png;base64,${tailFrame1Bytes.toString('base64')}`,
    );

    const status2 = await rpcJson('job_status', { job_id: 'vid-e2e-0002' });
    expect(status2.isErr).toBe(false);
    expect(status2.data.status).toBe('completed');

    const dl2 = await rpcJson('job_download', { job_id: 'vid-e2e-0002' });
    expect(dl2.isErr).toBe(false);
    expect(dl2.data.qc_verdict).toBe('kept');
    expect(dl2.data.qc_score).toBeGreaterThanOrEqual(8.5);

    const filmMetaAfter = JSON.parse(await readFile(join(root, 'films', filmId, 'film.json'), 'utf8'));
    expect(Number(filmMetaAfter.spentUsd.toFixed(4))).toBe(0.93);

    // ── Tier 6: Audio Soundstage (AI Studio Prompt -> Dialogue Import -> Acoustic Match -> Soundscape) ──
    const dlgPrompt = await rpcJson('studio_prompt_dialogue', {
      shot_id: 'shot01',
      line_index: 1,
    });
    expect(dlgPrompt.isErr).toBe(false);
    expect(dlgPrompt.data.voice_persona).toBe('Charon');
    expect(dlgPrompt.data.annotated_line).toContain('[breath]');
    expect(dlgPrompt.data.annotated_line).toContain('[pause: 800ms]');

    const mp3CapturePath = join(root, 'films', filmId, 'raw_corvus_capture.mp3');
    await writeFile(mp3CapturePath, voiceMp3);

    const dlgImport = await rpcJson('dialogue_import', {
      shot_id: 'shot01',
      line_index: 1,
      source_audio_path: 'raw_corvus_capture.mp3',
    });
    expect(dlgImport.isErr).toBe(false);
    expect(dlgImport.data.sample_rate_hz).toBe(48000);
    expect(dlgImport.data.channels).toBe(1);
    expect(dlgImport.data.zero_api_cost).toBe(true);

    const acousticRes = await rpcJson('acoustic_match', {
      shot_id: 'shot01',
      line_index: 1,
      environment: 'stone_cavern',
    });
    expect(acousticRes.isErr).toBe(false);
    expect(acousticRes.data.environment).toBe('stone_cavern');
    expect(acousticRes.data.target_lufs).toBe(-14);
    expect(acousticRes.data.ffmpeg_applied).toBe(true);
    expect((await stat(acousticRes.data.diegetic_audio_path)).size).toBeGreaterThan(1000);

    const soundscapeRes = await rpcJson('soundscape_build', { shot_id: 'shot01' });
    expect(soundscapeRes.isErr).toBe(false);
    expect(soundscapeRes.data.sample_rate_hz).toBe(48000);
    expect(soundscapeRes.data.channels).toBe(2);
    expect((await stat(soundscapeRes.data.soundscape_audio_path)).size).toBeGreaterThan(1000);

    // ── Tier 7: Post-Production (Lipsync -> Grade -> Assemble -> Multi-Track Export -> QC -> HTTP Stream) ──
    const lipsyncRes = await rpcJson('shot_lipsync', {
      shot_id: 'shot01',
      apply: true,
    });
    expect(lipsyncRes.isErr).toBe(false);
    expect(lipsyncRes.data.executed).toBe(true);
    expect((await stat(lipsyncRes.data.synced_video)).size).toBeGreaterThan(1000);

    const gradeRes = await rpcJson('film_grade', {
      shot_id: 'shot01',
      film_stock: 'kodak_vision3_500t',
      apply: true,
    });
    expect(gradeRes.isErr).toBe(false);
    expect(gradeRes.data.executed).toBe(true);
    expect((await stat(gradeRes.data.graded_video)).size).toBeGreaterThan(1000);

    const assembleRes = await rpcJson('film_assemble', { apply: true });
    expect(assembleRes.isErr).toBe(false);
    expect(assembleRes.data.executed).toBe(true);
    expect(assembleRes.data.total_clips).toBe(2);
    expect(assembleRes.data.width).toBe(640);
    expect(assembleRes.data.height).toBe(360);
    expect(assembleRes.data.has_audio).toBe(true);
    expect(assembleRes.data.duration_s).toBeGreaterThan(2.5);

    const roughCutPath = assembleRes.data.output_rough_cut as string;
    const roughProbe = await probeMedia(roughCutPath);
    expect(roughProbe.exists).toBe(true);
    expect(roughProbe.hasVideo).toBe(true);
    expect(roughProbe.hasAudio).toBe(true);

    const xmlRes = await rpcJson('film_export_xml', { title: 'Colossus_E2E_Cut' });
    expect(xmlRes.isErr).toBe(false);
    expect(xmlRes.data.missing_media).toBe(false);
    expect(xmlRes.data.tracks.audio_a1_dialogue_clips).toBeGreaterThanOrEqual(1);
    expect(xmlRes.data.tracks.audio_a2_sfx_clips).toBeGreaterThanOrEqual(1);

    const fcpxmlText = await readFile(xmlRes.data.fcpxml_path, 'utf8');
    expect(fcpxmlText).toContain('<fcpxml version="1.10">');
    expect(fcpxmlText).toContain('lane="-1"');
    expect(fcpxmlText).toContain('lane="-2"');
    expect(fcpxmlText).toContain('file:///');

    const otioJson = JSON.parse(await readFile(xmlRes.data.otio_path, 'utf8'));
    const trackNames = otioJson.tracks.children.map((t: { name: string }) => t.name);
    expect(trackNames).toEqual([
      'V1_Generative_Video',
      'A1_Dialogue',
      'A2_Soundscape_SFX',
      'A3_Score',
    ]);

    const edlText = await readFile(xmlRes.data.edl_path, 'utf8');
    expect(edlText).toContain('shot01.mp4');
    expect(edlText).toContain('shot02.mp4');

    const qcAudit = await rpcJson('qc_vision_audit', {
      video_path: `films/${filmId}/renders/rough_cut.mp4`,
    });
    expect(qcAudit.isErr).toBe(false);
    expect(qcAudit.data.passed_qc).toBe(true);
    expect(qcAudit.data.issues_detected).toEqual([]);

    // Verify HTTP /artifacts/* streams rough_cut.mp4 as video/mp4
    const artifactRes = await originalFetch(`${baseUrl}/artifacts/films/${filmId}/renders/rough_cut.mp4`);
    expect(artifactRes.status).toBe(200);
    expect(artifactRes.headers.get('Content-Type')).toBe('video/mp4');
    const streamedBytes = Buffer.from(await artifactRes.arrayBuffer());
    expect(streamedBytes.length).toBe(roughProbe.fileBytes);
  }, 60_000);
});
