import { readFile } from 'node:fs/promises';
import type { StudioConfig } from '../config.js';
import { errAuth, errLaneDown, errNotFound, errValidation } from '../errors.js';
import type {
  FetchLike,
  ImageArtifact,
  ImageLane,
  ImageLaneRequest,
  LaneInteraction,
  LaneStatus,
} from './types.js';

export const GEMINI_PRICES: Record<'1K' | '2K' | '4K', number> = {
  '1K': 0.134,
  '2K': 0.134,
  '4K': 0.24,
};

/** The parts of an Interactions API response body this lane reads. */
interface GeminiResponseBody {
  interaction?: { id?: string };
  id?: string;
  output_image?: { mime_type?: string; data?: string };
  steps?: Array<{
    type?: string;
    output?: Array<{ type?: string; mime_type?: string; data?: string }>;
  }>;
}

interface ImageBlock {
  mime_type?: string;
  data?: string;
}

/**
 * Gemini image lane over the Interactions API (synchronous image generation).
 * The submit response body is cached verbatim; `result()` reads it back, so
 * no polling or GET endpoints are ever invented.
 */
export class GeminiLane implements ImageLane {
  static readonly ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
  static readonly MODEL = 'gemini-3-pro-image';
  static readonly API_REVISION = '2026-05-20';

  readonly cameraVocabulary = 'prose' as const;

  private cache = new Map<string, GeminiResponseBody>();
  private priceCache = new Map<string, number>();

  constructor(
    private credential: string,
    private fetchFn: FetchLike = fetch,
    private bearer = false,
  ) {}

  static fromConfig(cfg: StudioConfig): GeminiLane {
    if (!cfg.geminiApiKey) {
      throw errAuth('GEMINI_API_KEY is not set', 'set GEMINI_API_KEY in the environment, then retry');
    }
    return new GeminiLane(cfg.geminiApiKey);
  }

  // ADC path (Google Cloud org policies that disallow API keys): read the
  // authorized_user credentials file gcloud writes, exchange the refresh token
  // for an access token, and send it as a Bearer header instead of an API key.
  // The access token is cached per lane instance until 60s before expiry.
  static async fromAdc(credentialsPath: string, fetchFn: FetchLike = fetch): Promise<GeminiLane> {
    let creds: { type?: string; client_id?: string; client_secret?: string; refresh_token?: string };
    try {
      creds = JSON.parse(await readFile(credentialsPath, 'utf8'));
    } catch {
      throw errAuth(`ADC credentials not readable at ${credentialsPath}`,
        'run gcloud auth application-default login, or set GOOGLE_APPLICATION_CREDENTIALS to the credentials file');
    }
    if (creds.type !== 'authorized_user' || !creds.refresh_token || !creds.client_id || !creds.client_secret) {
      throw errAuth(`ADC credentials at ${credentialsPath} are not an authorized_user file`,
        'run gcloud auth application-default login to create one');
    }
    const token = await GeminiLane.refreshAccessToken(creds, fetchFn);
    const lane = new GeminiLane(token.access_token, fetchFn, true);
    lane.adcCreds = creds;
    lane.tokenExpiresAt = Date.now() + (token.expires_in - 60) * 1000;
    return lane;
  }

  private adcCreds?: { client_id?: string; client_secret?: string; refresh_token?: string };
  private tokenExpiresAt = 0;

