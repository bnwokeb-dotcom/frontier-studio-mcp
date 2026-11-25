// src/lanes/vultr.ts — the Vultr Serverless Inference video lane (MiniMax-H3).
//
// Async realization of VideoLane: POST /v1/videos (202) → poll GET
// /v1/videos/{id} → download GET /v1/videos/{id}/content. Facts are VERIFIED
// (spec §12.1): auth is `Authorization: Bearer $VULTR_INFERENCE_API_KEY`;
// only `completed` jobs bill (failed/cancelled/expired cost $0); the actual
// charge lives in `usage.cost` of the completed job payload.
//
// Model-ID pinning (spec §8, the field-reported silent-fallback trap): submit
// verifies the catalog (GET /v1/videos/models, per-process cache) before every
// POST — a wrong/renamed id is refused, never silently billed against a
// fallback model.
//
// Frames travel as data URLs in image_url.url (bring-up item: data-URL
// acceptance unverified; the documented fallback is multipart binary).
// v1 sends only firstFrame — firstFrame AND lastFrame together are refused
// (frames XOR references).
import type { StudioConfig } from '../config.js';
import { errAuth, errJobFailed, errLaneDown, errValidation } from '../errors.js';
import type { FetchLike } from './types.js';
import {
  VULTR_PRICING_PER_SECOND,
  type VideoArtifact,
  type VideoJobRef,
  type VideoJobStatus,
  type VideoLane,
  type VideoLaneRequest,
} from './video.js';

/** The parts of a Vultr video job body this lane reads. */
interface VultrJobBody {
  status?: unknown;
  progress?: unknown;
  error?: unknown;
  expires_at?: unknown;
  usage?: { cost?: unknown };
  output?: {
    duration?: unknown;
    width?: unknown;
    height?: unknown;
    has_audio?: unknown;
  };
}

const STATUS_ENUM = ['pending', 'in_progress', 'completed', 'failed', 'cancelled', 'expired'];

const PROMPT_CAP = 8000;

type EndpointContext = 'submit' | 'status' | 'content' | 'models';

// Endpoint-appropriate fix text for 400–499 refusals (binding error map:
// errValidation with provider text; the submit variant names the composer law).
const FOUR_HUNDREDS_NEXT: Record<EndpointContext, string> = {
  submit:
    'check the prompt (8000-char cap — shorten the action text, never the descriptors), duration 4–15, aspect_ratio enum, quality enum',
  status: 'check the job id against jobs.json, then retry',
  content: 'check the job id and expires_at — Vultr keeps content for 7 days',
  models: 'check GET /v1/videos/models',
};

export class VultrLane implements VideoLane {
  static readonly BASE_URL = 'https://api.vultrinference.com/v1';
  static readonly MODEL = 'minimax-h3';

  readonly cameraVocabulary = 'named' as const;

  /** Job payloads seen this process, keyed by the ref's jobId. */
  private jobs = new Map<string, VultrJobBody>();
  /** Catalog ids seen this process (the silent-fallback guard). */
  private models: Set<string> | undefined;

  constructor(
    private apiKey: string,
    private fetchFn: FetchLike = fetch,
  ) {}

  static fromConfig(cfg: StudioConfig): VultrLane {
    if (!cfg.vultrApiKey) {
      throw errAuth(
        'VULTR_INFERENCE_API_KEY is not set',
        'set VULTR_INFERENCE_API_KEY in the environment, then retry',
      );
    }
    return new VultrLane(cfg.vultrApiKey);
  }

  estimatePrice(req: VideoLaneRequest): number {
    const rate = VULTR_PRICING_PER_SECOND[req.quality] ?? VULTR_PRICING_PER_SECOND.standard;
    return Math.round(rate * req.durationS * 10000) / 10000;
  }

  async verifyModel(): Promise<'minimax-h3'> {
    if (!this.models) {
      this.models = await this.fetchModels();
    }
    if (!this.models.has(VultrLane.MODEL)) {
      throw errLaneDown(
        'model minimax-h3 not in Vultr catalog',
        'check GET /v1/videos/models',
      );
    }
    return VultrLane.MODEL;
  }

