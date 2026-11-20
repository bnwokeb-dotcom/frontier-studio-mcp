// test/clipping/pipeline.test.ts
import { describe, it, expect } from 'vitest';
import {
  scoreHighlightMoment,
  calculateDynamicReframeTrack,
  generateClipProductionPlan,
  type HighlightCandidate,
  type VideoSourceMeta
} from '../../src/clipping/pipeline.js';

describe('Autonomous 20-Repo Viral Video Clipping Pipeline', () => {
  it('correctly scores viral highlight moments and filters out dead silence', () => {
    // Dead air test
    const deadAir = scoreHighlightMoment({
      start_s: 10,
      duration_s: 20,
      avg_volume_db: -45,
      peak_volume_db: -38,
      vad_speech_ratio: 0.1, // only 10% speech
      sentiment_intensity: 0.1,
      scene_cut_count: 0
    });
    expect(deadAir.is_viable).toBe(false);
    expect(deadAir.viral_score).toBe(0);

    // High-energy highlight (streamer screams, cuts happen, speech continuous)
    const hypeMoment = scoreHighlightMoment({
      start_s: 120,
      duration_s: 30,
      avg_volume_db: -14,
      peak_volume_db: -6,
      vad_speech_ratio: 0.85,
      sentiment_intensity: 0.90,
      scene_cut_count: 4
    });
    expect(hypeMoment.is_viable).toBe(true);
    expect(hypeMoment.viral_score).toBeGreaterThanOrEqual(80);
  });

  it('calculates smooth dynamic 9:16 reframe keyframes from face coordinates', () => {
    const facePoints = [
      { time_s: 0.0, face_center_x: 0.30, face_center_y: 0.4 },
      { time_s: 1.0, face_center_x: 0.35, face_center_y: 0.4 },
      { time_s: 2.0, face_center_x: 0.70, face_center_y: 0.4 } // Sudden jump to right
    ];

    const track = calculateDynamicReframeTrack(facePoints, 1920, 1080);
    expect(track.length).toBe(3);

    // Initial frame should start around 0.30
    expect(track[0].crop_x).toBeCloseTo(0.30, 1);
    // At time 2.0, smoothing filter prevents an immediate leap to 0.70
    expect(track[2].crop_x).toBeLessThan(0.70);
    expect(track[2].crop_width).toBe(608); // 1080 * (9/16)
  });

  it('generates an executable FFmpeg GPU production plan with EBU R128 audio normalization', () => {
    const candidate: HighlightCandidate = {
      clip_id: 'gta6_trailer_hype_01',
      start_s: 18.0,
      end_s: 48.0,
      duration_s: 30.0,
      viral_score: 94,
      title_hook: 'VICE CITY HITS DIFFERENT',
      reason: 'Fast car chase with police sirens and high transcript engagement',
      speech_density: 0.80,
      audio_energy_db: -6.4,
      words: [
        { word: 'VICE', start_s: 18.2, end_s: 18.6 },
        { word: 'CITY', start_s: 18.6, end_s: 19.0 },
        { word: 'HITS', start_s: 19.0, end_s: 19.3 },
        { word: 'DIFFERENT', start_s: 19.3, end_s: 19.8 }
      ]
    };

    const source: VideoSourceMeta = {
      source_id: 'gta_vi_trailer_01',
      local_path: 'C:/media/gta6_trailer.mp4',
      duration_s: 90.0,
      width: 1920,
      height: 1080,
      fps: 60
    };

    const reframe = calculateDynamicReframeTrack([
      { time_s: 0, face_center_x: 0.5, face_center_y: 0.5 }
    ], 1920, 1080);

    const plan = generateClipProductionPlan(candidate, source, reframe, 'C:/output/shorts');

    expect(plan.clip_id).toBe('gta6_trailer_hype_01');
    expect(plan.export_spec.resolution).toEqual({ width: 1080, height: 1920 });
    expect(plan.ffmpeg_pipeline_command).toContain('-ss 18.00 -to 48.00');
    expect(plan.ffmpeg_pipeline_command).toContain('loudnorm=I=-14');
    expect(plan.ffmpeg_pipeline_command).toContain('scale=1080:1920');
  });
});
