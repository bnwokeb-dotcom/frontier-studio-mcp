// src/harness/runner.ts — Autonomous Hermes-Style Studio Harness Runner
// Operates as an unattended 24/7 Executive Producer driving end-to-end film & ad production.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { buildServer } from '../server.js';
import { isR2Configured, uploadToR2 } from '../storage/r2.js';
import { studioPaths } from '../store/paths.js';
import { shotShow, type ShotRecord } from '../store/shot.js';
import { readJobs } from '../store/jobs.js';
import { loadConfig } from '../config.js';
import { auditTake, probeMedia } from '../qa/critic.js';
import { resolveShotVideoPath } from '../tools/editor.js';

export interface AutonomousProductionGoal {
  film_id: string;
  title: string;
  logline: string;
  budget_usd: number;
  niche: 'ugc_ecommerce_ads' | 'episodic_skit_comedy' | 'faceless_deep_dive_3d' | 'hollywood_prestige_directing' | 'stream_clips_repurpose' | 'kinetic_motion_graphics';
  aspect_ratio: '9:16' | '16:9';
  target_model?: 'minimax-h3' | 'omniflash-1.2' | 'kling-4';
  characters?: Array<{
    asset_id: string;
    descriptor: string;
    voice?: string | { pitch: number; speed: number; timbre: string };
    acting?: string;
  }>;
  location?: {
    asset_id: string;
    descriptor: string;
    geo_block: string;
  };
  shots: Array<{
    id: string;
    action: string;
    camera: { lens: string; move: string; reason: string };
    duration_s: number;
    continuity?: 'cut' | 'continuous' | 'match_cut' | 'transition';
    chain_from_shot_id?: string;
    dialogue?: { character: string; line: string };
  }>;
  webhook_url?: string;
}

