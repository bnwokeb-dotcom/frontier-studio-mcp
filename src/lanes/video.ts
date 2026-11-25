// src/lanes/video.ts — the VideoLane contract (M3).
//
// Binding shapes from the M3 plan (Task 1): an ASYNC lane — submit returns a
// job ref, status polls, result gates on `completed` and downloads. Vultr
// facts are VERIFIED (spec §12.1): only `completed` jobs bill (failed /
// cancelled / expired cost $0); the actual charge lives in `usage.cost`.

export type VideoQuality = 'turbo' | 'standard' | 'max' | 'ultra' | '2K' | '4K';

export const VULTR_PRICING_PER_SECOND: Record<VideoQuality, number> = {
  turbo: 0.06,
  standard: 0.09,
  max: 0.18,
  '2K': 0.18,
  '4K': 0.18,
  ultra: 0.30,
};

export interface VideoLaneRequest {
  prompt: string; // ≤8000 chars, enforced by caller + lane
  durationS: number; // 4–15 for h3
  aspectRatio: string; // enum per API
  quality: VideoQuality; // default 'standard'
  firstFrame?: { data: Buffer; mimeType: string }; // frame_images[0], mutually exclusive with references
  lastFrame?: { data: Buffer; mimeType: string };
}

export interface VideoJobRef {
  jobId: string;
  pollingUrl?: string;
}

export interface VideoJobStatus {
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'expired';
  progress: number;
  errorVerbatim?: string;
  warnings?: string[];
  /** Provider content retention (Vultr keeps content 7 days) — lifecycle tools
   *  compute the expiry warning from it. Absent when the payload sends none. */
  expiresAt?: string;
}

export interface VideoArtifact {
  data: Buffer;
  jobId: string;
  costUsd: number;
  billedSeconds?: number;
  realSeconds?: number;
  width?: number;
  height?: number;
  hasAudio?: boolean;
}

export interface VideoLane {
  readonly cameraVocabulary: 'named';
  /** GET /v1/videos/models; absent → errLaneDown naming the check. */
  verifyModel(): Promise<'minimax-h3'>;
  /** VULTR_PRICING_PER_SECOND[req.quality] × durationS. */
  estimatePrice(req: VideoLaneRequest): number;
  /** POST /v1/videos (202 → id, status pending). */
  submit(req: VideoLaneRequest): Promise<VideoJobRef>;
  /** GET /v1/videos/{id}. */
  status(ref: VideoJobRef): Promise<VideoJobStatus>;
  /** GET content after status completed; costUsd from usage.cost. */
  result(ref: VideoJobRef): Promise<VideoArtifact>;
}

// H3 renders whole 24fps blocks — real lengths run long (spec §12.1):
// requested seconds → measured real seconds of the delivered mp4.
export const H3_REAL_LENGTHS: Record<number, number> = {
  4: 4.46,
  5: 5.17,
  6: 6.58,
  7: 7.29,
  8: 8.0,
  9: 9.42,
  10: 10.12,
  11: 11.54,
  12: 12.25,
  13: 13.67,
  14: 14.38,
  15: 15.08,
};

// Verified live Vultr default ('standard' 768p) rate per second.
// Used as the default budget-quote rate; actual spend always reconciles from
// usage.cost on job_download.
export const H3_ESTIMATE_USD_PER_SECOND = VULTR_PRICING_PER_SECOND.standard;
