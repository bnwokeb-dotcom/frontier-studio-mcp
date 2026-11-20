// src/motion/spring_compositor.ts — Next-Gen Programmatic Motion Graphics & Spring Compositor
// Bridges Remotion-grade spring physics, word-level kinetic typography, and alpha-channel video compositing.

export interface SpringConfig {
  mass: number;      // Inertia (default: 1.0)
  stiffness: number; // Snap velocity (default: 100.0)
  damping: number;   // Oscillation decay (default: 10.0)
  initialVelocity?: number;
}

export const SPRING_PRESETS = {
  bouncy: { mass: 1, stiffness: 180, damping: 12 },    // Viral TikTok / YouTube shorts kinetic pop
  snappy: { mass: 0.8, stiffness: 220, damping: 18 },  // Clean tech UI / data counter reveal
  gentle: { mass: 1.2, stiffness: 100, damping: 20 },  // Editorial / warm canvas transition
  wobbly: { mass: 1, stiffness: 140, damping: 6 }      // Playful / cartoon bounce
} as const;

/**
 * Calculates deterministic damped harmonic spring position at a specific frame.
 * Formula: x(t) = 1 - e^(-zeta * omega_0 * t) * (cos(omega_d * t) + (zeta / sqrt(1 - zeta^2)) * sin(omega_d * t))
 */
export function calculateSpringPosition(
  frame: number,
  fps: number = 30,
  config: SpringConfig = SPRING_PRESETS.bouncy
): number {
  if (frame <= 0) return 0;

  const t = frame / fps;
  const m = Math.max(0.001, config.mass);
  const k = Math.max(0.001, config.stiffness);
  const c = Math.max(0.001, config.damping);

  const omega0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));

  // Under-damped system (oscillates and settles)
  if (zeta < 1) {
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    const envelope = Math.exp(-zeta * omega0 * t);
    const position = 1 - envelope * (Math.cos(omegaD * t) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(omegaD * t));
    return Number(position.toFixed(4));
  }

  // Critically damped or over-damped
  const envelope = Math.exp(-omega0 * t);
  return Number((1 - envelope * (1 + omega0 * t)).toFixed(4));
}

export interface TimedWord {
  word: string;
  start_s: number;
  end_s: number;
}

export interface KineticCaptionStyle {
  font_family: string;
  font_size_px: number;
  primary_color: string;
  highlight_color: string;
  shadow_blur_px: number;
  preset: keyof typeof SPRING_PRESETS;
}

export const CAPTION_STYLES: Record<string, KineticCaptionStyle> = {
  viral_creator: {
    font_family: 'Anton, Impact, sans-serif',
    font_size_px: 58,
    primary_color: '#FFFFFF',
    highlight_color: '#FFDE00', // Electric yellow
    shadow_blur_px: 12,
    preset: 'bouncy'
  },
  clean_tech: {
    font_family: 'Inter Tight, -apple-system, sans-serif',
    font_size_px: 44,
    primary_color: '#F8FAFC',
    highlight_color: '#38BDF8', // Sky blue
    shadow_blur_px: 8,
    preset: 'snappy'
  },
  luxury_editorial: {
    font_family: 'Instrument Serif, Georgia, serif',
    font_size_px: 52,
    primary_color: '#FFFBEB',
    highlight_color: '#EAB308', // Warm gold
    shadow_blur_px: 6,
    preset: 'gentle'
  }
};

/**
 * Builds word-level kinetic typography frames with spring pop scale and variable weight.
 */
export function buildKineticWordFrames(
  words: TimedWord[],
  fps: number = 30,
  style: KineticCaptionStyle = CAPTION_STYLES.viral_creator
): Array<{ frame: number; active_word: string; scale: number; full_text: string }> {
  if (!words.length) return [];

  const totalDuration = words[words.length - 1].end_s;
  const totalFrames = Math.ceil(totalDuration * fps);
  const frames: Array<{ frame: number; active_word: string; scale: number; full_text: string }> = [];

  const fullPhrase = words.map((w) => w.word).join(' ');

  for (let f = 0; f < totalFrames; f++) {
    const currentTimeS = f / fps;
    const active = words.find((w) => currentTimeS >= w.start_s && currentTimeS <= w.end_s) || words[0];
    const wordStartFrame = Math.floor(active.start_s * fps);
    const elapsedWordFrames = f - wordStartFrame;

    // Calculate spring scale pop: base 1.0, pops up to ~1.2, settles at 1.05
    const springProgress = calculateSpringPosition(elapsedWordFrames, fps, SPRING_PRESETS[style.preset]);
    const scale = 1.0 + (springProgress > 0 ? (1.18 - 1.0) * (springProgress > 1 ? 2 - springProgress : springProgress) : 0);

    frames.push({
      frame: f,
      active_word: active.word,
      scale: Number(scale.toFixed(3)),
      full_text: fullPhrase
    });
  }

  return frames;
}

/**
 * Generates an FFmpeg complex filter command to composite an alpha-transparent
 * motion graphics overlay (WebM yuva420p or PNG sequence) on top of a base video.
 */
export function generateAlphaCompositingRecipe(
  baseVideoPath: string,
  overlayPath: string,
  outputPath: string,
  options: {
    scale_overlay?: { width: number; height: number };
    audio_ducking_db?: number; // e.g. -3 dB to drop background on graphic hit
  } = {}
): {
  command: string;
  input_base: string;
  input_overlay: string;
  output_path: string;
} {
  const normBase = baseVideoPath.replace(/\\/g, '/');
  const normOverlay = overlayPath.replace(/\\/g, '/');
  const normOut = outputPath.replace(/\\/g, '/');

  let filterComplex = `[0:v][1:v]overlay=0:0:format=auto[outv]`;
  if (options.scale_overlay) {
    filterComplex = `[1:v]scale=${options.scale_overlay.width}:${options.scale_overlay.height}[scaled_over];[0:v][scaled_over]overlay=0:0:format=auto[outv]`;
  }

  const cmd = `ffmpeg -y -i "${normBase}" -i "${normOverlay}" -filter_complex "${filterComplex}" -map "[outv]" -map 0:a? -c:v libx264 -crf 18 -preset fast -c:a copy "${normOut}"`;

  return {
    command: cmd,
    input_base: normBase,
    input_overlay: normOverlay,
    output_path: normOut
  };
}

/**
 * Computes audio-reactive scale impulses from a list of peak audio timestamps.
 */
export function computeAudioReactivePulses(
  peakTimestampsSec: number[],
  totalFrames: number,
  fps: number = 30,
  maxImpulseScale: number = 1.08
): number[] {
  const scales = new Array(totalFrames).fill(1.0);

  for (const peakS of peakTimestampsSec) {
    const peakFrame = Math.round(peakS * fps);
    // 6-frame dissipation curve
    for (let offset = 0; offset < 8; offset++) {
      const targetFrame = peakFrame + offset;
      if (targetFrame >= 0 && targetFrame < totalFrames) {
        const decay = Math.cos((offset / 8) * (Math.PI / 2));
        const bump = (maxImpulseScale - 1.0) * decay;
        scales[targetFrame] = Math.max(scales[targetFrame], Number((1.0 + bump).toFixed(3)));
      }
    }
  }

  return scales;
}
