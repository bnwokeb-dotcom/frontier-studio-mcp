import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

const TARGET_DIR = path.resolve('clones/aicentury');

describe('AI Century Cloned Engine & Knowledge Base', () => {
  it('should have cloned all 75 agents into catalog.json', async () => {
    const catalogRaw = await fs.readFile(path.join(TARGET_DIR, 'catalog.json'), 'utf8');
    const catalog = JSON.parse(catalogRaw);
    expect(catalog.length).toBe(75);

    const categories = new Set(catalog.map((a: any) => a.category));
    expect(categories.has('Cinematic Filmmaking')).toBe(true);
    expect(categories.has('AI Shorts')).toBe(true);
    expect(categories.has('Advertisement')).toBe(true);
  });

  it('should contain the viral Caveman / Time Travel Vlog skill (AC78)', async () => {
    const ac78Dir = path.join(TARGET_DIR, 'agents', 'AC78_time-travel-vlog');
    const metaRaw = await fs.readFile(path.join(ac78Dir, 'metadata.json'), 'utf8');
    const meta = JSON.parse(metaRaw);
    expect(meta.id).toBe('AC78');
    expect(meta.name).toBe('Time Travel Vlog');

    const instruction = await fs.readFile(path.join(ac78Dir, 'instruction.md'), 'utf8');
    expect(instruction).toContain('cinematic vlog-style front-facing phone shot');
    expect(instruction).toContain('SELF-INSERT MODE');
    expect(instruction).toContain('arm’s length');
  });

  it('should contain Seedance Studio (AC71) with full reference files', async () => {
    const ac71Dir = path.join(TARGET_DIR, 'agents', 'AC71_seedance-studio');
    const metaRaw = await fs.readFile(path.join(ac71Dir, 'metadata.json'), 'utf8');
    const meta = JSON.parse(metaRaw);
    expect(meta.id).toBe('AC71');

    const refFiles = await fs.readdir(path.join(ac71Dir, 'references'));
    expect(refFiles.length).toBe(5);

    const videoPromptDoc = refFiles.find((f) => f.includes('video-prompt'));
    expect(videoPromptDoc).toBeDefined();

    const docContent = await fs.readFile(path.join(ac71Dir, 'references', videoPromptDoc!), 'utf8');
    expect(docContent).toContain('No background music');
    expect(docContent).toContain('2000 characters');
  });

  it('should contain Cast Swap (AC91) and Kling AI Studio (AC44)', async () => {
    const catalogRaw = await fs.readFile(path.join(TARGET_DIR, 'catalog.json'), 'utf8');
    const catalog = JSON.parse(catalogRaw);

    const ac91 = catalog.find((a: any) => a.id === 'AC91');
    expect(ac91).toBeDefined();
    expect(ac91.name).toBe('Cast Swap');

    const ac44 = catalog.find((a: any) => a.id === 'AC44');
    expect(ac44).toBeDefined();
    expect(ac44.name).toBe('Kling AI Studio');
  });
});