export interface ProductionReport {
  film_id: string;
  title: string;
  status: 'COMPLETED' | 'STAGED_AWAITING_RENDERS' | 'FAILED';
  total_shots: number;
  total_runtime_s: number;
  spent_usd: number;
  remaining_budget_usd: number;
  rough_cut_path?: string;
  r2_public_url?: string;
  otio_timeline_path?: string;
  fcpxml_timeline_path?: string;
  qc_audit_passed: boolean;
  qc_issues: string[];
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

export async function runAutonomousProduction(
  goal: AutonomousProductionGoal,
  studioRoot?: string,
): Promise<ProductionReport> {
  const root = studioRoot || process.env.STUDIO_ROOT || process.cwd();
  const paths = studioPaths(root);
  const server = buildServer({ studioRoot: root });
  const client = new Client({ name: 'hermes-harness-producer', version: '1.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);

  const rpc = async (name: string, args: Record<string, unknown>) => {
    const res = await client.callTool({ name, arguments: args });
    if ((res as any).isError) {
      const errText = (res as any).content?.[0]?.text || 'Tool failure';
      throw new Error(`Tool ${name} failed: ${errText}`);
    }
    const text = (res as any).content?.[0]?.text;
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return text;
    }
  };

  try {
    // 1. Film Creation & Budget Allocation (idempotent if already staged)
    if (await fileExists(paths.filmJson(goal.film_id))) {
      await rpc('film_set_active', { film_id: goal.film_id });
    } else {
      await rpc('film_create', {
        film_id: goal.film_id,
        title: goal.title,
        logline: goal.logline,
        budget_usd: goal.budget_usd,
      });
    }

    // 2. Character Turnaround Staging
    if (goal.characters && goal.characters.length > 0) {
      for (const char of goal.characters) {
        const descPath = join(paths.assetDir(goal.film_id, 'characters', char.asset_id), 'descriptor.md');
        if (!(await fileExists(descPath))) {
          await rpc('asset_register', {
            kind: 'character',
            asset_id: char.asset_id,
            descriptor: char.descriptor,
            voice: typeof char.voice === 'string' ? char.voice : char.voice ? JSON.stringify(char.voice) : 'gravelly register, deliberate cadence, feral breath',
            acting: char.acting || 'feral alertness, intense micro-expressions, rapid eye twitches, cautious predatory stance',
            film_id: goal.film_id,
          });
        }
      }
    }

    // 3. Location Geometry Staging
    const locId = goal.location?.asset_id || 'loc_main';
    const geoBlock = goal.location?.geo_block || 'central area, motivated natural light';
    const locDescPath = join(paths.assetDir(goal.film_id, 'locations', locId), 'descriptor.md');
    if (!(await fileExists(locDescPath))) {
      await rpc('asset_register', {
        kind: 'location',
        asset_id: locId,
        descriptor: goal.location?.descriptor || 'Main production set',
        geo_block: geoBlock,
        film_id: goal.film_id,
      });
    }
    await rpc('sequence_lock_geo', {
      sequence: 'seq01',
      geo_block: geoBlock,
      film_id: goal.film_id,
    });

    // 4. Multi-Shot Creation (preserving existing takes if shot already staged)
    let totalRuntime = 0;
    for (const s of goal.shots) {
      totalRuntime += s.duration_s;
      if (!(await fileExists(paths.shotPath(goal.film_id, s.id)))) {
        await rpc('shot_create', {
          id: s.id,
          sequence: 'seq01',
          action: s.action,
          geo_block: geoBlock,
          camera: s.camera,
          duration_s: s.duration_s,
          aspect_ratio: goal.aspect_ratio,
          continuity: (s.continuity === 'continuous' || s.continuity === 'match_cut' || s.continuity === 'transition') ? s.continuity : 'cut',
          chain_from_shot_id: s.chain_from_shot_id,
          refs: [{ asset_id: locId, role: 'location' }],
          film_id: goal.film_id,
        });
      }
    }

    // 5. Timeline Export (OpenTimelineIO, FCPXML, EDL)
    const timelineExport = await rpc('film_export_xml', {
      film_id: goal.film_id,
      sequence: 'seq01',
      title: goal.title,
    });

    const filmData = await rpc('film_show', { film_id: goal.film_id });
    const spentUsd = Number(filmData.spent_usd ?? 0);
    const remainingBudgetUsd = Number(
      filmData.remaining_budget_usd ??
      (filmData.budget_usd !== undefined ? filmData.budget_usd - spentUsd : goal.budget_usd),
    );

    // 6. Verify rendered MP4 takes exist on disk before assembling or claiming COMPLETED
    const jobs = await readJobs(paths, goal.film_id).catch(() => []);
    const missingRenderIssues: string[] = [];
    const presentTakes: Array<{
      shot: ShotRecord;
      expectedAction: string;
      videoPath: string;
    }> = [];

    for (const s of goal.shots) {
      const shotRecord = await shotShow(paths, goal.film_id, s.id);
      const videoPath = await resolveShotVideoPath(paths, goal.film_id, shotRecord, jobs);
      if (!videoPath) {
        missingRenderIssues.push(`${s.id}: missing rendered MP4 take (run render_shot and job_download)`);
      } else {
        presentTakes.push({ shot: shotRecord, expectedAction: s.action, videoPath });
      }
    }

    if (missingRenderIssues.length > 0) {
      return {
        film_id: goal.film_id,
        title: goal.title,
        status: 'STAGED_AWAITING_RENDERS',
        total_shots: goal.shots.length,
        total_runtime_s: totalRuntime,
        spent_usd: spentUsd,
        remaining_budget_usd: remainingBudgetUsd,
        rough_cut_path: undefined,
        otio_timeline_path: timelineExport.otio_path,
        fcpxml_timeline_path: timelineExport.fcpxml_path,
        qc_audit_passed: false,
        qc_issues: missingRenderIssues,
      };
    }

    // 7. Audit every rendered take via real FFprobe + signalstats/VLM QC gate
    const cfg = loadConfig({ ...process.env, STUDIO_ROOT: root });
    const plateCandidate = join(paths.assetDir(goal.film_id, 'locations', locId), 'plate.png');
    const referencePlatePath = (await fileExists(plateCandidate)) ? plateCandidate : undefined;
    const primaryCharId = goal.characters?.[0]?.asset_id;
    const sheetCandidate = primaryCharId
      ? join(paths.assetDir(goal.film_id, 'characters', primaryCharId), 'sheet.png')
      : undefined;
    const referenceSheetPath = sheetCandidate && (await fileExists(sheetCandidate)) ? sheetCandidate : undefined;

    const auditResults = await Promise.all(
      presentTakes.map(async (take) => ({
        take,
        audit: await auditTake({
          mp4Path: take.videoPath,
          shotId: take.shot.id,
          expectedAction: take.expectedAction,
          durationS: take.shot.durationS,
          referenceSheetPath,
          referencePlatePath,
          criticApiKey: cfg.studioLive ? cfg.geminiApiKey : undefined,
        }),
      })),
    );

    const qcIssues: string[] = [];
    for (const { take, audit } of auditResults) {
      if (audit.verdict !== 'kept') {
        const reasonSummary = audit.reasons.length > 0 ? audit.reasons.join(', ') : `score ${audit.score} < 8.5`;
        qcIssues.push(`${take.shot.id}: QC rejected (${reasonSummary})`);
      }
    }

    if (qcIssues.length > 0) {
      return {
        film_id: goal.film_id,
        title: goal.title,
        status: 'FAILED',
        total_shots: goal.shots.length,
        total_runtime_s: totalRuntime,
        spent_usd: spentUsd,
        remaining_budget_usd: remainingBudgetUsd,
        rough_cut_path: undefined,
        otio_timeline_path: timelineExport.otio_path,
        fcpxml_timeline_path: timelineExport.fcpxml_path,
        qc_audit_passed: false,
        qc_issues: qcIssues,
      };
    }

    // 8. Real FFmpeg Rough-Cut Assembly & ffprobe Verification
    let roughCutFile: string | undefined;
    try {
      const assemble = await rpc('film_assemble', {
        film_id: goal.film_id,
        sequence: 'seq01',
        apply: true,
      });
      roughCutFile = assemble.output_rough_cut || assemble.output_path;
    } catch (err: unknown) {
      return {
        film_id: goal.film_id,
        title: goal.title,
        status: 'FAILED',
        total_shots: goal.shots.length,
        total_runtime_s: totalRuntime,
        spent_usd: spentUsd,
        remaining_budget_usd: remainingBudgetUsd,
        rough_cut_path: undefined,
        otio_timeline_path: timelineExport.otio_path,
        fcpxml_timeline_path: timelineExport.fcpxml_path,
        qc_audit_passed: false,
        qc_issues: [`film_assemble failed: ${(err as Error).message}`],
      };
    }

    const roughProbe = roughCutFile ? await probeMedia(roughCutFile) : undefined;
    if (!roughCutFile || !roughProbe || !roughProbe.exists || !roughProbe.hasVideo || roughProbe.durationS <= 0) {
      return {
        film_id: goal.film_id,
        title: goal.title,
        status: 'FAILED',
        total_shots: goal.shots.length,
        total_runtime_s: totalRuntime,
        spent_usd: spentUsd,
        remaining_budget_usd: remainingBudgetUsd,
        rough_cut_path: undefined,
        otio_timeline_path: timelineExport.otio_path,
        fcpxml_timeline_path: timelineExport.fcpxml_path,
        qc_audit_passed: false,
        qc_issues: ['rough_cut.mp4 missing or failed ffprobe decode verification'],
      };
    }

    // 9. Cloudflare R2 Upload if configured
    let r2Url: string | undefined;
    if (isR2Configured() && roughCutFile) {
      const r2Res = await uploadToR2(roughCutFile, `films/${goal.film_id}/rough_cut.mp4`);
      r2Url = r2Res.url;
    }

    return {
      film_id: goal.film_id,
      title: goal.title,
      status: 'COMPLETED',
      total_shots: goal.shots.length,
      total_runtime_s: totalRuntime,
      spent_usd: spentUsd,
      remaining_budget_usd: remainingBudgetUsd,
      rough_cut_path: roughCutFile,
      r2_public_url: r2Url,
      otio_timeline_path: timelineExport.otio_path,
      fcpxml_timeline_path: timelineExport.fcpxml_path,
      qc_audit_passed: true,
      qc_issues: [],
    };
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
}
