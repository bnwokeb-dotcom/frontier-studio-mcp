// test/lanes/audio.test.ts — Unit tests for M4 Audio Lanes (Google & ElevenLabs).
import { describe, it, expect } from 'vitest';
import { GoogleAudioLane, ElevenLabsAudioLane, GOOGLE_TTS_USD_PER_CHAR } from '../../src/lanes/audio.js';
import { StudioError } from '../../src/errors.js';

describe('GoogleAudioLane', () => {
  it('calculates price based on dialogue length', () => {
    const lane = new GoogleAudioLane('test_key');
    const text = 'Hello world, Mara is speaking.';
    const price = lane.price({ dialogue: text });
    expect(price).toBe(Math.max(0.0001, Number((text.length * GOOGLE_TTS_USD_PER_CHAR).toFixed(5))));
  });

  it('synthesizes audio content from Google TTS payload', async () => {
    const fakeBase64 = Buffer.from('RIFF....WAVEfmt ').toString('base64');
    const fakeFetch: typeof fetch = async (url, init) => {
      const u = String(url);
      expect(u).toContain('https://texttospeech.googleapis.com');
      expect(u).toContain('key=test_key');
      const body = JSON.parse(String(init?.body));
      expect(body.input.text).toBe('Hold the line.');
      expect(body.audioConfig.sampleRateHertz).toBe(48000);
      return new Response(JSON.stringify({ audioContent: fakeBase64 }), { status: 200 });
    };

    const lane = new GoogleAudioLane('test_key', fakeFetch);
    const result = await lane.synthesize({ dialogue: 'Hold the line.' });
    expect(result.mimeType).toBe('audio/wav');
    expect(result.audioData.toString('utf8')).toContain('RIFF');
    expect(result.costUsd).toBeGreaterThan(0);
    expect(result.durationEstimateS).toBeGreaterThanOrEqual(1);
  });

  it('throws errAuth when Google Cloud TTS rejects authorization', async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 401 });

    const lane = new GoogleAudioLane('bad_key', fakeFetch);
    await expect(lane.synthesize({ dialogue: 'Test' })).rejects.toThrow(StudioError);
  });
});

describe('ElevenLabsAudioLane', () => {
  it('calculates price and posts to ElevenLabs text-to-speech API', async () => {
    const fakeAudio = new Uint8Array([0x52, 0x49, 0x46, 0x46]); // RIFF
    const fakeFetch: typeof fetch = async (url, init) => {
      const u = String(url);
      expect(u).toContain('https://api.elevenlabs.io/v1/text-to-speech');
      const headers = init?.headers as Record<string, string>;
      expect(headers['xi-api-key']).toBe('el_key');
      return new Response(fakeAudio, { status: 200 });
    };

    const lane = new ElevenLabsAudioLane('el_key', 'custom_voice_id', fakeFetch);
    expect(lane.price({ dialogue: 'Testing ElevenLabs' })).toBeGreaterThan(0);
    const result = await lane.synthesize({ dialogue: 'Testing ElevenLabs' });
    expect(result.audioData.length).toBe(4);
  });
});
