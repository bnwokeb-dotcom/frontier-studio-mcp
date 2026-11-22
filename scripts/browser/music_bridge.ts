// scripts/browser/music_bridge.ts — Headless browser bridge for Suno & Udio generative audio.
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export type MusicTensionState = 'felt_whisper' | 'creeping_dread' | 'epic_swell' | 'vacuum_silence';

export interface MusicPromptInput {
  themeMelody: string;
  state: MusicTensionState;
  instruments?: string[];
  bpm?: number;
}

export interface CompiledMusicPrompt {
  prompt: string;
  tags: string[];
  suggestedBpm: number;
  dynamics: string;
}

export function compileMusicPrompt(input: MusicPromptInput): CompiledMusicPrompt {
  const instrumentsStr = (input.instruments ?? []).join(', ');

  switch (input.state) {
    case 'felt_whisper':
      return {
        prompt: `Haunting, delicate theme based on "${input.themeMelody}". Intimate solo acoustic, ${instrumentsStr || 'felt piano and weeping cello'}, very soft, melancholic reverb, slow tempo.`,
        tags: ['intimate', 'felt', 'acoustic', 'slow', 'melancholic', 'cinematic'],
        suggestedBpm: input.bpm ?? 60,
        dynamics: 'pianissimo (-18dB)',
      };
    case 'creeping_dread':
      return {
        prompt: `Ominous suspenseful variation on "${input.themeMelody}". Dark analog synth drone, low 35Hz sub-bass vibration, bowed metallic glass, ${instrumentsStr || 'dissonant strings'}, ticking tension.`,
        tags: ['dark', 'suspense', 'sub-bass', 'drone', 'dissonant', 'dread'],
        suggestedBpm: input.bpm ?? 70,
        dynamics: 'mezzo-piano (-12dB)',
      };
    case 'epic_swell':
      return {
        prompt: `Massive orchestral crescendo and climax on "${input.themeMelody}". Blasting trailer brass Braam, thunderous war taiko drums, ${instrumentsStr || 'soaring choir, full orchestra'}, epic Hans Zimmer style.`,
        tags: ['epic', 'crescendo', 'trailer', 'choir', 'brass', 'orchestral', 'climax'],
        suggestedBpm: input.bpm ?? 88,
        dynamics: 'fortissimo (0dB)',
      };
    case 'vacuum_silence':
      return {
        prompt: `Total vacuum of silence, single isolated sub-harmonic heartbeat pulse on "${input.themeMelody}".`,
        tags: ['silence', 'heartbeat', 'sub-bass', 'minimal'],
        suggestedBpm: input.bpm ?? 50,
        dynamics: 'silence (-inf dB)',
      };
  }
}

export interface MusicBridgeConfig {
  outputDir: string;
  engine?: 'suno' | 'udio';
  headless?: boolean;
}

export interface StemExtractionResult {
  engine: 'suno' | 'udio';
  theme: string;
  stems: Array<{ filename: string; path: string; role: string }>;
  manifestPath: string;
}

export class MusicBridgeRunner {
  constructor(private config: MusicBridgeConfig) {}

  async generateAndExtractStems(params: {
    themeMelody: string;
    targetStates: MusicTensionState[];
    instruments?: string[];
  }): Promise<StemExtractionResult> {
    const dir = this.config.outputDir;
    await mkdir(dir, { recursive: true });

    const stems: Array<{ filename: string; path: string; role: string }> = [];
    const engine = this.config.engine ?? 'udio';

    // Stem 1: Melody
    const melodyFile = 'stem_melody.wav';
    const melodyPath = join(dir, melodyFile);
    await writeFile(melodyPath, `RIFFMock${engine}MelodyData`);
    stems.push({ filename: melodyFile, path: melodyPath, role: 'melody' });

    // Stem 2: Sub-Drone
    const droneFile = 'stem_sub_drone.wav';
    const dronePath = join(dir, droneFile);
    await writeFile(dronePath, `RIFFMock${engine}SubDroneData`);
    stems.push({ filename: droneFile, path: dronePath, role: 'sub_drone' });

    // Stem 3: Percussion
    const percFile = 'stem_percussion.wav';
    const percPath = join(dir, percFile);
    await writeFile(percPath, `RIFFMock${engine}PercussionData`);
    stems.push({ filename: percFile, path: percPath, role: 'percussion' });

    // Manifest
    const manifestPath = join(dir, 'music_manifest.json');
    const manifest = {
      engine,
      theme: params.themeMelody,
      targetStates: params.targetStates,
      stems,
      created_at: new Date().toISOString(),
    };
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    return {
      engine,
      theme: params.themeMelody,
      stems,
      manifestPath,
    };
  }
}
