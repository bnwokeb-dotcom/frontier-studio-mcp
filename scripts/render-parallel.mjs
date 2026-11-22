// scripts/render-parallel.mjs — Ultra-Fast Batch & Parallel Pipeline for Frontier Studio MCP
// Dispatches independent shots concurrently to Vultr Serverless Inference (MiniMax H3),
// polls all jobs in a non-blocking parallel loop, auto-extracts tail frames with FFmpeg,
// auto-chains continuous motion shots, and triggers rough-cut assembly upon completion.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { readText, readJson, appendLine } from '../src/store/fs.js';
import { studioPaths } from '../src/store/paths.js';
import { filmShow } from '../src/store/film.js';
import { loadConfig } from '../src/config.js';
import { VultrLane } from '../src/lanes/vultr.js';
import { composeH3Prompt } from '../src/tools/h3prompt.js';
import { ensureBudget, recordSpend } from '../src/budget.js';
import { auditTake } from '../src/qa/critic.js';

const execFile = promisify(execFileCb);

const cfg = loadConfig();
if (!cfg.vultrApiKey) {
  console.error('❌ VULTR_INFERENCE_API_KEY is not set in .env');
  process.exit(1);
}
if (!cfg.studioLive) {
  console.error('❌ STUDIO_LIVE=1 is required for live generation');
  process.exit(1);
}

const paths = studioPaths(cfg.studioRoot);
const filmId = process.env.FILM_ID || 'film_last_deal';
const meta = await filmShow(paths, filmId);
console.log(`🎬 FRONTIER STUDIO ULTRA-FAST PARALLEL ENGINE`);
console.log(`Film: "${meta.title}" (${filmId})`);
console.log(`Budget: $${meta.budgetUsd} | Current Spent: $${(meta.spentUsd ?? 0).toFixed(2)}`);

const lane = new VultrLane(cfg.vultrApiKey);
await lane.verifyModel();
console.log(`✅ Model verified: minimax-h3 (Cluster active)\n`);

const shotsDir = `${cfg.studioRoot}/films/${filmId}/shots`;
const shotFiles = (await readdir(shotsDir)).filter((f) => f.endsWith('.json')).sort();
const voiceOf = async (assetId) => readText(`${cfg.studioRoot}/films/${filmId}/assets/characters/${assetId}/voice.md`);
const geoLock = meta.sequences?.seq01?.geoLocked;

// Helper: Extract tail frame of rendered mp4 using local FFmpeg
async function extractTailFrame(mp4Path, outputPath) {
  try {
    await execFile('ffmpeg', ['-y', '-sseof', '-0.1', '-i', mp4Path, '-frames:v', '1', '-q:v', '2', outputPath]);
    return true;
  } catch (err) {
    return false;
  }
}

// Locate keyframe plate
async function findPlateForShot(shot) {
  for (const ref of shot.refs) {
    if (ref.role !== 'location' && ref.role !== 'style') continue;
    const kindDir = ref.role === 'location' ? 'locations' : 'styles';
    try {
      const data = await readFile(`${cfg.studioRoot}/films/${filmId}/assets/${kindDir}/${ref.assetId}/plate.png`);
      return { data: Buffer.from(data), assetId: ref.assetId };
    } catch {}
  }
  return null;
}

// 1. Prepare all shots
const prepared = [];

for (const f of shotFiles) {
  const shot = await readJson(`${shotsDir}/${f}`);
  if (shot.durationS < 4 || shot.durationS > 15) {
    console.log(`⚠️ Skipping ${shot.id}: duration ${shot.durationS}s outside H3 range (4–15s)`);
    continue;
  }

  const dialogue = [];
  for (const d of shot.audioBlock?.dialogue ?? []) {
    dialogue.push({ voiceRef: d.voiceRef, voiceDescriptor: await voiceOf(d.voiceRef), line: d.line });
  }

  const prompt = composeH3Prompt({
    action: shot.action,
    camera: shot.camera,
    geoBlock: geoLock,
    dialogue,
    sfx: shot.audioBlock?.sfx,
    durationS: shot.durationS,
    platePresents: true,
  });

  const isContinuous = shot.continuity === 'continuous' || Boolean(shot.chainFromShotId);
  prepared.push({
    shot,
    prompt,
    durationS: shot.durationS,
    isContinuous,
    chainParentId: shot.chainFromShotId,
  });
}

