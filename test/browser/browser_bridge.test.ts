// test/browser/browser_bridge.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MusicBridgeRunner, compileMusicPrompt } from '../../scripts/browser/music_bridge.js';
import { CanvasBridgeRunner } from '../../scripts/browser/canvas_bridge.js';

describe('Browser Automation Bridge', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fsm-bridge-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  describe('MusicBridge (Suno / Udio Automation)', () => {
    it('compiles emotional tension prompts for Suno/Udio', () => {
      const p1 = compileMusicPrompt({
        themeMelody: 'Mothers Lullaby',
        state: 'felt_whisper',
        instruments: ['felt_piano', 'cello'],
      });
      expect(p1.prompt).toContain('Mothers Lullaby');
      expect(p1.prompt).toContain('felt_piano');
      expect(p1.tags).toContain('intimate');
      expect(p1.suggestedBpm).toBe(60);

      const p2 = compileMusicPrompt({
        themeMelody: 'Mothers Lullaby',
        state: 'epic_swell',
        instruments: ['brass', 'timpani', 'choir'],
      });
      expect(p2.prompt).toContain('crescendo');
      expect(p2.prompt).toContain('choir');
      expect(p2.suggestedBpm).toBeGreaterThanOrEqual(80);
    });

    it('runner handles simulated stem generation and placement', async () => {
      const runner = new MusicBridgeRunner({ outputDir: root, engine: 'udio' });
      const result = await runner.generateAndExtractStems({
        themeMelody: 'CorvusTheme',
        targetStates: ['felt_whisper', 'creeping_dread', 'epic_swell'],
      });

      expect(result.stems.length).toBeGreaterThanOrEqual(3);
      expect(result.engine).toBe('udio');
      expect(result.manifestPath).toContain('music_manifest.json');

      const manifestContent = JSON.parse(await readFile(result.manifestPath, 'utf8'));
      expect(manifestContent.theme).toBe('CorvusTheme');
      expect(manifestContent.stems.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('CanvasBridge (Web Canvas Staging)', () => {
    it('creates node graph payload for infinite canvas automation', async () => {
      const sheetPath = join(root, 'sheet.png');
      const platePath = join(root, 'plate.png');
      await writeFile(sheetPath, 'mockSheetData');
      await writeFile(platePath, 'mockPlateData');

      const runner = new CanvasBridgeRunner();
      const nodeGraph = runner.buildCanvasNodeGraph({
        filmTitle: 'The Mother Monster',
        characterNodes: [{ id: 'char_mother', sheetPath, mark: 'left' }],
        locationNode: { id: 'loc_tundra', platePath },
        prompt: '@char_mother kneels in deep snow, holding swaddle',
      });

      expect(nodeGraph.nodes.length).toBe(3);
      expect(nodeGraph.connections.length).toBeGreaterThanOrEqual(2);
      expect(nodeGraph.promptText).toContain('@char_mother');
    });
  });
});
