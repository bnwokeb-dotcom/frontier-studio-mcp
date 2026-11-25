// src/qa/critic.ts — Automated VLM & Signal Critic Gate (Universal Quality Gauntlet)
// Probes media via ffprobe, extracts representative keyframes, analyzes temporal/luminance
// signal stats via ffmpeg, and optionally dispatches Gemini Vision VLM evaluation.
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';

const execFile = promisify(execFileCb);

export interface CriticAuditRequest {
  mp4Path: string;
  shotId: string;
  expectedAction: string;
  referenceSheetPath?: string;
  referencePlatePath?: string;
  durationS: number;
  criticApiKey?: string;
  threshold?: number; // defaults to 8.5
}

export interface CriticAuditResult {
  score: number; // 0.0 to 10.0
  verdict: 'kept' | 'rejected';
  reasons: string[];
  metrics: {
    identityScore: number;
    temporalStabilityScore: number;
    lightingComplianceScore: number;
    kinematicsScore: number;
  };
  sampleFramePaths: string[];
  remediation?: string;
}

export interface MediaProbeResult {
  exists: boolean;
  fileBytes: number;
  hasVideo: boolean;
  hasAudio: boolean;
  width: number;
  height: number;
  fps: number;
  durationS: number;
  nbFrames: number;
  videoCodec?: string;
  audioCodec?: string;
  error?: string;
}

interface SignalDiagnostics {
  blackRatio: number;
  freezeRatio: number;
  yRangeAvg: number;
  yInnerRangeAvg: number;
  meanYAvg: number;
  maxYAvgJump: number;
  meanYdif: number;
  maxYdif: number;
  frameMotionCount: number;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function round1(val: number): number {
  return Number(val.toFixed(1));
}

function parseFrameRate(raw: string | undefined): number {
  if (!raw) return 0;
  if (raw.includes('/')) {
    const [numStr, denStr] = raw.split('/');
    const num = Number(numStr);
    const den = Number(denStr);
    if (Number.isFinite(num) && Number.isFinite(den) && den > 0) {
      return Number((num / den).toFixed(3));
    }
    return 0;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Number(n.toFixed(3)) : 0;
}

function sanitizeSegment(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 64) || 'clip';
}

/**
 * Probes an MP4/WAV media file via ffprobe to verify container, streams, dimensions, fps, and duration.
 */
export async function probeMedia(filePath: string): Promise<MediaProbeResult> {
  let fileBytes = 0;
  try {
    const st = await stat(filePath);
    if (!st.isFile() || st.size === 0) {
      return {
        exists: false,
        fileBytes: 0,
        hasVideo: false,
        hasAudio: false,
        width: 0,
        height: 0,
        fps: 0,
        durationS: 0,
        nbFrames: 0,
        error: 'missing_or_empty_file',
      };
    }
    fileBytes = st.size;
  } catch {
    return {
      exists: false,
      fileBytes: 0,
      hasVideo: false,
      hasAudio: false,
      width: 0,
      height: 0,
      fps: 0,
      durationS: 0,
      nbFrames: 0,
      error: 'missing_or_empty_file',
    };
  }

  try {
    const { stdout } = await execFile('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ]);
    const parsed = JSON.parse(stdout || '{}') as {
      streams?: Array<{
        codec_type?: string;
        codec_name?: string;
        width?: number;
        height?: number;
        r_frame_rate?: string;
        avg_frame_rate?: string;
        duration?: string;
        nb_frames?: string;
      }>;
      format?: { duration?: string };
    };

    const streams = parsed.streams ?? [];
    const videoStream = streams.find((s) => s.codec_type === 'video');
    const audioStream = streams.find((s) => s.codec_type === 'audio');

    const width = Number(videoStream?.width ?? 0);
    const height = Number(videoStream?.height ?? 0);
    const fps = parseFrameRate(videoStream?.avg_frame_rate) || parseFrameRate(videoStream?.r_frame_rate);
    const rawDuration = Number(videoStream?.duration ?? audioStream?.duration ?? parsed.format?.duration ?? 0);
    const durationS = Number.isFinite(rawDuration) && rawDuration > 0 ? Number(rawDuration.toFixed(3)) : 0;
    const rawNbFrames = Number(videoStream?.nb_frames ?? 0);
    const nbFrames = Number.isFinite(rawNbFrames) && rawNbFrames > 0 ? rawNbFrames : 0;

    return {
      exists: true,
      fileBytes,
      hasVideo: Boolean(videoStream && width > 0 && height > 0),
      hasAudio: Boolean(audioStream),
      width,
      height,
      fps,
      durationS,
      nbFrames,
      videoCodec: videoStream?.codec_name,
      audioCodec: audioStream?.codec_name,
    };
  } catch {
    return {
      exists: true,
      fileBytes,
      hasVideo: false,
      hasAudio: false,
      width: 0,
      height: 0,
      fps: 0,
      durationS: 0,
      nbFrames: 0,
      error: 'ffprobe_decode_error',
    };
  }
}

/**
 * Extracts 3 representative frames (15%, 50%, 85%) from an MP4 file.
 */
async function extractAuditFrames(mp4Path: string, outDir: string, durationS: number): Promise<string[]> {
  await mkdir(outDir, { recursive: true });
  const points = [
    { name: 'frame_15.png', time: (durationS * 0.15).toFixed(3) },
    { name: 'frame_50.png', time: (durationS * 0.50).toFixed(3) },
    { name: 'frame_85.png', time: (durationS * 0.85).toFixed(3) },
  ];

  const results = await Promise.all(
    points.map(async (pt) => {
      const dest = join(outDir, pt.name);
      try {
        await execFile('ffmpeg', ['-y', '-ss', pt.time, '-i', mp4Path, '-frames:v', '1', '-q:v', '2', dest]);
        const st = await stat(dest);
        return st.size > 0 ? dest : undefined;
      } catch {
        return undefined;
      }
    }),
  );
  return results.filter((p): p is string => p !== undefined);
}

function parseSignalNumbers(stderr: string, key: string): number[] {
  const re = new RegExp(`lavfi\\.signalstats\\.${key}=([0-9.eE+-]+)`, 'g');
  const values: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(stderr)) !== null) {
    const num = Number(match[1]);
    if (Number.isFinite(num)) values.push(num);
  }
  return values;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

/**
 * Runs FFmpeg blackdetect, freezedetect, and signalstats across all frames of an MP4.
 */
async function analyzeVideoSignals(mp4Path: string, durationS: number): Promise<SignalDiagnostics> {
  const freezeMinD = Math.min(0.4, Math.max(0.15, durationS * 0.4)).toFixed(2);
  const vf = `blackdetect=d=0.1:pic_th=0.98,freezedetect=n=-60dB:d=${freezeMinD},signalstats,metadata=print`;

  let stderr = '';
  try {
    const res = await execFile('ffmpeg', ['-i', mp4Path, '-vf', vf, '-f', 'null', '-'], { maxBuffer: 16 * 1024 * 1024 });
    stderr = res.stderr || '';
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string };
    stderr = e.stderr || e.message || '';
  }