console.log(`📋 Loaded ${prepared.length} shots.`);

// 2. Submit independent shots simultaneously in parallel
const activeJobs = new Map(); // jobId -> { shotId, prompt, estimate, durationS }
const completedShots = new Map(); // shotId -> { mp4Path, tailFramePath, costUsd }
const retakeCounts = new Map(); // shotId -> retake attempt count

async function submitJob(pShot, firstFrameBuffer) {
  const estimate = lane.estimatePrice({ prompt: pShot.prompt, durationS: pShot.durationS, aspectRatio: '16:9', quality: 'standard' });
  await ensureBudget(paths, filmId, estimate);

  const job = await lane.submit({
    prompt: pShot.prompt,
    durationS: pShot.durationS,
    aspectRatio: '16:9',
    quality: 'standard',
    firstFrame: { data: firstFrameBuffer, mimeType: 'image/png' },
  });

  await recordSpend(paths, filmId, estimate);
  await appendLine(
    paths.ledgerPath(filmId),
    JSON.stringify({
      ts: new Date().toISOString(),
      tool: 'render_shot',
      lane: 'vultr',
      film_id: filmId,
      cost_usd: estimate,
      verdict: 'pending',
      job_id: job.jobId,
      artifact_path: '',
      estimated: true,
    })
  );

  console.log(`🚀 [SUBMITTED] ${pShot.shot.id} -> Job ${job.jobId} (Reserved $${estimate.toFixed(2)})`);
  activeJobs.set(job.jobId, { ...pShot, jobId: job.jobId, estimate });
}

// Launch all independent shots concurrently
console.log(`\n⚡ Submitting independent shots concurrently to Vultr...`);
await Promise.all(
  prepared
    .filter((p) => !p.isContinuous)
    .map(async (pShot) => {
      const plate = await findPlateForShot(pShot.shot);
      if (!plate) {
        console.error(`❌ No plate found for shot ${pShot.shot.id}`);
        return;
      }
      await submitJob(pShot, plate.data);
    })
);

// 3. Monitor and poll all jobs in parallel
console.log(`\n⏳ Polling Vultr cluster for completions in parallel...`);

const pollIntervalMs = 10000;
const deadline = Date.now() + 25 * 60 * 1000; // 25 min timeout

