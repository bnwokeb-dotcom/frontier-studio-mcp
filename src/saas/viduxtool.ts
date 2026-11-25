// src/saas/viduxtool.ts — VIDUXTOOL SaaS Core Engine
// Multi-model generative compute grid, niche-driven toolkits, and double-entry credit economy.

import { errValidation, errNotFound } from '../errors.js';

export type GenerativeModelId =
  | 'minimax-h3'
  | 'ffmpeg-compositor'
  | 'omniflash-1.2'
  | 'kling-4'
  | 'veo-2'
  | 'canvas-chromium';

export interface ModelTierConfig {
  id: GenerativeModelId;
  name: string;
  provider: 'google_cloud_vertex' | 'vultr_inference' | 'kling_gateway' | 'local_chromium' | 'local_ffmpeg';
  available: boolean;
  status_note?: string;
  cost_per_second_credits: number; // 100 credits = $1.00 USD
  max_duration_sec: number;
  supports_first_frame: boolean;
  aspect_ratios: string[];
}

export const MODEL_CATALOG: Record<GenerativeModelId, ModelTierConfig> = {
  'minimax-h3': {
    id: 'minimax-h3',
    name: 'MiniMax Hailuo H3 (Vultr Inference API)',
    provider: 'vultr_inference',
    available: true,
    cost_per_second_credits: 9, // $0.09 / sec verified live Vultr rate
    max_duration_sec: 15,
    supports_first_frame: true,
    aspect_ratios: ['16:9', '9:16', '1:1', '21:9']
  },
  'ffmpeg-compositor': {
    id: 'ffmpeg-compositor',
    name: 'Local FFmpeg Compositor & Clipping Engine',
    provider: 'local_ffmpeg',
    available: true,
    status_note: 'Local FFmpeg clipping, scaling, and motion compositor',
    cost_per_second_credits: 0.2, // 1 credit per 5s clip
    max_duration_sec: 60,
    supports_first_frame: false,
    aspect_ratios: ['9:16', '16:9', '1:1']
  },
  'omniflash-1.2': {
    id: 'omniflash-1.2',
    name: 'Google OmniFlash 1.2 / Gemini 2.0 (GCP Startup Credits)',
    provider: 'google_cloud_vertex',
    available: false,
    status_note: 'adapter not implemented',
    cost_per_second_credits: 5,
    max_duration_sec: 15,
    supports_first_frame: true,
    aspect_ratios: ['16:9', '9:16', '1:1', '21:9']
  },
  'kling-4': {
    id: 'kling-4',
    name: 'Kuaishou Kling 4 Pro',
    provider: 'kling_gateway',
    available: false,
    status_note: 'adapter not implemented',
    cost_per_second_credits: 8,
    max_duration_sec: 10,
    supports_first_frame: true,
    aspect_ratios: ['16:9', '9:16', '1:1']
  },
  'veo-2': {
    id: 'veo-2',
    name: 'Google Veo 2 Cinema (DeepMind / Vertex AI)',
    provider: 'google_cloud_vertex',
    available: false,
    status_note: 'adapter not implemented',
    cost_per_second_credits: 10,
    max_duration_sec: 8,
    supports_first_frame: true,
    aspect_ratios: ['16:9', '9:16']
  },
  'canvas-chromium': {
    id: 'canvas-chromium',
    name: 'Nafay 3D Kinetic Canvas & Motion Graphics Engine',
    provider: 'local_chromium',
    available: false,
    status_note: 'adapter not implemented',
    cost_per_second_credits: 0.2,
    max_duration_sec: 60,
    supports_first_frame: false,
    aspect_ratios: ['9:16', '16:9', '1:1']
  }
};

export type NicheToolkitId =
  | 'ugc_ecommerce_ads'
  | 'episodic_skit_comedy'
  | 'faceless_deep_dive_3d'
  | 'stream_clips_repurpose'
  | 'kinetic_motion_graphics'
  | 'hollywood_prestige_directing';

export interface NicheToolkit {
  id: NicheToolkitId;
  title: string;
  category: string;
  default_aspect_ratio: '9:16' | '16:9';
  recommended_models: GenerativeModelId[];
  beat_count: number;
  description: string;
  features: string[];
}