  // Parse blackdetect intervals
  let totalBlackS = 0;
  const blackDurRe = /black_duration:\s*([0-9.]+)/g;
  let bm: RegExpExecArray | null;
  while ((bm = blackDurRe.exec(stderr)) !== null) {
    totalBlackS += Number(bm[1]) || 0;
  }
  if (totalBlackS === 0) {
    const blackStartMatch = stderr.match(/black_start:\s*([0-9.]+)/);
    if (blackStartMatch) {
      totalBlackS = Math.max(0, durationS - Number(blackStartMatch[1]));
    }
  }

  // Parse freezedetect durations (or open freeze_start running to EOF)
  let totalFreezeS = 0;
  const freezeDurRe = /lavfi\.freezedetect\.freeze_duration:\s*([0-9.]+)|freeze_duration:\s*([0-9.]+)/g;
  let fm: RegExpExecArray | null;
  while ((fm = freezeDurRe.exec(stderr)) !== null) {
    totalFreezeS += Number(fm[1] ?? fm[2]) || 0;
  }
  const freezeStartMatches = [...stderr.matchAll(/freeze_start:\s*([0-9.]+)/g)];
  if (freezeStartMatches.length > 0 && totalFreezeS === 0) {
    const firstFreezeStart = Number(freezeStartMatches[0][1]) || 0;
    totalFreezeS = Math.max(0, durationS - firstFreezeStart);
  }