  private static async refreshAccessToken(
    creds: { client_id?: string; client_secret?: string; refresh_token?: string },
    fetchFn: FetchLike,
  ): Promise<{ access_token: string; expires_in: number }> {
    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await fetchFn('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: creds.client_id ?? '',
          client_secret: creds.client_secret ?? '',
          refresh_token: creds.refresh_token ?? '',
          grant_type: 'refresh_token',
        }).toString(),
      });
    } catch (e) {
      throw errLaneDown(`token refresh unreachable (${(e as Error).message})`, 'check network, then retry');
    }
    const raw = await res.text().catch(() => '');
    let json: { access_token?: string; expires_in?: number; error_description?: string };
    try {
      json = JSON.parse(raw);
    } catch {
      throw errLaneDown('token refresh returned an unreadable response', 'retry; if it persists, re-run gcloud auth application-default login');
    }
    if (!res.ok || !json.access_token) {
      throw errAuth(`token refresh rejected: ${json.error_description ?? raw.slice(0, 200)}`,
        're-run gcloud auth application-default login to refresh the consent');
    }
    return { access_token: json.access_token, expires_in: json.expires_in ?? 3600 };
  }

  // ADC lane: reuse the cached token; re-exchange when within 60s of expiry.
  private async ensureCredential(): Promise<string> {
    if (this.bearer && this.adcCreds && Date.now() >= this.tokenExpiresAt) {
      const token = await GeminiLane.refreshAccessToken(this.adcCreds, this.fetchFn);
      this.credential = token.access_token;
      this.tokenExpiresAt = Date.now() + (token.expires_in - 60) * 1000;
    }
    return this.credential;
  }

  price(req: ImageLaneRequest): number {
    return GEMINI_PRICES[req.imageSize];
  }

  async submit(req: ImageLaneRequest): Promise<LaneInteraction> {
    const body = {
      model: GeminiLane.MODEL,
      input: [
        { type: 'text', text: req.prompt },
        ...req.refImages.map((r) => ({
          type: 'image',
          mime_type: r.mimeType,
          data: r.data.toString('base64'),
        })),
      ],
      response_format: {
        type: 'image',
        mime_type: 'image/png',
        aspect_ratio: req.aspectRatio,
        image_size: req.imageSize,
      },
      ...(req.previousInteractionId
        ? { previous_interaction_id: req.previousInteractionId }
        : {}),
    };

    let res: Awaited<ReturnType<FetchLike>>;
    let raw: string;
    const credential = await this.ensureCredential();
    try {
      res = await this.fetchFn(GeminiLane.ENDPOINT, {
        method: 'POST',
        headers: {
          ...(this.bearer
            ? { authorization: `Bearer ${credential}` }
            : { 'x-goog-api-key': credential }),
          'content-type': 'application/json',
          'Api-Revision': GeminiLane.API_REVISION,
        },
        body: JSON.stringify(body),
      });
      raw = await res.text();
    } catch (e) {
      throw errLaneDown(
        `Gemini unreachable (${e instanceof Error ? e.message : String(e)})`,
        'retry; if it persists check status.google.com',
      );
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw errAuth('Gemini rejected the API key', 'check GEMINI_API_KEY in the environment, then retry');
      }
      if (res.status >= 400 && res.status < 500) {
        throw errValidation(
          `Gemini rejected the request: ${this.providerError(raw)}`,
          'check aspect_ratio / image_size / reference count (max 14)',
        );
      }
      throw errLaneDown(
        `Gemini unreachable (HTTP ${res.status})`,
        'retry; if it persists check status.google.com',
      );
    }

    let json: GeminiResponseBody;
    try {
      json = JSON.parse(raw) as GeminiResponseBody;
    } catch {
      throw errLaneDown(
        'Gemini returned malformed JSON (unexpected response shape)',
        'retry; if it persists check status.google.com',
      );
    }
    if (json == null || typeof json !== 'object') {
      throw errLaneDown(
        'Gemini response is not a JSON object (unexpected response shape)',
        'retry; if it persists the API contract may have changed',
      );
    }
    const id = json.interaction?.id ?? json.id;
    if (!id || typeof id !== 'string') {
      throw errLaneDown(
        'Gemini response has no interaction id (unexpected response shape)',
        'retry; if it persists the API contract may have changed',
      );
    }
    this.cache.set(id, json);
    this.priceCache.set(id, this.price(req));
    return { interactionId: id };
  }

  async status(ref: LaneInteraction): Promise<LaneStatus> {
    // Images are synchronous — submit already holds the finished artifact.
    return { done: true, interactionId: ref.interactionId };
  }

  async result(ref: LaneInteraction): Promise<ImageArtifact> {
    const body = this.cache.get(ref.interactionId);
    if (!body) {
      throw errNotFound('interaction not in this session', 're-generate; images are cached per submit');
    }

    if (typeof body.output_image?.data === 'string') {
      return {
        data: Buffer.from(body.output_image.data, 'base64'),
        mimeType: body.output_image.mime_type ?? 'image/png',
        interactionId: ref.interactionId,
        priceUsd: this.lastPrice(ref.interactionId),
      };
    }

    const block = this.findImageBlock(body);
    if (!block || typeof block.data !== 'string') {
      throw errLaneDown(
        'no image in the Gemini response',
        'retry the generation; if it persists simplify the prompt',
      );
    }
    return {
      data: Buffer.from(block.data, 'base64'),
      mimeType: block.mime_type ?? 'image/png',
      interactionId: ref.interactionId,
      priceUsd: this.lastPrice(ref.interactionId),
    };
  }

  /** First `model_output` step containing an image block; non-array shapes yield none. */
  private findImageBlock(body: GeminiResponseBody): ImageBlock | undefined {
    if (!Array.isArray(body.steps)) return undefined;
    for (const step of body.steps) {
      if (step?.type !== 'model_output') continue;
      if (!Array.isArray(step.output)) continue;
      const block = step.output.find((b) => b?.type === 'image' && typeof b.data === 'string');
      if (block) return block;
    }
    return undefined;
  }

  private lastPrice(interactionId: string): number {
    return this.priceCache.get(interactionId) ?? 0;
  }

  private providerError(raw: string): string {
    try {
      const json = JSON.parse(raw) as { error?: { message?: string } };
      if (typeof json.error?.message === 'string') return json.error.message;
    } catch {
      // not JSON — fall through to the raw body text
    }
    return raw;
  }
}