export const NICHE_TOOLKITS: Record<NicheToolkitId, NicheToolkit> = {
  ugc_ecommerce_ads: {
    id: 'ugc_ecommerce_ads',
    title: 'Topview-Grade UGC & E-Commerce Ad Studio',
    category: 'Commercial & Marketing',
    default_aspect_ratio: '9:16',
    recommended_models: ['minimax-h3', 'ffmpeg-compositor'],
    beat_count: 5,
    description: 'Hook-first direct response video ads with packshot rim lighting and kinetic caption overlays.',
    features: ['0-3s Pattern Interrupt Hook', 'Pain-point Agitation', 'Rotating Product Hero', 'Social Proof B-Roll', 'Kinetic CTA']
  },
  episodic_skit_comedy: {
    id: 'episodic_skit_comedy',
    title: 'Episodic Skit & Comedic Narrative Studio',
    category: 'Entertainment & Viral Shorts',
    default_aspect_ratio: '9:16',
    recommended_models: ['minimax-h3', 'ffmpeg-compositor'],
    beat_count: 4,
    description: 'Serialized multi-shot comedic acting with facial micro-expressions and slapstick.',
    features: ['Micro-expression Acting Prompts', 'Physical Slapstick Vectors', 'Diegetic Foley Soundscape', 'Tail-Frame Continuous Chaining']
  },
  faceless_deep_dive_3d: {
    id: 'faceless_deep_dive_3d',
    title: 'Photoreal Deep Dive 3D Explainer',
    category: 'Education & Science',
    default_aspect_ratio: '9:16',
    recommended_models: ['minimax-h3', 'ffmpeg-compositor'],
    beat_count: 4,
    description: 'Upgrades Zack D. Films style explainers with photorealistic microscopic, biological, and physical simulation.',
    features: ['Anatomical Cutaways', 'Subsurface Scattering Physics', 'Microscopic Macro Lenses', 'Word-synced Captions']
  },
  stream_clips_repurpose: {
    id: 'stream_clips_repurpose',
    title: 'AI Stream Clipper & Repurposing Engine',
    category: 'Streaming & Gaming',
    default_aspect_ratio: '9:16',
    recommended_models: ['ffmpeg-compositor', 'minimax-h3'],
    beat_count: 1,
    description: 'Finds viral stream highlights using audio energy spikes, formats 9:16 top facecam / bottom gameplay, and overlays subs.',
    features: ['Audio Energy Spike Detection', 'Facecam Auto-Framing', 'Whisper Word Timestamps', 'Auto-Hashtag Posting Pack']
  },
  kinetic_motion_graphics: {
    id: 'kinetic_motion_graphics',
    title: 'Kinetic Motion Graphics & Talking Head Editor',
    category: 'Creator Edits',
    default_aspect_ratio: '9:16',
    recommended_models: ['ffmpeg-compositor'],
    beat_count: 3,
    description: 'Modular FFmpeg motion graphics styles, Anton typography, audio-reactive punch zooms, and silence cutting.',
    features: ['Modular FFmpeg Styles', 'Silence & Retake Removal', 'Punch-Zoom Word Accents', 'EBU R128 (-14 LUFS) Master']
  },
  hollywood_prestige_directing: {
    id: 'hollywood_prestige_directing',
    title: 'Hollywood Prestige Directing & Character Studio',
    category: 'Cinema & Filmmaking',
    default_aspect_ratio: '16:9',
    recommended_models: ['minimax-h3', 'ffmpeg-compositor'],
    beat_count: 6,
    description: 'Full-spectrum narrative directing: 3-panel turnaround sheets, 180° eyeline locks, FCPXML and DaVinci export.',
    features: ['Headless Turnaround Character Sheet', '180-Degree Eyeline Protection', 'Multi-Angle Motivated Lighting', 'FCPXML 1.10 Timeline Export']
  }
};

export interface UserWallet {
  user_id: string;
  email: string;
  tier: 'free_starter' | 'creator_pro' | 'studio_scale';
  credit_balance: number;
  reserved_credits: number;
  created_at: string;
}

export interface LedgerEntry {
  transaction_id: string;
  user_id: string;
  type: 'grant' | 'reserve' | 'commit' | 'refund';
  amount_credits: number;
  model_used?: GenerativeModelId;
  reference_job_id: string;
  timestamp: string;
}