  const yMins = parseSignalNumbers(stderr, 'YMIN');
  const yMaxs = parseSignalNumbers(stderr, 'YMAX');
  const yLows = parseSignalNumbers(stderr, 'YLOW');
  const yHighs = parseSignalNumbers(stderr, 'YHIGH');
  const yAvgs = parseSignalNumbers(stderr, 'YAVG');
  const yDifs = parseSignalNumbers(stderr, 'YDIF');

  const yRanges = yMaxs.map((maxVal, i) => Math.max(0, maxVal - (yMins[i] ?? maxVal)));
  const yInnerRanges = yHighs.map((hi, i) => Math.max(0, hi - (yLows[i] ?? hi)));
  const yDifsAfterFirst = yDifs.length > 1 ? yDifs.slice(1) : yDifs;

  let maxYAvgJump = 0;
  for (let i = 1; i < yAvgs.length; i++) {
    maxYAvgJump = Math.max(maxYAvgJump, Math.abs(yAvgs[i] - yAvgs[i - 1]));
  }

  const safeDur = Math.max(durationS, 0.1);
  return {
    blackRatio: clamp(totalBlackS / safeDur, 0, 1),
    freezeRatio: clamp(totalFreezeS / safeDur, 0, 1),
    yRangeAvg: mean(yRanges),
    yInnerRangeAvg: mean(yInnerRanges),
    meanYAvg: mean(yAvgs),
    maxYAvgJump,
    meanYdif: mean(yDifsAfterFirst),
    maxYdif: yDifsAfterFirst.length > 0 ? Math.max(...yDifsAfterFirst) : 0,
    frameMotionCount: yDifsAfterFirst.length,
  };
}

function buildLocalAuditResult(
  diag: SignalDiagnostics,
  framePaths: string[],
  frameSizes: number[],
  threshold: number,
): CriticAuditResult {
  const minSize = Math.min(...frameSizes);
  const maxSize = Math.max(...frameSizes);
  const sizeRatio = maxSize / Math.max(minSize, 1);

  const reasons: string[] = [];
  const isFlatFrame = diag.yRangeAvg < 12 || (diag.yInnerRangeAvg < 4 && diag.yRangeAvg < 20);
  const hasBlackFrames = diag.blackRatio > 0.05 || diag.meanYAvg < 20;
  const isFrozen = diag.freezeRatio >= 0.4 || (diag.frameMotionCount > 0 && diag.meanYdif < 0.02);
  const hasFlickerSpike = diag.maxYAvgJump > 35 || diag.maxYdif > 35;
  const hasGeometryMorph = sizeRatio > 8.0;
  const isOverexposed = !hasBlackFrames && diag.meanYAvg > 242;

  if (isFlatFrame) reasons.push('uniform_blank_frames');
  if (hasBlackFrames) reasons.push('black_frames_detected');
  if (isFrozen) reasons.push('frozen_video_detected');
  if (hasFlickerSpike) reasons.push('flicker_spike_detected');
  if (hasGeometryMorph) reasons.push('severe_temporal_geometry_morph');
  if (isOverexposed) reasons.push('overexposed_or_washed_frames');

  // 1. Identity & structural detail
  const identityScore = isFlatFrame
    ? 2.0
    : round1(
        clamp(
          7.8 + 1.6 * Math.min(1, diag.yRangeAvg / 180) - (hasGeometryMorph ? 4.0 : Math.min(0.8, (sizeRatio - 1) * 0.2)),
          0,
          9.8,
        ),
      );

  // 2. Lighting compliance (dynamic contrast + balanced exposure without penalizing B&W/noir)
  let lightingComplianceScore: number;
  if (diag.blackRatio > 0.25 || diag.meanYAvg < 20) {
    lightingComplianceScore = round1(clamp(2.5 - diag.blackRatio * 2.0, 0, 3.0));
  } else if (isFlatFrame || isOverexposed) {
    lightingComplianceScore = 3.0;
  } else {
    const contrastNorm = Math.min(1, diag.yInnerRangeAvg / 160);
    const exposureNorm = 1 - Math.min(1, Math.abs(diag.meanYAvg - 128) / 140);
    lightingComplianceScore = round1(clamp(7.5 + 1.3 * contrastNorm + 0.7 * exposureNorm - diag.blackRatio * 5.0, 0, 9.6));
  }

  // 3. Temporal stability
  let rawTemporal =
    9.5 -
    diag.blackRatio * 7.0 -
    diag.freezeRatio * 6.5 -
    (hasFlickerSpike ? 4.5 : Math.min(0.8, diag.maxYAvgJump / 40)) -
    (hasGeometryMorph ? 4.0 : 0);
  if (isFrozen) rawTemporal = Math.min(rawTemporal, 3.2);
  const temporalStabilityScore = round1(clamp(rawTemporal, 0, 9.8));

  // 4. Kinematics (real inter-frame motion without chaotic tearing)
  let kinematicsScore: number;
  if (isFrozen || diag.frameMotionCount === 0) {
    kinematicsScore = 2.5;
  } else if (diag.meanYdif > 35 || diag.maxYdif > 45) {
    if (!reasons.includes('excessive_motion_flicker')) reasons.push('excessive_motion_flicker');
    kinematicsScore = 3.5;
  } else {
    kinematicsScore = round1(clamp(8.3 + Math.min(1.1, Math.log10(1 + diag.meanYdif * 10) * 0.9), 0, 9.5));
  }

  let overallScore = round1((identityScore + temporalStabilityScore + lightingComplianceScore + kinematicsScore) / 4);
  if (reasons.length > 0 && overallScore >= threshold) {
    overallScore = round1(threshold - 0.5);
  }
  const verdict: 'kept' | 'rejected' = overallScore >= threshold && reasons.length === 0 ? 'kept' : 'rejected';

  return {
    score: overallScore,
    verdict,
    reasons,
    metrics: {
      identityScore,
      temporalStabilityScore,
      lightingComplianceScore,
      kinematicsScore,
    },
    sampleFramePaths: framePaths,
    remediation: verdict === 'rejected' ? 'perturb noise seed by +1 and re-render with valid motion and exposure' : undefined,
  };
}

