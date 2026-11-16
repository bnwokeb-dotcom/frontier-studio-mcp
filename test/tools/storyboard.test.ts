// test/tools/storyboard.test.ts — Unit tests for storyboard_build tool.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../../src/server.js';
import { GeminiLane } from '../../src/lanes/gemini.js';

describe('storyboard_build Tool', () => {
  let root: string;
  let client: Client;
  let server: Awaited<ReturnType<typeof buildServer>>;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fsm-storyboard-'));
    process.env.STUDIO_ROOT = root;
    process.env.GEMINI_API_KEY = 'test_key';
    process.env.STUDIO_LIVE = '1';

    server = buildServer({ studioRoot: root });
    client = new Client({ name: 'test', version: '0' });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(a), client.connect(b)]);

    // Create film and location
    await client.callTool({
      name: 'film_create',
      arguments: { film_id: 'film_story', title: 'Storyboard Test', logline: 'Testing pre-vis', budget_usd: 50 },
    });
    await client.callTool({
      name: 'asset_register',
      arguments: {
        kind: 'location',
        asset_id: 'loc_valley',
        descriptor: 'frozen alpine valley',
        geo_block: 'mountain ridge north, frozen lake south',
      },
    });
  });

  afterEach(async () => {
    await Promise.all([client.close(), server.close()]);
    await rm(root, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('refuses when sequence has fewer than 2 shots', async () => {
    await client.callTool({
      name: 'shot_create',
      arguments: {
        id: 'seq01-shot01',
        sequence: 'seq01',
        action: 'Solo rider approaches the ridge.',
        geo_block: 'mountain ridge north, frozen lake south',
        refs: [{ asset_id: 'loc_valley', role: 'location' }],
        camera: { lens: '24mm', move: 'static', reason: 'establishing wide' },
        duration_s: 5,
      },
    });

    const res = await client.callTool({
      name: 'storyboard_build',
      arguments: { sequence: 'seq01' },
    });
    expect((res as { isError?: boolean }).isError).toBe(true);
    const text = (res as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toContain('register at least 2 shots in this sequence');
  });

  it('renders a 2x3 storyboard contact sheet when sequence has 2+ shots', async () => {
    // Shot 1
    await client.callTool({
      name: 'shot_create',
      arguments: {
        id: 'seq01-shot01',
        sequence: 'seq01',
        action: 'Solo rider approaches the ridge.',
        geo_block: 'mountain ridge north, frozen lake south',
        refs: [{ asset_id: 'loc_valley', role: 'location' }],
        camera: { lens: '24mm', move: 'static', framing: 'master_wide', reason: 'establishing wide' },
        duration_s: 5,
      },
    });

    // Shot 2
    await client.callTool({
      name: 'shot_create',
      arguments: {
        id: 'seq01-shot02',
        sequence: 'seq01',
        action: 'Close-up on the horse breathing steam.',
        geo_block: 'mountain ridge north, frozen lake south',
        refs: [{ asset_id: 'loc_valley', role: 'location' }],
        camera: { lens: '85mm', move: 'tracking', framing: 'close_up', reason: 'emotional texture' },
        duration_s: 4,
      },
    });

    // Mock Gemini lane
    const fakePng = Buffer.from('\x89PNG\r\n\x1a\nfake-storyboard-image-bytes');
    vi.spyOn(GeminiLane.prototype, 'submit').mockResolvedValue({ interactionId: 'interaction_sb_123' });
    vi.spyOn(GeminiLane.prototype, 'result').mockResolvedValue({
      data: fakePng,
      mimeType: 'image/png',
      interactionId: 'interaction_sb_123',
      priceUsd: 0.134,
    });

    const res = await client.callTool({
      name: 'storyboard_build',
      arguments: { sequence: 'seq01', grid_layout: '2x3' },
    });

    const content = (res as { content: Array<{ text: string }> }).content[0].text;
    const data = JSON.parse(content);

    expect(data.sequence).toBe('seq01');
    expect(data.shots_included).toBe(2);
    expect(data.grid_layout).toBe('2x3');
    expect(data.cost_usd).toBe(0.134);
    expect(data.storyboard_path).toContain('.png');

    // Verify file on disk
    const fileBytes = await readFile(data.storyboard_path);
    expect(fileBytes.toString('utf8')).toContain('PNG');

    // Verify ledger entry
    const ledgerText = await readFile(join(root, 'films', 'film_story', 'ledger.jsonl'), 'utf8');
    expect(ledgerText).toContain('storyboard_build');
    expect(ledgerText).toContain('interaction_sb_123');
  });
});