export class ViduxCreditLedger {
  private wallets: Map<string, UserWallet> = new Map();
  private reservations: Map<string, { user_id: string; amount: number; model: GenerativeModelId }> = new Map();
  private transactions: LedgerEntry[] = [];

  constructor() {}

  registerUser(user_id: string, email: string, tier: UserWallet['tier'] = 'free_starter'): UserWallet {
    if (this.wallets.has(user_id)) {
      return this.wallets.get(user_id)!;
    }
    const initialGrant = tier === 'free_starter' ? 500 : tier === 'creator_pro' ? 2500 : 10000;
    const wallet: UserWallet = {
      user_id,
      email,
      tier,
      credit_balance: initialGrant,
      reserved_credits: 0,
      created_at: new Date().toISOString()
    };
    this.wallets.set(user_id, wallet);

    this.transactions.push({
      transaction_id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user_id,
      type: 'grant',
      amount_credits: initialGrant,
      reference_job_id: 'welcome_grant',
      timestamp: new Date().toISOString()
    });

    return wallet;
  }

  getWallet(user_id: string): UserWallet {
    const w = this.wallets.get(user_id);
    if (!w) throw errNotFound('user', user_id);
    return { ...w };
  }

  estimateCost(modelId: GenerativeModelId, durationSec: number): number {
    const model = MODEL_CATALOG[modelId];
    if (!model) throw errValidation('unknown model', `model '${modelId}' is not in catalog`);
    return Math.ceil(model.cost_per_second_credits * durationSec);
  }

  reserve(user_id: string, reservationId: string, modelId: GenerativeModelId, durationSec: number): number {
    const wallet = this.wallets.get(user_id);
    if (!wallet) throw errNotFound('user', user_id);

    const cost = this.estimateCost(modelId, durationSec);
    const available = wallet.credit_balance - wallet.reserved_credits;
    if (available < cost) {
      throw errValidation(
        'insufficient credits',
        `Required: ${cost}, Available: ${available}. Please top up your ViduxTool wallet.`
      );
    }

    wallet.reserved_credits += cost;
    this.reservations.set(reservationId, { user_id, amount: cost, model: modelId });

    this.transactions.push({
      transaction_id: `tx_res_${Date.now()}`,
      user_id,
      type: 'reserve',
      amount_credits: cost,
      model_used: modelId,
      reference_job_id: reservationId,
      timestamp: new Date().toISOString()
    });

    return cost;
  }

  commit(reservationId: string, actualDurationSec: number): number {
    const res = this.reservations.get(reservationId);
    if (!res) throw errNotFound('reservation', reservationId);

    const wallet = this.wallets.get(res.user_id);
    if (!wallet) throw errNotFound('user', res.user_id);

    const actualCost = this.estimateCost(res.model, actualDurationSec);
    wallet.reserved_credits -= res.amount;
    wallet.credit_balance -= actualCost;
    this.reservations.delete(reservationId);

    this.transactions.push({
      transaction_id: `tx_commit_${Date.now()}`,
      user_id: res.user_id,
      type: 'commit',
      amount_credits: actualCost,
      model_used: res.model,
      reference_job_id: reservationId,
      timestamp: new Date().toISOString()
    });

    return actualCost;
  }

  refund(reservationId: string, reason: string): void {
    const res = this.reservations.get(reservationId);
    if (!res) return; // idempotent

    const wallet = this.wallets.get(res.user_id);
    if (wallet) {
      wallet.reserved_credits -= res.amount;
    }
    this.reservations.delete(reservationId);

    this.transactions.push({
      transaction_id: `tx_refund_${Date.now()}`,
      user_id: res.user_id,
      type: 'refund',
      amount_credits: res.amount,
      model_used: res.model,
      reference_job_id: reservationId,
      timestamp: new Date().toISOString()
    });
  }

  getTransactions(user_id: string): LedgerEntry[] {
    return this.transactions.filter((t) => t.user_id === user_id);
  }
}

export interface GenerationRequest {
  user_id: string;
  niche_id: NicheToolkitId;
  model_id: GenerativeModelId;
  prompt: string;
  duration_sec: number;
  aspect_ratio?: '9:16' | '16:9' | '1:1' | '21:9';
  webhook_url?: string;
}

export interface GenerationResponse {
  job_id: string;
  user_id: string;
  niche: NicheToolkit;
  model: ModelTierConfig;
  reserved_credits: number;
  status: 'rendering' | 'succeeded' | 'failed';
  provider_job_id?: string;
  output_path?: string;
  prompt_rendered?: string;
  aspect_ratio: string;
  created_at: string;
}