/**
 * Executes the Automated Signal + VLM Critic audit on a rendered MP4 take.
 */
export async function auditTake(req: CriticAuditRequest): Promise<CriticAuditResult> {
  const threshold = req.threshold ?? 8.5;
  const probe = await probeMedia(req.mp4Path);

  if (!probe.exists || !probe.hasVideo || probe.durationS <= 0.05) {
    return {
      score: 0.0,
      verdict: 'rejected',
      reasons: ['failed_frame_extraction', probe.error ?? (!probe.hasVideo ? 'no_valid_video_stream' : 'zero_duration')],
      metrics: { identityScore: 0.0, temporalStabilityScore: 0.0, lightingComplianceScore: 0.0, kinematicsScore: 0.0 },
      sampleFramePaths: [],
      remediation: 'verify mp4 integrity and re-render with valid h264 video stream',
    };
  }

  if (probe.width < 64 || probe.height < 64) {
    return {
      score: 2.0,
      verdict: 'rejected',
      reasons: ['malformed_resolution'],
      metrics: { identityScore: 2.0, temporalStabilityScore: 2.0, lightingComplianceScore: 2.0, kinematicsScore: 2.0 },
      sampleFramePaths: [],
      remediation: 'render at valid video resolution (>= 64x64)',
    };
  }

  if (probe.nbFrames > 0 && probe.nbFrames < 2) {
    return {
      score: 2.0,
      verdict: 'rejected',
      reasons: ['insufficient_frame_count'],
      metrics: { identityScore: 2.0, temporalStabilityScore: 2.0, lightingComplianceScore: 2.0, kinematicsScore: 2.0 },
      sampleFramePaths: [],
      remediation: 're-render take with full motion frame sequence',
    };
  }

  const clipName = sanitizeSegment(basename(req.mp4Path, extname(req.mp4Path)));
  const auditDir = join(dirname(req.mp4Path), 'audit', `${clipName}_${sanitizeSegment(req.shotId)}`);
  const [frames, diag] = await Promise.all([
    extractAuditFrames(req.mp4Path, auditDir, probe.durationS),
    analyzeVideoSignals(req.mp4Path, probe.durationS),
  ]);

  if (frames.length === 0) {
    return {
      score: 0.0,
      verdict: 'rejected',
      reasons: ['failed_frame_extraction', 'ffmpeg_decode_error'],
      metrics: { identityScore: 0.0, temporalStabilityScore: 0.0, lightingComplianceScore: 0.0, kinematicsScore: 0.0 },
      sampleFramePaths: [],
      remediation: 'verify mp4 integrity and re-render with valid codec',
    };
  }

  const frameSizes = await Promise.all(frames.map(async (f) => (await readFile(f)).length));
  const localResult = buildLocalAuditResult(diag, frames, frameSizes, threshold);

  // If local signal/FFmpeg checks already detected technical video defects, reject immediately
  if (localResult.reasons.length > 0) {
    return localResult;
  }

  // Dispatch to Gemini Vision VLM when criticApiKey is configured
  if (req.criticApiKey) {
    try {
      const vlmResult = await evaluateWithVLM(req.criticApiKey, frames, req);
      return vlmResult;
    } catch (err) {
      console.warn(`[critic] VLM online evaluation error, falling back to local perceptual audit: ${(err as Error).message}`);
    }
  }

  return localResult;
}