  async submit(req: VideoLaneRequest): Promise<VideoJobRef> {
    // Composer law: the prompt cap is enforced here too (the caller enforces
    // it as well) — the refusal precedes any fetch.
    if (req.prompt.length > PROMPT_CAP) {
      throw errValidation(
        `prompt is ${req.prompt.length} chars — the H3 composer cap is ${PROMPT_CAP}`,
        'shorten the action text, never the descriptors',
      );
    }
    // v1 sends only firstFrame: two frames would be two identity carriers.
    // (The frames-XOR-references API law; last-frame chaining is unwired v1.)
    if (req.firstFrame && req.lastFrame) {
      throw errValidation(
        'firstFrame and lastFrame are mutually exclusive in v1 — the lane sends only firstFrame (frames XOR references)',
        'submit with firstFrame only, or no frames',
      );
    }
    // Model-ID pinning: verify the catalog before every POST — a wrong/renamed
    // id must be refused, never silently billed against a fallback model.
    // The per-process cache makes this free after the first call.
    await this.verifyModel();

    const frameImages: Array<{ frame_type: string; image_url: { url: string } }> = [];
    if (req.firstFrame) frameImages.push(frameEntry('first_frame', req.firstFrame));
    if (req.lastFrame) frameImages.push(frameEntry('last_frame', req.lastFrame));

    const body = {
      model: VultrLane.MODEL,
      prompt: req.prompt,
      duration: req.durationS,
      aspect_ratio: req.aspectRatio,
      quality: req.quality,
      generate_audio: true,
      ...(frameImages.length > 0 ? { frame_images: frameImages } : {}),
    };

    const raw = await this.send(
      'POST',
      `${VultrLane.BASE_URL}/videos`,
      'submit',
      JSON.stringify(body),
    );
    const json = this.parseJsonObject(raw, 'Vultr submit response');
    const id = json.id;
    if (typeof id !== 'string' || id === '') {
      throw errLaneDown(
        'Vultr submit response has no job id (unexpected response shape)',
        'retry; if it persists the API contract may have changed',
      );
    }
    this.jobs.set(id, json as VultrJobBody);
    return { jobId: id };
  }

  async status(ref: VideoJobRef): Promise<VideoJobStatus> {
    const body = await this.fetchJob(ref.jobId);
    return this.mapStatus(body);
  }

  async result(ref: VideoJobRef): Promise<VideoArtifact> {
    // A cached COMPLETED payload for this job short-circuits the poll (the
    // tool layer always gates on status() first); otherwise poll fresh —
    // downloads must also work in a later process, where the cache is cold.
    let body = this.jobs.get(ref.jobId);
    if (!body || body.status !== 'completed') {
      body = await this.fetchJob(ref.jobId);
    }
    const st = this.mapStatus(body);
    if (st.status === 'failed') {
      throw errJobFailed(
        st.errorVerbatim ?? 'Vultr job failed without provider error text',
        'inspect jobs.json; failed jobs bill $0',
      );
    }
    if (st.status !== 'completed') {
      throw errValidation(
        `video job is not completed yet (status: ${st.status}) — content exists only on a completed job`,
        'poll job_status until completed, then job_download',
      );
    }
    const cost = usageCost(body);
    const data = await this.downloadContent(ref.jobId);
    const out = (body.output ?? {}) as Record<string, unknown>;
    return {
      data,
      jobId: ref.jobId,
      costUsd: cost,
      ...(typeof out.duration === 'number' ? { realSeconds: out.duration } : {}),
      ...(typeof out.width === 'number' ? { width: out.width } : {}),
      ...(typeof out.height === 'number' ? { height: out.height } : {}),
      ...(typeof out.has_audio === 'boolean' ? { hasAudio: out.has_audio } : {}),
    };
  }

  // ---- internals ----------------------------------------------------------

