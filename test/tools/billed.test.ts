// test/tools/billed.test.ts — runBilledTake: the money law, ONE copy.
//
// The M2 review mandate: price → ensureBudget → submit → result → recordSpend
// → writeArtifact → ledger must exist exactly once (src/tools/billed.ts); the
// three image tools call it, and render_shot (Task 3) must never hand-copy a
// fourth. These tests pin the sequence itself and the money-truth hardening:
// the provider has charged by the time result() returns, so the spend is
// accrued and the ledger line written even when the local artifact write fails.
//
// Unit-style (no MCP server): a scripted ImageLane drives the helper directly.
// The budget + ledger modules are WRAPPED, not replaced — the real
// implementations still run (real film.json / ledger.jsonl effects) while the
// spies record the moment each step fired onto one shared timeline.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runBilledTake } from '../../src/tools/billed.js';
import { studioPaths } from '../../src/store/paths.js';
import type { StudioPaths } from '../../src/store/paths.js';
import { filmCreate } from '../../src/store/film.js';
import { initStudio } from '../../src/store/studio.js';
import { ensureBudget, recordSpend } from '../../src/budget.js';
import { appendLine } from '../../src/store/fs.js';
import type {
  ImageArtifact,
  ImageLane,
  ImageLaneRequest,
  LaneInteraction,
  LaneStatus,
} from '../../src/lanes/types.js';

// One shared spy timeline: every step of the money law pushes its name the
// moment it runs, so the tests assert the ORDER itself, not just the set.
const h = vi.hoisted(() => ({ events: [] as string[] }));

vi.mock('../../src/budget.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/budget.js')>();
  return {
    ensureBudget: vi.fn(async (...args: Parameters<typeof actual.ensureBudget>) => {
      h.events.push('budget');
      return actual.ensureBudget(...args);
    }),
    recordSpend: vi.fn(async (...args: Parameters<typeof actual.recordSpend>) => {
      h.events.push('spend');
      return actual.recordSpend(...args);
    }),
  };
});

vi.mock('../../src/store/fs.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/store/fs.js')>();
  return {
    ...actual,
    appendLine: vi.fn(async (...args: Parameters<typeof actual.appendLine>) => {
      h.events.push('ledger');
      return actual.appendLine(...args);
    }),
  };
});

// The scripted lane: price quotes the ESTIMATE (0.134, the Gemini 1K law) but
// result reports the ACTUAL charged cost (0.5) — deliberately different, so the
// tests prove spend/ledger carry the charged cost, never the pre-submit quote.
function scriptedLane(): ImageLane {
  return {
    cameraVocabulary: 'prose',
    price: vi.fn(() => {
      h.events.push('price');
      return 0.134;
    }),
    submit: vi.fn(async (_req: ImageLaneRequest): Promise<LaneInteraction> => {
      h.events.push('submit');
      return { interactionId: 'int-scripted' };
    }),
    status: vi.fn(async (ref: LaneInteraction): Promise<LaneStatus> => ({
      done: true,
      interactionId: ref.interactionId,
    })),
    result: vi.fn(async (ref: LaneInteraction): Promise<ImageArtifact> => {
      h.events.push('result');
      return {
        data: Buffer.from('lanebytes'),
        mimeType: 'image/png',
        interactionId: ref.interactionId,
        priceUsd: 0.5,
      };
    }),
  };
}

const REQ: ImageLaneRequest = { prompt: 'a scripted take', refImages: [], aspectRatio: '16:9', imageSize: '1K' };

let root: string;
let paths: StudioPaths;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'fsm-billed-'));
  paths = studioPaths(root);
  await initStudio(paths);
  await filmCreate(paths, 'film_x', { title: 'X', logline: 'Y', budgetUsd: 1 });
  h.events.length = 0;
  vi.mocked(ensureBudget).mockClear();
  vi.mocked(recordSpend).mockClear();
  vi.mocked(appendLine).mockClear();
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function filmJson(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(paths.filmJson('film_x'), 'utf8')) as Record<string, unknown>;
}

async function ledgerLines(): Promise<Record<string, unknown>[]> {
  const raw = await readFile(paths.ledgerPath('film_x'), 'utf8');
  return raw.trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>);
}

describe('runBilledTake (the extracted money law)', () => {
  it('runs the law in order: price → budget → submit → result → spend → artifact → ledger, with the ACTUAL cost on spend + ledger', async () => {
    const artifactPath = `${paths.filmDir('film_x')}/generated/take.png`;
    const take = await runBilledTake({
      studioRoot: root,
      filmId: 'film_x',
      tool: 'scripted_tool',
      lane: scriptedLane(),
      request: REQ,
      writeArtifact: async () => {
        h.events.push('artifact');
        return artifactPath;
      },
    });

    // the spy sequence, in the mandated order
    expect(h.events).toEqual(['price', 'budget', 'submit', 'result', 'spend', 'artifact', 'ledger']);

    // ensureBudget got the ESTIMATE (the quote); recordSpend the ACTUAL charged cost
    expect(vi.mocked(ensureBudget).mock.calls[0]?.[1]).toBe('film_x');
    expect(vi.mocked(ensureBudget).mock.calls[0]?.[2]).toBe(0.134);
    expect(vi.mocked(recordSpend).mock.calls[0]?.[2]).toBe(0.5);

    // the return carries the callback's living path and the actual cost
    expect(take).toEqual({
      artifactPath,
      data: Buffer.from('lanebytes'),
      mimeType: 'image/png',
      costUsd: 0.5,
      interactionId: 'int-scripted',
    });

    // the real effects too: one 8-key ledger line with the ACTUAL cost, and the
    // spend accrued on the film
    const lines = await ledgerLines();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual({
      ts: expect.any(String),
      tool: 'scripted_tool',
      lane: 'gemini',
      film_id: 'film_x',
      cost_usd: 0.5,
      verdict: 'pending',
      interaction_id: 'int-scripted',
      artifact_path: artifactPath,
    });
    expect((await filmJson()).spentUsd).toBeCloseTo(0.5, 12);
  });

  it('money truth: writeArtifact throwing still accrues the spend and writes the ledger (artifact_path "") — the write error surfaces', async () => {
    await expect(
      runBilledTake({
        studioRoot: root,
        filmId: 'film_x',
        tool: 'scripted_tool',
        lane: scriptedLane(),
        request: REQ,
        writeArtifact: async () => {
          throw new Error('disk full');
        },
      }),
    ).rejects.toThrow('disk full');

    // the charged money is on the film despite the artifact loss
    expect((await filmJson()).spentUsd).toBeCloseTo(0.5, 12);

    // the ledger line is still written — with the actual cost and an empty
    // artifact_path (no living file points anywhere)
    const lines = await ledgerLines();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual({
      ts: expect.any(String),
      tool: 'scripted_tool',
      lane: 'gemini',
      film_id: 'film_x',
      cost_usd: 0.5,
      verdict: 'pending',
      interaction_id: 'int-scripted',
      artifact_path: '',
    });

    // the artifact step never completed in the money-law timeline
    expect(h.events).toEqual(['price', 'budget', 'submit', 'result', 'spend', 'ledger']);
  });
});
