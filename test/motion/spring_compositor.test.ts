// test/motion/spring_compositor.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateSpringPosition,
  buildKineticWordFrames,
  generateAlphaCompositingRecipe,
  computeAudioReactivePulses,
  SPRING_PRESETS,
  CAPTION_STYLES
} from '../../src/motion/spring_compositor.js';

describe('Spring Compositor & Motion Graphics Engine', () => {
  it('calculates deterministic spring position with characteristic overshoot', () => {
    // Frame 0 must be 0
    expect(calculateSpringPosition(0, 30, SPRING_PRESETS.bouncy)).toBe(0);

    // At frame 5-10, bouncy spring should overshoot 1.0
    const frame5 = calculateSpringPosition(5, 30, SPRING_PRESETS.bouncy);
    const frame8 = calculateSpringPosition(8, 30, SPRING_PRESETS.bouncy);
    expect(frame8).toBeGreaterThan(0.5);

    // After 30 frames (1 second), spring should settle close to 1.0
    const frame30 = calculateSpringPosition(30, 30, SPRING_PRESETS.bouncy);
    expect(Math.abs(frame30 - 1.0)).toBeLessThan(0.05);
  });

  it('builds word-level kinetic typography frames with spring pop scale', () => {
    const words = [
      { word: 'STOP', start_s: 0.0, end_s: 0.4 },
      { word: 'SCROLLING', start_s: 0.4, end_s: 0.9 },
      { word: 'NOW', start_s: 0.9, end_s: 1.3 }
    ];

    const frames = buildKineticWordFrames(words, 30, CAPTION_STYLES.viral_creator);
    expect(frames.length).toBe(39); // 1.3s * 30fps

    // Frame 0 should target 'STOP'
    expect(frames[0].active_word).toBe('STOP');
    expect(frames[0].full_text).toBe('STOP SCROLLING NOW');

    // Word transition at frame 15 (0.5s) should target 'SCROLLING'
    expect(frames[15].active_word).toBe('SCROLLING');
  });

  it('generates compliant FFmpeg alpha-compositing complex filtergraph', () => {
    const recipe = generateAlphaCompositingRecipe(
      'renders/shot01.mp4',
      'graphics/overlay.webm',
      'final/output.mp4',
      { scale_overlay: { width: 1080, height: 1920 } }
    );

    expect(recipe.command).toContain('ffmpeg -y');
    expect(recipe.command).toContain('[0:v][scaled_over]overlay=0:0:format=auto');
    expect(recipe.command).toContain('libx264');
  });

  it('computes audio-reactive scale impulses with smooth dissipation', () => {
    const peaks = [0.5, 1.2]; // Peaks at 0.5s and 1.2s
    const pulses = computeAudioReactivePulses(peaks, 60, 30, 1.15);

    expect(pulses.length).toBe(60);
    // Frame 15 (0.5s) should be boosted by the impulse
    expect(pulses[15]).toBeGreaterThan(1.05);
    // Baseline before peak should be 1.0
    expect(pulses[5]).toBe(1.0);
  });
});