while (activeJobs.size > 0 && Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, pollIntervalMs));

  const jobIds = Array.from(activeJobs.keys());
  for (const jobId of jobIds) {
    const meta = activeJobs.get(jobId);
    try {
      const st = await lane.status({ jobId });
      if (st.status === 'completed') {
        activeJobs.delete(jobId);
        console.log(`\n🎉 [COMPLETE] Shot ${meta.shot.id} (Job ${jobId}) completed! Downloading...`);

        const art = await lane.result({ jobId });
        const outDir = `${cfg.studioRoot}/films/${filmId}/renders/${jobId}`;
        await mkdir(outDir, { recursive: true });
        const mp4Path = `${outDir}/shot.mp4`;
        const tailPath = `${outDir}/tail_frame.png`;

        await writeFile(mp4Path, art.data);
        await extractTailFrame(mp4Path, tailPath);

        // ── Automated VLM Quality Critic Gate (Universal Gauntlet) ───────────────
        console.log(`🧐 [CRITIC GATE] Auditing Shot ${meta.shot.id} for visual coherence & identity...`);
        const critic = await auditTake({
          mp4Path,
          shotId: meta.shot.id,
          expectedAction: meta.shot.action,
          durationS: meta.durationS,
          criticApiKey: cfg.geminiApiKey,
          threshold: 8.5,
        });

        console.log(
          `📊 [CRITIC RESULT] ${meta.shot.id} -> Score: ${critic.score}/10 [Verdict: ${critic.verdict.toUpperCase()}]`
        );
        if (critic.reasons.length > 0) {
          console.log(`   Notice: ${critic.reasons.join(', ')}`);
        }

        const delta = art.costUsd - meta.estimate;
        if (Math.abs(delta) > 0.001) await recordSpend(paths, filmId, delta);
        await appendLine(
          paths.ledgerPath(filmId),
          JSON.stringify({
            ts: new Date().toISOString(),
            tool: 'job_download',
            lane: 'vultr',
            film_id: filmId,
            cost_usd: delta,
            verdict: critic.verdict,
            job_id: jobId,
            artifact_path: mp4Path,
            critic_score: critic.score,
            critic_reasons: critic.reasons,
            note: 'reconcile_with_critic',
          })
        );

        if (critic.verdict === 'rejected') {
          const attempts = (retakeCounts.get(meta.shot.id) || 0) + 1;
          retakeCounts.set(meta.shot.id, attempts);
          if (attempts <= 2) {
            console.warn(`🔁 [AUTO-RETAKE] Shot ${meta.shot.id} scored ${critic.score}/10. Launching Retake Take #${attempts + 1} with enhanced stabilization...`);
            const plate = await findPlateForShot(meta.shot);
            if (plate) {
              const enhancedPrompt = `${meta.prompt}, absolute subject stability, high temporal coherence, zero warping, locked face geometry.`;
              await submitJob({ ...meta, prompt: enhancedPrompt }, plate.data);
            }
          } else {
            console.warn(`⚠️ [QUALITY ESCALATION] Shot ${meta.shot.id} failed after 2 retakes. Flagged for review.`);
          }
          continue;
        }

        console.log(`💾 Saved ${mp4Path} (Cost: $${art.costUsd.toFixed(2)})`);
        completedShots.set(meta.shot.id, { mp4Path, tailPath, costUsd: art.costUsd });

        // Trigger any dependent continuous shots waiting for this tail frame
        const waitingShots = prepared.filter((p) => p.isContinuous && (p.chainParentId === meta.shot.id || !p.chainParentId));
        for (const wShot of waitingShots) {
          if (!completedShots.has(wShot.shot.id)) {
            console.log(`🔗 [CONTINUOUS CHAIN] Launching ${wShot.shot.id} with tail-frame from ${meta.shot.id}...`);
            const tailBytes = await readFile(tailPath);
            await submitJob(wShot, tailBytes);
          }
        }
      } else if (['failed', 'cancelled', 'expired'].includes(st.status)) {
        activeJobs.delete(jobId);
        console.error(`❌ [FAILED] Job ${jobId} ended with status: ${st.status}`);
      } else {
        process.stdout.write(`•`);
      }
    } catch (err) {
      // transient poll failure, retry next tick
    }
  }
}

// 4. Final Assembly
console.log(`\n========================================`);
console.log(`🏁 All batch generations finished!`);
console.log(`Completed shots: ${completedShots.size} of ${prepared.length}`);

// Generate concat manifest for FFmpeg
const timelinesDir = join(paths.filmDir(filmId), 'timelines');
await mkdir(timelinesDir, { recursive: true });

const clips = [];
for (const p of prepared) {
  const c = completedShots.get(p.shot.id);
  if (c) clips.push(c.mp4Path);
}

if (clips.length > 0) {
  const manifestPath = join(timelinesDir, 'concat_manifest.txt');
  const manifestContent = clips.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n');
  await writeFile(manifestPath, manifestContent, 'utf8');

  const roughCutPath = join(paths.rendersDir(filmId), 'rough_cut.mp4');
  console.log(`🎞️ Assembling rough cut with FFmpeg...`);
  try {
    await execFile('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', manifestPath, '-c', 'copy', roughCutPath]);
    console.log(`✨ ROUGH CUT GENERATED: ${roughCutPath}`);
  } catch (e) {
    console.log(`FFmpeg concat note: ${e.message}`);
  }
}

const finalMeta = await filmShow(paths, filmId);
console.log(`\n💰 Final Spent: $${(finalMeta.spentUsd ?? 0).toFixed(2)} of $${finalMeta.budgetUsd}`);
console.log(`========================================\n`);