export interface DispatchResult {
  status?: 'rendering' | 'succeeded';
  provider_job_id?: string;
  output_path?: string;
  prompt_rendered?: string;
}

export type JobDispatcher = (
  req: GenerationRequest & { aspect_ratio: string },
  jobId: string,
  model: ModelTierConfig,
) => Promise<DispatchResult>;

export interface ViduxToolEngineOptions {
  ledger?: ViduxCreditLedger;
  dispatcher?: JobDispatcher;
}

export class ViduxToolEngine {
  public ledger: ViduxCreditLedger;
  private dispatcher?: JobDispatcher;

  constructor(ledgerOrOpts?: ViduxCreditLedger | ViduxToolEngineOptions, dispatcher?: JobDispatcher) {
    if (ledgerOrOpts instanceof ViduxCreditLedger) {
      this.ledger = ledgerOrOpts;
      this.dispatcher = dispatcher;
    } else if (ledgerOrOpts && typeof ledgerOrOpts === 'object') {
      this.ledger = ledgerOrOpts.ledger ?? new ViduxCreditLedger();
      this.dispatcher = ledgerOrOpts.dispatcher ?? dispatcher;
    } else {
      this.ledger = new ViduxCreditLedger();
      this.dispatcher = dispatcher;
    }
  }

  async createProject(req: GenerationRequest): Promise<GenerationResponse> {
    const niche = NICHE_TOOLKITS[req.niche_id];
    if (!niche) throw errNotFound('niche_toolkit', req.niche_id);

    const model = MODEL_CATALOG[req.model_id];
    if (!model) throw errNotFound('model_tier', req.model_id);

    if (!model.available) {
      throw errValidation(
        `model "${req.model_id}" has no live backend adapter`,
        'use an available backed model: minimax-h3 or ffmpeg-compositor',
      );
    }

    if (!this.dispatcher) {
      throw errValidation(
        'no execution dispatcher wired — refusing to accept unbacked render job',
        'wire VultrLane or FFmpeg compositor dispatcher',
      );
    }

    if (typeof req.prompt !== 'string' || !req.prompt.trim()) {
      throw errValidation('prompt is required (non-empty string)', 'provide a non-empty string prompt');
    }

    if (
      typeof req.duration_sec !== 'number' ||
      !Number.isFinite(req.duration_sec) ||
      req.duration_sec < 1 ||
      req.duration_sec > model.max_duration_sec
    ) {
      throw errValidation(
        `duration_sec ${String(req.duration_sec)} out of range for ${req.model_id} (1..${model.max_duration_sec}s)`,
        `pass numeric duration_sec between 1 and ${model.max_duration_sec}`,
      );
    }

    const ratio = req.aspect_ratio || niche.default_aspect_ratio;
    if (!model.aspect_ratios.includes(ratio)) {
      throw errValidation(
        `aspect_ratio "${ratio}" is unsupported by ${req.model_id}`,
        `choose one of: ${model.aspect_ratios.join(', ')}`,
      );
    }

    const jobId = `vdx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Reserve credits pre-flight only after model availability & dispatcher checks pass
    const reservedCredits = this.ledger.reserve(req.user_id, jobId, req.model_id, req.duration_sec);

    let dispatchRes: DispatchResult;
    try {
      dispatchRes = await this.dispatcher({ ...req, aspect_ratio: ratio }, jobId, model);
    } catch (err) {
      this.ledger.refund(jobId, (err as Error).message || 'Dispatch failed');
      throw err;
    }

    const status = dispatchRes.status ?? (dispatchRes.output_path ? 'succeeded' : 'rendering');

    return {
      job_id: jobId,
      user_id: req.user_id,
      niche,
      model,
      reserved_credits: reservedCredits,
      status,
      ...(dispatchRes.provider_job_id ? { provider_job_id: dispatchRes.provider_job_id } : {}),
      ...(dispatchRes.output_path ? { output_path: dispatchRes.output_path } : {}),
      ...(dispatchRes.prompt_rendered ? { prompt_rendered: dispatchRes.prompt_rendered } : {}),
      aspect_ratio: ratio,
      created_at: new Date().toISOString()
    };
  }
}
