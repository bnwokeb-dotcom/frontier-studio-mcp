// src/lanes/vertex_video.ts — GCP Vertex AI multi-frame video lane (Veo / OmniFlash via ADC Bearer auth).
import { Buffer } from 'node:buffer';
import type { StudioConfig } from '../config.js';
import { errAuth, errJobFailed, errLaneDown, errValidation } from '../errors.js';
import { loadAuthorizedUserCreds, refreshAdcAccessToken, type AuthorizedUserCreds } from './adc.js';
import type { FetchLike } from './types.js';
import type {
  VideoArtifact,
  VideoJobRef,
  VideoJobStatus,
  VideoLane,
  VideoLaneRequest,
} from './video.js';

const VERTEX_VIDEO_RATE_USD_PER_S = 0.25;
const DEFAULT_VERTEX_MODEL = 'veo-3.0-generate-preview';

interface VertexOperationBody {
  name?: string;
  done?: boolean;
  error?: { message?: string };
  response?: {
    videos?: Array<{
      bytesBase64Encoded?: string;
      mimeType?: string;
      gcsUri?: string;
      videoUri?: string;
    }>;
  };
}

export class VertexVideoLane implements VideoLane {
  readonly cameraVocabulary = 'named' as const;

  private ops = new Map<string, VertexOperationBody>();
  private accessToken = '';
  private tokenExpiresAt = 0;

  constructor(
    private projectId: string,
    private location: string,
    private model: string,
    private creds: AuthorizedUserCreds,
    private fetchFn: FetchLike = fetch,
  ) {}

  static async fromConfig(
    cfg: StudioConfig,
    fetchFn: FetchLike = fetch,
    env: Record<string, string | undefined> = process.env,
  ): Promise<VertexVideoLane> {
    const projectId = (cfg.gcpProjectId ?? env.GCP_PROJECT_ID)?.trim();
    if (!projectId) {
      throw errAuth('GCP_PROJECT_ID is not set', 'set GCP_PROJECT_ID in .env for Vertex video generation');
    }
    const adcPath = (cfg.googleApplicationCredentials ?? env.GOOGLE_APPLICATION_CREDENTIALS)?.trim();
    if (!adcPath) {
      throw errAuth(
        'GOOGLE_APPLICATION_CREDENTIALS is not set',
        'set GOOGLE_APPLICATION_CREDENTIALS or run gcloud auth application-default login',
      );
    }
    const creds = await loadAuthorizedUserCreds(adcPath);
    const model = env.VERTEX_VIDEO_MODEL?.trim() || DEFAULT_VERTEX_MODEL;
    return new VertexVideoLane(projectId, cfg.vertexLocation || 'us-central1', model, creds, fetchFn);
  }

  private async ensureToken(): Promise<string> {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
      const tok = await refreshAdcAccessToken(this.creds, this.fetchFn);
      this.accessToken = tok.access_token;
      this.tokenExpiresAt = Date.now() + (tok.expires_in - 60) * 1000;
    }
    return this.accessToken;
  }

  private baseEndpoint(): string {
    return `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.model}`;
  }

  async verifyModel(): Promise<string> {
    return this.model;
  }

  estimatePrice(req: VideoLaneRequest): number {
    return Math.round(VERTEX_VIDEO_RATE_USD_PER_S * req.durationS * 10000) / 10000;
  }

  async submit(req: VideoLaneRequest): Promise<VideoJobRef> {
    if (req.prompt.length > 8000) {
      throw errValidation(
        `prompt is ${req.prompt.length} chars (Vertex video cap 8000)`,
        'shorten the action text',
      );
    }
    const token = await this.ensureToken();
    const instance: Record<string, unknown> = { prompt: req.prompt };
    if (req.firstFrame) {
      instance.image = {
        bytesBase64Encoded: req.firstFrame.data.toString('base64'),
        mimeType: req.firstFrame.mimeType,
      };
    }
    if (req.lastFrame) {
      instance.lastFrame = {
        bytesBase64Encoded: req.lastFrame.data.toString('base64'),
        mimeType: req.lastFrame.mimeType,
      };
    }

    const body = {
      instances: [instance],
      parameters: {
        aspectRatio: req.aspectRatio,
        durationSeconds: req.durationS,
        generateAudio: true,
      },
    };

    const res = await this.fetchFn(`${this.baseEndpoint()}:predictLongRunning`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw errAuth(`Vertex rejected credentials (${res.status})`, 'refresh gcloud ADC consent and verify Vertex AI API permissions');
      }
      if (res.status >= 400 && res.status < 500) {
        throw errValidation(`Vertex rejected video request: ${raw.slice(0, 300)}`, 'verify model id, aspectRatio, and frame payloads');
      }
      throw errLaneDown(`Vertex endpoint error (${res.status}): ${raw.slice(0, 200)}`, 'retry shortly');
    }

    const parsed = JSON.parse(raw) as VertexOperationBody;
    if (!parsed.name) {
      throw errLaneDown('Vertex predictLongRunning returned no operation name', 'verify Vertex model contract');
    }
    this.ops.set(parsed.name, parsed);
    return { jobId: parsed.name };
  }

  private async fetchOperation(opName: string): Promise<VertexOperationBody> {
    const token = await this.ensureToken();
    const res = await this.fetchFn(`${this.baseEndpoint()}:fetchPredictOperation`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ operationName: opName }),
    });
    const raw = await res.text();
    if (!res.ok) {
      throw errLaneDown(`Vertex poll failed (${res.status}): ${raw.slice(0, 200)}`, 'retry job_status');
    }
    const parsed = JSON.parse(raw) as VertexOperationBody;
    this.ops.set(opName, parsed);
    return parsed;
  }

  async status(ref: VideoJobRef): Promise<VideoJobStatus> {
    const op = await this.fetchOperation(ref.jobId);
    if (op.error?.message) {
      return { status: 'failed', progress: 100, errorVerbatim: op.error.message };
    }
    if (op.done) {
      return { status: 'completed', progress: 100 };
    }
    return { status: 'in_progress', progress: 50 };
  }

  async result(ref: VideoJobRef): Promise<VideoArtifact> {
    let op = this.ops.get(ref.jobId);
    if (!op || !op.done) {
      op = await this.fetchOperation(ref.jobId);
    }
    if (op.error?.message) {
      throw errJobFailed(op.error.message, 'failed Vertex jobs do not bill');
    }
    if (!op.done) {
      throw errValidation('Vertex operation still running', 'poll job_status until completed');
    }
    const video = op.response?.videos?.[0];
    if (!video) {
      throw errLaneDown('Vertex completed with zero video outputs', 're-run shot render');
    }

    let data: Buffer;
    if (video.bytesBase64Encoded) {
      data = Buffer.from(video.bytesBase64Encoded, 'base64');
    } else if (video.videoUri && /^https?:\/\//i.test(video.videoUri)) {
      const dl = await this.fetchFn(video.videoUri);
      if (!dl.ok || !dl.arrayBuffer) {
        throw errLaneDown(`Failed to fetch Vertex videoUri (${dl.status})`, 'check signed URL expiry');
      }
      data = Buffer.from(await dl.arrayBuffer());
    } else {
      throw errLaneDown(
        `Vertex returned non-inline video (${video.gcsUri ?? 'missing bytesBase64Encoded'})`,
        'configure inline response output or GCS download support',
      );
    }

    return {
      data,
      jobId: ref.jobId,
      costUsd: VERTEX_VIDEO_RATE_USD_PER_S * 5,
      hasAudio: true,
    };
  }
}