/**
 * Online VLM Critic evaluation using Gemini Vision multimodal endpoint.
 */
async function evaluateWithVLM(apiKey: string, frames: string[], req: CriticAuditRequest): Promise<CriticAuditResult> {
  const frameBuffers = await Promise.all(frames.map((f) => readFile(f)));
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  if (req.referenceSheetPath) {
    try {
      const refData = await readFile(req.referenceSheetPath);
      parts.push({ text: 'REFERENCE CHARACTER 3-PANEL SHEET (Ground Truth Identity & Wardrobe):' });
      parts.push({ inlineData: { mimeType: 'image/png', data: refData.toString('base64') } });
    } catch {}
  }

  if (req.referencePlatePath) {
    try {
      const plateData = await readFile(req.referencePlatePath);
      parts.push({ text: 'REFERENCE LOCATION / STAGING KEYFRAME PLATE (Ground Truth Environment & Lighting):' });
      parts.push({ inlineData: { mimeType: 'image/png', data: plateData.toString('base64') } });
    } catch {}
  }

  parts.push({
    text: `You are the Lead Visual Effects Quality Critic on an A-list feature film set.
Inspect the 3 rendered video frames (15%, 50%, 85% into the shot) for Shot "${req.shotId}".
Expected Scene Action: "${req.expectedAction}"

Audit criteria (Score each 1-10):
1. Identity & Wardrobe: Do the character features, clothing, and silhouette match the reference sheet without drifting or face-swapping?
2. Temporal & Anatomical Coherence: Are there extra fingers, melting limbs, warping swords/props, or plastic AI distortion?
3. Lighting Compliance: Is lighting dramatic chiaroscuro with motivated contrast rather than flat digital lighting?
4. Kinematic Motion: Is the motion grounded and natural?

Output JSON ONLY in this exact format:
{
  "identity_score": 9.0,
  "temporal_stability_score": 8.8,
  "lighting_compliance_score": 9.2,
  "kinematics_score": 9.0,
  "overall_score": 9.0,
  "reasons": ["minor_cloth_drift_frame_3"],
  "verdict": "kept"
}
Note: If overall_score is below 8.5, verdict MUST be "rejected".`,
  });

  for (let i = 0; i < frameBuffers.length; i++) {
    parts.push({ text: `RENDERED SHOT FRAME ${i + 1}:` });
    parts.push({ inlineData: { mimeType: 'image/png', data: frameBuffers[i].toString('base64') } });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
    },
  );

  if (!res.ok) {
    throw new Error(`VLM critic API error: HTTP ${res.status}`);
  }

  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanJson);

  const overallScore = Number(parsed.overall_score ?? 0);
  const verdict = overallScore >= (req.threshold ?? 8.5) ? 'kept' : 'rejected';

  return {
    score: overallScore,
    verdict,
    reasons: parsed.reasons ?? [],
    metrics: {
      identityScore: Number(parsed.identity_score ?? 0),
      temporalStabilityScore: Number(parsed.temporal_stability_score ?? 0),
      lightingComplianceScore: Number(parsed.lighting_compliance_score ?? 0),
      kinematicsScore: Number(parsed.kinematics_score ?? 0),
    },
    sampleFramePaths: frames,
    remediation: verdict === 'rejected' ? 'VLM flagged severe visual defects; perturb seed and re-render' : undefined,
  };
}
