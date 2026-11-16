// src/lanes/audio.ts — M4 Audio Lane (Google Cloud Text-to-Speech & ElevenLabs adapters).
import { errAuth, errLaneDown, errValidation } from '../errors.js';
import type { FetchLike } from './types.js';

export interface AudioLaneRequest {
  dialogue: string;
  voiceName?: string;
  voiceId?: string; // For ElevenLabs or custom cloned voice
  speakingRate?: number;
  sampleRateHertz?: number;
}

export interface AudioArtifact {
  audioData: Buffer;
  mimeType: string;
  costUsd: number;
  durationEstimateS: number;
}

export interface AudioLane {
  readonly kind: 'google' | 'elevenlabs';
  price(request: AudioLaneRequest): number;
  synthesize(request: AudioLaneRequest): Promise<AudioArtifact>;
}

// Google Cloud Text-to-Speech pricing: $0.000016 / char ($16 / 1M chars)
export const GOOGLE_TTS_USD_PER_CHAR = 0.000016;

export class GoogleAudioLane implements AudioLane {
  readonly kind = 'google';
  static readonly ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

  constructor(
    private readonly apiKey: string,
    private readonly fetchFn: FetchLike = globalThis.fetch.bind(globalThis),
  ) {
    if (!apiKey) {
      throw errAuth('missing GEMINI_API_KEY for Google Audio lane', 'set GEMINI_API_KEY in .env');
    }
  }

  price(req: AudioLaneRequest): number {
    return Math.max(0.0001, Number((req.dialogue.length * GOOGLE_TTS_USD_PER_CHAR).toFixed(5)));
  }

  async synthesize(req: AudioLaneRequest): Promise<AudioArtifact> {
    if (!req.dialogue.trim()) {
      throw errValidation('dialogue text is required for audio synthesis', 'provide non-empty dialogue');
    }

    const costUsd = this.price(req);
    const sampleRate = req.sampleRateHertz ?? 48000;
    const voiceName = req.voiceName || 'en-US-Journey-F';
    const langCode = voiceName.split('-').slice(0, 2).join('-') || 'en-US';

    const payload = {
      input: { text: req.dialogue },
      voice: {
        languageCode: langCode,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: 'LINEAR16', // uncompressed 48kHz WAV
        sampleRateHertz: sampleRate,
        speakingRate: req.speakingRate ?? 1.0,
      },
    };

    const url = `${GoogleAudioLane.ENDPOINT}?key=${encodeURIComponent(this.apiKey)}`;
    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      throw errLaneDown(
        `Google Text-to-Speech network error: ${(e as Error).message}`,
        'check network connectivity and GEMINI_API_KEY permissions',
      );
    }

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw errAuth(
          `Google Text-to-Speech auth rejected (${res.status}): ${body}`,
          'verify that Cloud Text-to-Speech API is enabled on your Google Cloud project',
        );
      }
      if (res.status >= 400 && res.status < 500) {
        throw errValidation(`Google Text-to-Speech rejected request: ${body}`, 'check voice parameters');
      }
      throw errLaneDown(`Google Text-to-Speech failed (${res.status}): ${body}`, 'retry or inspect Google Cloud status');
    }

    const textBody = await res.text();
    let data: { audioContent?: string };
    try {
      data = JSON.parse(textBody) as { audioContent?: string };
    } catch {
      throw errLaneDown(`Google Text-to-Speech response was not valid JSON: ${textBody}`, 'check endpoint status');
    }
    if (!data.audioContent) {
      throw errLaneDown('Google Text-to-Speech returned empty audioContent', 'inspect request payload');
    }

    const audioData = Buffer.from(data.audioContent, 'base64');
    // Approximate duration: average speaking rate ~15 chars per second
    const durationEstimateS = Math.max(1, Number((req.dialogue.length / 15).toFixed(1)));

    return {
      audioData,
      mimeType: 'audio/wav',
      costUsd,
      durationEstimateS,
    };
  }
}

export class ElevenLabsAudioLane implements AudioLane {
  readonly kind = 'elevenlabs';
  static readonly BASE_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

  constructor(
    private readonly apiKey: string,
    private readonly defaultVoiceId: string = '21m00Tcm4TlvDq8ikWAM', // Rachel
    private readonly fetchFn: FetchLike = globalThis.fetch.bind(globalThis),
  ) {
    if (!apiKey) {
      throw errAuth('missing ELEVENLABS_API_KEY for ElevenLabs audio lane', 'set ELEVENLABS_API_KEY in .env');
    }
  }

  price(req: AudioLaneRequest): number {
    // ElevenLabs tier standard ~ $0.0003 per character
    return Math.max(0.001, Number((req.dialogue.length * 0.0003).toFixed(4)));
  }

  async synthesize(req: AudioLaneRequest): Promise<AudioArtifact> {
    if (!req.dialogue.trim()) {
      throw errValidation('dialogue text is required for audio synthesis', 'provide non-empty dialogue');
    }

    const voiceId = req.voiceId || this.defaultVoiceId;
    const url = `${ElevenLabsAudioLane.BASE_URL}/${voiceId}?output_format=pcm_44100`;

    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: req.dialogue,
          model_id: 'eleven_multilingual_v2',
        }),
      });
    } catch (e) {
      throw errLaneDown(
        `ElevenLabs network error: ${(e as Error).message}`,
        'check network connectivity and ELEVENLABS_API_KEY',
      );
    }

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw errAuth(`ElevenLabs auth rejected (${res.status}): ${body}`, 'check ELEVENLABS_API_KEY');
      }
      throw errLaneDown(`ElevenLabs failed (${res.status}): ${body}`, 'retry or inspect ElevenLabs dashboard');
    }

    if (!res.arrayBuffer) {
      const text = await res.text();
      return {
        audioData: Buffer.from(text, 'base64'),
        mimeType: 'audio/wav',
        costUsd: this.price(req),
        durationEstimateS: Math.max(1, Number((req.dialogue.length / 15).toFixed(1))),
      };
    }
    const arrayBuf = await res.arrayBuffer();
    return {
      audioData: Buffer.from(arrayBuf),
      mimeType: 'audio/wav',
      costUsd: this.price(req),
      durationEstimateS: Math.max(1, Number((req.dialogue.length / 15).toFixed(1))),
    };
  }
}