  private headers(withBody: boolean): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      ...(withBody ? { 'content-type': 'application/json' } : {}),
    };
  }

  private async fetchModels(): Promise<Set<string>> {
    const raw = await this.send('GET', `${VultrLane.BASE_URL}/videos/models`, 'models');
    const json = this.parseJsonObject(raw, 'Vultr models catalog');
    const list = Array.isArray(json.models)
      ? json.models
      : Array.isArray(json.data)
        ? json.data
        : null;
    if (!list) {
      throw errLaneDown(
        'Vultr models catalog has no models or data array (unexpected response shape)',
        'check GET /v1/videos/models',
      );
    }
    const ids = new Set<string>();
    for (const entry of list as unknown[]) {
      if (typeof entry === 'string') {
        ids.add(entry);
      } else if (entry !== null && typeof entry === 'object') {
        const id = (entry as { id?: unknown }).id;
        if (typeof id === 'string') ids.add(id);
      }
    }
    return ids;
  }

  private async fetchJob(jobId: string): Promise<VultrJobBody> {
    const raw = await this.send('GET', `${VultrLane.BASE_URL}/videos/${jobId}`, 'status');
    const json = this.parseJsonObject(raw, 'Vultr job payload');
    this.jobs.set(jobId, json as VultrJobBody);
    return json as VultrJobBody;
  }

  private mapStatus(body: VultrJobBody): VideoJobStatus {
    const status = body.status;
    if (typeof status !== 'string' || !(STATUS_ENUM as string[]).includes(status)) {
      throw errLaneDown(
        `Vultr job status '${String(status)}' is outside the documented enum (unexpected response shape)`,
        'retry; if it persists the API contract may have changed',
      );
    }
    return {
      status: status as VideoJobStatus['status'],
      progress: typeof body.progress === 'number' ? body.progress : 0,
      ...(typeof body.error === 'string' && body.error !== ''
        ? { errorVerbatim: body.error }
        : {}),
      ...(typeof body.expires_at === 'string' && body.expires_at !== ''
        ? { expiresAt: body.expires_at }
        : {}),
    };
  }

  private async downloadContent(jobId: string): Promise<Buffer> {
    const url = `${VultrLane.BASE_URL}/videos/${jobId}/content`;
    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await this.fetchFn(url, { method: 'GET', headers: this.headers(false) });
    } catch (e) {
      throw errLaneDown(
        `Vultr unreachable (${e instanceof Error ? e.message : String(e)})`,
        'retry; if it persists check the Vultr status page',
      );
    }
    if (!res.ok) {
      // Error bodies are JSON text; the binary read only happens on ok. A
      // failing error-body read maps to LANE_DOWN like every other transport
      // fault — no raw errors escape the lane.
      let raw = '';
      try {
        raw = await res.text();
      } catch (e) {
        throw errLaneDown(
          `Vultr unreachable (${e instanceof Error ? e.message : String(e)})`,
          'retry; if it persists check the Vultr status page',
        );
      }
      this.throwForHttp('content', res.status, raw);
    }
    if (typeof res.arrayBuffer !== 'function') {
      throw errLaneDown(
        'Vultr content download failed (the injected fetch cannot read binary bodies)',
        'retry; if it persists check the lane wiring',
      );
    }
    try {
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      throw errLaneDown(
        `Vultr content download failed (${e instanceof Error ? e.message : String(e)})`,
        'retry; if it persists check the Vultr status page',
      );
    }
  }

  /** JSON GET/POST with the auth header; maps the HTTP error surface. */
  private async send(
    method: string,
    url: string,
    context: EndpointContext,
    body?: string,
  ): Promise<string> {
    let res: Awaited<ReturnType<FetchLike>>;
    let raw: string;
    try {
      res = await this.fetchFn(url, {
        method,
        headers: this.headers(body !== undefined),
        ...(body !== undefined ? { body } : {}),
      });
      raw = await res.text();
    } catch (e) {
      throw errLaneDown(
        `Vultr unreachable (${e instanceof Error ? e.message : String(e)})`,
        'retry; if it persists check the Vultr status page',
      );
    }
    if (!res.ok) {
      this.throwForHttp(context, res.status, raw);
    }
    return raw;
  }

  /** The binding error map: 401/403 AUTH; 400–499 VALIDATION; 5xx LANE_DOWN. */
  private throwForHttp(context: EndpointContext, status: number, raw: string): never {
    if (status === 401 || status === 403) {
      throw errAuth(
        'Vultr rejected the API key',
        'check VULTR_INFERENCE_API_KEY in the environment, then retry',
      );
    }
    if (status >= 400 && status < 500) {
      throw errValidation(
        `Vultr rejected the ${context} request: ${this.providerError(raw)}`,
        FOUR_HUNDREDS_NEXT[context],
      );
    }
    throw errLaneDown(
      `Vultr unreachable (HTTP ${status})`,
      'retry; if it persists check the Vultr status page',
    );
  }

  private parseJsonObject(raw: string, what: string): Record<string, unknown> {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw errLaneDown(
        `${what} is malformed JSON (unexpected response shape)`,
        'retry; if it persists the API contract may have changed',
      );
    }
    if (json == null || typeof json !== 'object' || Array.isArray(json)) {
      throw errLaneDown(
        `${what} is not a JSON object (unexpected response shape)`,
        'retry; if it persists the API contract may have changed',
      );
    }
    return json as Record<string, unknown>;
  }

  private providerError(raw: string): string {
    try {
      const json = JSON.parse(raw) as { error?: { message?: string } | string; detail?: string };
      if (typeof json.error === 'string') return json.error;
      if (typeof json.error?.message === 'string') return json.error.message;
      if (typeof json.detail === 'string') return json.detail;
    } catch {
      // not JSON — fall through to the raw body text
    }
    return raw;
  }
}

// data:image/png;base64,… in image_url.url (Vultr expects frame_type; type kept for backwards compat).
function frameEntry(frameType: 'first_frame' | 'last_frame', f: { data: Buffer; mimeType: string }) {
  return {
    frame_type: frameType,
    type: frameType,
    image_url: { url: `data:${f.mimeType};base64,${f.data.toString('base64')}` },
  };
}

// The money truth: a completed job always carries usage.cost (spec §12.1);
// a missing cost must fail loudly — never silently bill $0.
function usageCost(body: VultrJobBody): number {
  const cost = body.usage?.cost;
  if (typeof cost !== 'number' || Number.isNaN(cost)) {
    throw errLaneDown(
      'completed job payload has no usage.cost (unexpected response shape)',
      'retry; if it persists the billing contract may have changed — do not treat the render as free',
    );
  }
  return cost;
}
