# Frontier Studio MCP — M1 Registry Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the M1 milestone — repo scaffold, atomic JSON store, film/asset/shot registry with the full Hell Grind validation matrix, sequence GEO locking, and a running stdio MCP server exposing the registry tools.

**Architecture:** Thin MCP + skill brain. The MCP server owns state (atomic JSON files under STUDIO_ROOT), schema-enforced doctrine (shot validation), and typed errors with next-actions. Craft lives in skills, not code. Two generation lanes (Gemini image, Vultr video) arrive in M2/M3 behind the `GenerationLane` interface — M1 registers no billed tools.

**Tech Stack:** TypeScript (Node ≥20), `@modelcontextprotocol/sdk` + `zod`, vitest, no other runtime deps (stdlib `node:fs/promises` for the store).

**Spec:** `docs/superpowers/specs/2026-11-14-frontier-studio-mcp-design.md` (§5 workspace, §6 data model, §7 tool surface, §8 mechanisms, §9 errors, §10 testing)

## Global Constraints

- Node ≥20, ESM (`"type": "module"`). No runtime deps beyond `@modelcontextprotocol/sdk` and `zod`.
- Credentials only from env (`STUDIO_ROOT`, `GEMINI_API_KEY`, `VULTR_API_KEY`, `STUDIO_LIVE`) — never literals in source, tests, or fixtures (Mimosa constraint).
- Errors are `StudioError` with `code` ∈ `AUTH | BUDGET | VALIDATION | LANE_DOWN | JOB_FAILED | NOT_FOUND` and a `nextAction` string, per spec §9.
- Atomic writes: write temp file in the same directory, then rename. Ledger is append-only.
- IDs (film/asset/sequence/shot): `/^[a-z0-9][a-z0-9_-]{1,63}$/` lowercase.
- Every test uses a fresh `fs.mkdtemp` studio root — no shared fixtures, no network in CI.
- Commit after every task (conventional commits: `feat:`, `test:`, `chore:`).

---

### Task 1: Scaffold + typed errors

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.env.example`, `src/errors.ts`, `src/config.ts`
- Test: `test/config.test.ts`

**Interfaces:**
- Produces: `loadConfig(env?): StudioConfig` (`{ studioRoot: string; geminiApiKey?: string; vultrApiKey?: string; studioLive: boolean }`); `StudioError` with `code`/`nextAction`; helper `assertStudioRoot(cfg)`. Later tasks import these by these exact names.

- [ ] **Step 1: Scaffold files**

```json
// package.json
{
  "name": "frontier-studio-mcp",
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=20" },
  "bin": { "frontier-studio-mcp": "dist/server.js" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "dev": "tsx src/server.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true,
    "declaration": false,
    "sourceMap": false
  },
  "include": ["src"]
}
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['test/**/*.test.ts'] } });
```

```bash
# .env.example
STUDIO_ROOT=C:\path\to\Frontier_Studio
GEMINI_API_KEY=
VULTR_API_KEY=
STUDIO_LIVE=0
```

- [ ] **Step 2: Write the failing test** — `test/config.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config.js';
import { StudioError } from '../src/errors.js';

describe('loadConfig', () => {
  it('loads studioRoot and flags from env', () => {
    const cfg = loadConfig({ STUDIO_ROOT: 'C:/tmp/studio', GEMINI_API_KEY: 'k1', STUDIO_LIVE: '1' });
    expect(cfg.studioRoot).toBe('C:/tmp/studio');
    expect(cfg.geminiApiKey).toBe('k1');
    expect(cfg.studioLive).toBe(true);
    expect(cfg.vultrApiKey).toBeUndefined();
  });
  it('refuses to start without STUDIO_ROOT, naming the fix', () => {
    expect(() => loadConfig({})).toThrow(StudioError);
    try {
      loadConfig({});
    } catch (e) {
      const err = e as StudioError;
      expect(err.code).toBe('VALIDATION');
      expect(err.nextAction).toMatch(/STUDIO_ROOT/);
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm install && npx vitest run test/config.test.ts`
Expected: FAIL — `Cannot find module '../src/config.js'`

- [ ] **Step 4: Implement** — `src/errors.ts` + `src/config.ts`

```ts
// src/errors.ts
export type ErrorCode = 'AUTH' | 'BUDGET' | 'VALIDATION' | 'LANE_DOWN' | 'JOB_FAILED' | 'NOT_FOUND';

export class StudioError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly nextAction: string,
  ) {
    super(`${message} — NEXT: ${nextAction}`);
    this.name = 'StudioError';
  }
}
export const errValidation = (m: string, next: string) => new StudioError('VALIDATION', m, next);
export const errNotFound = (m: string, next: string) => new StudioError('NOT_FOUND', m, next);
export const errAuth = (m: string, next: string) => new StudioError('AUTH', m, next);
export const errBudget = (m: string, next: string) => new StudioError('BUDGET', m, next);
export const errLaneDown = (m: string, newA: string) => new StudioError('LANE_DOWN', m, newA);
export const errJobFailed = (m: string, next: string) => new StudioError('JOB_FAILED', m, next);
```

```ts
// src/config.ts
import { errValidation } from './errors.js';

export interface StudioConfig {
  studioRoot: string;
  geminiApiKey?: string;
  vultrApiKey?: string;
  studioLive: boolean;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): StudioConfig {
  const studioRoot = env.STUDIO_ROOT;
  if (!studioRoot) {
    throw errValidation('STUDIO_ROOT is not set', 'set the STUDIO_ROOT env var to your studio folder, then retry');
  }
  return {
    studioRoot,
    geminiApiKey: env.GEMINI_API_KEY || undefined,
    vultrApiKey: env.VULTR_API_KEY || undefined,
    studioLive: env.STUDIO_LIVE === '1',
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run test/config.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(m1): scaffold + typed errors + env config"
```

---

### Task 2: Atomic JSON store + path resolver

**Files:**
- Create: `src/store/fs.ts`, `src/store/paths.ts`
- Test: `test/store/fs.test.ts`

**Interfaces:**
- Consumes: nothing (stdlib).
- Produces: `writeJsonAtomic(path, data)`, `readJson<T>(path)` (throws `StudioError NOT_FOUND` when missing), `writeText(path, text)`, `readText(path)`, `appendLine(path, line)`, `ensureDir(path)`; `studioPaths(root): StudioPaths` with fields `studioJson, filmsDir, filmDir(filmId), filmJson(filmId), assetsDir(filmId), assetDir(filmId, kind, assetId), shotsDir(filmId), shotPath(filmId, shotId), rendersDir(filmId), jobsPath(filmId), ledgerPath(filmId)` — later tasks import exactly these.

- [ ] **Step 1: Write the failing test**

```ts
// test/store/fs.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeJsonAtomic, readJson, writeText, readText, appendLine } from '../../src/store/fs.js';
import { studioPaths } from '../../src/store/paths.js';
import { StudioError } from '../../src/errors.js';

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'fsm-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe('atomic store', () => {
  it('write-then-read JSON round-trips', async () => {
    const p = join(root, 'x', 'y.json');
    await writeJsonAtomic(p, { a: 1 });
    expect(await readJson<{ a: number }>(p)).toEqual({ a: 1 });
  });
  it('overwriting an existing file succeeds (rename-replace)', async () => {
    const p = join(root, 'f.json');
    await writeJsonAtomic(p, { v: 1 });
    await writeJsonAtomic(p, { v: 2 });
    expect(await readJson<{ v: number }>(p)).toEqual({ v: 2 });
  });
  it('readJson throws NOT_FOUND with next action for missing files', async () => {
    const p = join(root, 'nope.json');
    try {
      await readJson(p);
      expect.unreachable();
    } catch (e) {
      expect((e as StudioError).code).toBe('NOT_FOUND');
      expect((e as StudioError).nextAction).toMatch(/create it first|register/i);
    }
  });
  it('appendLine creates then appends', async () => {
    const p = join(root, 'ledger.jsonl');
    await appendLine(p, '{"n":1}');
    await appendLine(p, '{"n":2}');
    expect(await readFile(p, 'utf8')).toBe('{"n":1}\n{"n":2}\n');
  });
  it('text helpers round-trip', async () => {
    const p = join(root, 'd', 'readme.md');
    await writeText(p, '# hi');
    expect(await readText(p)).toBe('# hi');
  });
});

describe('studioPaths', () => {
  it('resolves the documented workspace layout', () => {
    const p = studioPaths('R');
    expect(p.studioJson).toBe(join('R', 'studio.json'));
    expect(p.filmJson('f1')).toBe(join('R', 'films', 'f1', 'film.json'));
    expect(p.assetDir('f1', 'characters', 'mara')).toBe(join('R', 'films', 'f1', 'assets', 'characters', 'mara'));
    expect(p.shotPath('f1', 'seq01-shot01')).toBe(join('R', 'films', 'f1', 'shots', 'seq01-shot01.json'));
    expect(p.ledgerPath('f1')).toBe(join('R', 'films', 'f1', 'ledger.jsonl'));
    expect(p.jobsPath('f1')).toBe(join('R', 'films', 'f1', 'jobs.json'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/store/fs.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement** — `src/store/fs.ts` + `src/store/paths.ts`

```ts
// src/store/fs.ts
import { mkdir, rename, writeFile, readFile, appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { errNotFound } from '../errors.js';

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function writeJsonAtomic(path: string, data: unknown): Promise<void> {
  await ensureDir(dirname(path));
  const tmp = `${path}.tmp-${randomBytes(4).toString('hex')}`;
  await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await rename(tmp, path);
}

export async function readJson<T>(path: string): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw errNotFound(`no file at ${path}`, 'create it first with the tool that owns it');
    }
    throw e;
  }
}

export async function writeText(path: string, text: string): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, text, 'utf8');
}

export async function readText(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8');
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      throw errNotFound(`no file at ${path}`, 'create it first with the tool that owns it');
    }
    throw e;
  }
}

export async function appendLine(path: string, line: string): Promise<void> {
  await ensureDir(dirname(path));
  await appendFile(path, line.endsWith('\n') ? line : `${line}\n`, 'utf8');
}
```

```ts
// src/store/paths.ts
export type AssetKindDir = 'characters' | 'locations' | 'props' | 'styles';

export interface StudioPaths {
  studioJson: string;
  filmsDir: string;
  filmDir(filmId: string): string;
  filmJson(filmId: string): string;
  assetsDir(filmId: string): string;
  assetDir(filmId: string, kind: AssetKindDir, assetId: string): string;
  shotsDir(filmId: string): string;
  shotPath(filmId: string, shotId: string): string;
  rendersDir(filmId: string): string;
  jobsPath(filmId: string): string;
  ledgerPath(filmId: string): string;
}

export function studioPaths(root: string): StudioPaths {
  const j = (...parts: string[]) => joinPath(root, ...parts);
  return {
    studioJson: j('studio.json'),
    filmsDir: j('films'),
    filmDir: (f) => j('films', f),
    filmJson: (f) => j('films', f, 'film.json'),
    assetsDir: (f) => j('films', f, 'assets'),
    assetDir: (f, k, a) => j('films', f, 'assets', k, a),
    shotsDir: (f) => j('films', f, 'shots'),
    shotPath: (f, s) => j('films', f, 'shots', `${s}.json`),
    rendersDir: (f) => j('films', f, 'renders'),
    jobsPath: (f) => j('films', f, 'jobs.json'),
    ledgerPath: (f) => j('films', f, 'ledger.jsonl'),
  };
}

function joinPath(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/store/fs.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(m1): atomic JSON store + studio path resolver"
```

---

### Task 3: Film registry

**Files:**
- Create: `src/store/studio.ts`, `src/store/film.ts`
- Test: `test/store/film.test.ts`

**Interfaces:**
- Consumes: Task 2's `writeJsonAtomic/readJson/ensureDir`, `studioPaths`, Task 1's errors.
- Produces: `filmCreate(paths, input): Promise<FilmMeta>`; `filmShow(paths, filmId)`; `setActiveFilm(paths, filmId)`; `getActiveFilm(paths)`; `filmMetaOrThrow(paths, filmId)`. `FilmMeta = { filmId, title, logline, budgetUsd?, targetRuntimeMin?, sequences: Record<string, { geoLocked?: string; budgetUsd?: number }>, universeLinks: string[], createdAt }`. Sequence geo lock (Task 6) mutates `sequences[seq].geoLocked` through `patchFilmMeta`.

- [ ] **Step 1: Write the failing test**

```ts
// test/store/film.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { studioPaths } from '../../src/store/paths.js';
import { filmCreate, filmShow, setActiveFilm, getActiveFilm, filmMetaOrThrow } from '../../src/store/film.js';
import { initStudio } from '../../src/store/studio.js';
import { StudioError } from '../../src/errors.js';

let root: string; let paths: ReturnType<typeof studioPaths>;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'fsm-'));
  paths = studioPaths(root);
  await initStudio(paths);
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

const filmInput = { title: 'Ice Mother', logline: 'A woman raises the dragon that killed her son.', budgetUsd: 50, targetRuntimeMin: 20 };

describe('film registry', () => {
  it('creates a film and shows it back', async () => {
    const meta = await filmCreate(paths, 'film_ice_mother', filmInput);
    expect(meta.filmId).toBe('film_ice_mother');
    expect((await filmShow(paths, 'film_ice_mother')).title).toBe('Ice Mother');
  });
  it('refuses duplicate film ids', async () => {
    await filmCreate(paths, 'film_x', filmInput);
    await expect(filmCreate(paths, 'film_x', filmInput)).rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('refuses invalid film ids with the rule stated', async () => {
    await expect(filmCreate(paths, 'Bad ID!', filmInput)).rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('set/get active film; unknown film refused', async () => {
    await filmCreate(paths, 'film_a', filmInput);
    await setActiveFilm(paths, 'film_a');
    expect(await getActiveFilm(paths)).toBe('film_a');
    await expect(setActiveFilm(paths, 'film_missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
  it('filmMetaOrThrow throws NOT_FOUND for unknown films', async () => {
    await expect(filmMetaOrThrow(paths, 'film_ghost')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/store/film.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement** — `src/store/studio.ts` + `src/store/film.ts`

```ts
// src/store/studio.ts
import { readJson, writeJsonAtomic } from './fs.js';
import { errNotFound } from '../errors.js';
import type { StudioPaths } from './paths.js';

export interface StudioFile {
  activeFilm?: string;
}

export async function initStudio(paths: StudioPaths): Promise<void> {
  try {
    await readJson<StudioFile>(paths.studioJson);
  } catch {
    await writeJsonAtomic(paths.studioJson, {});
  }
}

export async function getActiveFilm(paths: StudioPaths): Promise<string> {
  const s = await readJson<StudioFile>(paths.studioJson);
  if (!s.activeFilm) {
    throw errNotFound('no active film set', 'create one (film_create) and set it active (film_set_active)');
  }
  return s.activeFilm;
}

export async function setActiveFilm(paths: StudioPaths, filmId: string): Promise<void> {
  await filmMetaOrThrow(paths, filmId);
  const s = await readJson<StudioFile>(paths.studioJson);
  await writeJsonAtomic(paths.studioJson, { ...s, activeFilm: filmId });
}

import { filmMetaOrThrow } from './film.js';
```

```ts
// src/store/film.ts
import { readJson, writeJsonAtomic } from './fs.js';
import { errValidation, errNotFound } from '../errors.js';
import type { StudioPaths } from './paths.js';

const ID_RE = /^[a-z0-9][a-z0-9_-]{1,63}$/;

export interface SequenceLock { geoLocked?: string; budgetUsd?: number }
export interface FilmMeta {
  filmId: string;
  title: string;
  logline: string;
  budgetUsd?: number;
  targetRuntimeMin?: number;
  sequences: Record<string, SequenceLock>;
  universeLinks: string[];
  createdAt: string;
}

export function assertId(id: string, what: string): void {
  if (!ID_RE.test(id)) {
    throw errValidation(`invalid ${what} id "${id}"`, 'use lowercase letters/digits with - or _ (≥2 chars)');
  }
}

export async function filmMetaOrThrow(paths: StudioPaths, filmId: string): Promise<FilmMeta> {
  const meta = await readJson<FilmMeta>(paths.filmJson(filmId)).catch(() => null);
  if (!meta) throw errNotFound(`film "${filmId}" is not registered`, 'create it with film_create first');
  return meta;
}

export async function filmCreate(
  paths: StudioPaths,
  filmId: string,
  input: { title: string; logline: string; budgetUsd?: number; targetRuntimeMin?: number },
): Promise<FilmMeta> {
  assertId(filmId, 'film');
  if (await filmJsonExists(paths, filmId)) {
    throw errValidation(`film "${filmId}" already exists`, 'use film_show, or pick a new film_id');
  }
  if (!input.title?.trim() || !input.logline?.trim()) {
    throw errValidation('title and logline are required', 'a film without a logline is a hobby — write the one-sentence promise');
  }
  const meta: FilmMeta = {
    filmId, title: input.title.trim(), logline: input.logline.trim(),
    budgetUsd: input.budgetUsd, targetRuntimeMin: input.targetRuntimeMin,
    sequences: {}, universeLinks: [], createdAt: new Date().toISOString(),
  };
  await writeJsonAtomic(paths.filmJson(filmId), meta);
  return meta;
}

async function filmJsonExists(paths: StudioPaths, filmId: string): Promise<boolean> {
  try { await readJson(paths.filmJson(filmId)); return true; } catch { return false; }
}

export async function filmShow(paths: StudioPaths, filmId: string): Promise<FilmMeta> {
  return filmMetaOrThrow(paths, filmId);
}

export async function patchFilmMeta(paths: StudioPaths, filmId: string, patch: (m: FilmMeta) => FilmMeta): Promise<FilmMeta> {
  const meta = await filmMetaOrThrow(paths, filmId);
  const next = patch(structuredClone(meta));
  await writeJsonAtomic(paths.filmJson(filmId), next);
  return next;
}

export { setActiveFilm, getActiveFilm } from './studio.js';
```

Wait — `src/store/film.ts` re-exports from `studio.ts` while `studio.ts` imports `filmMetaOrThrow` from `film.ts` (circular import). Fix: keep `setActiveFilm/getActiveFilm` **only** in `studio.ts`; `film.ts` does not re-export them. Test imports `setActiveFilm, getActiveFilm` from `../../src/store/film.js` — adjust the test to import from `../../src/store/studio.js`. Note this correction in the plan so the implementer doesn't hit the circle.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/store/film.test.ts` (with the import fix: `setActiveFilm/getActiveFilm` from `studio.js`)
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(m1): film registry + studio active-film state"
```

---

### Task 4: Asset registry with character completeness law

**Files:**
- Create: `src/store/asset.ts`
- Test: `test/store/asset.test.ts`

**Interfaces:**
- Consumes: Task 2 store/paths, Task 3 `filmMetaOrThrow`/`assertId`.
- Produces: `assetRegister(paths, filmId, input): Promise<{ assetDir: string }>` where `AssetInput = { kind: 'character'|'location'|'prop'|'style'; assetId: string; descriptor: string; voice?: string; acting?: string; geoBlock?: string }`; `assertAssetExists(paths, filmId, kindDir, assetId)`; `assetRefCheck(paths, filmId, ref)` — throws unless a character asset has descriptor+voice+acting on disk. M2 adds images to the same dirs; M3 render reads `descriptor.md` verbatim.

- [ ] **Step 1: Write the failing test**

```ts
// test/store/asset.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { studioPaths } from '../../src/store/paths.js';
import { initStudio } from '../../src/store/studio.js';
import { filmCreate } from '../../src/store/film.js';
import { assetRegister, assetRefCheck } from '../../src/store/asset.js';

let root: string; let paths: ReturnType<typeof studioPaths>;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'fsm-'));
  paths = studioPaths(root);
  await initStudio(paths);
  await filmCreate(paths, 'film_t', { title: 'T', logline: 'L' });
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe('asset registry', () => {
  it('registers a character with voice+acting, reads back descriptor', async () => {
    const r = await assetRegister(paths, 'film_t', {
      kind: 'character', assetId: 'char_mara',
      descriptor: 'MARA — late 30s, frost-pale skin, wool coat over fur, snow-crusted boots.',
      voice: 'low, careful, mountain accent; never raises her voice.',
      acting: 'paces when cornered; hands stay busy; jaw sets before she speaks.',
    });
    expect(r.assetDir).toContain('characters');
    // assetRefCheck passes for a complete character
    await expect(assetRefCheck(paths, 'film_t', { assetId: 'char_mara', role: 'character' })).resolves.toBeUndefined();
  });
  it('refuses a character without voice or acting — the completeness law', async () => {
    await expect(assetRegister(paths, 'film_t', {
      kind: 'character', assetId: 'char_incomplete', descriptor: 'A woman.', 
    })).rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('registers a location with geo_block advisory file', async () => {
    await assetRegister(paths, 'film_t', {
      kind: 'location', assetId: 'loc_forest', descriptor: 'A frozen pine forest, blue hour.',
      geoBlock: '— CLEARING = center; — CABIN: frame-LEFT edge; camera always north of the treeline',
    });
    await expect(assetRefCheck(paths, 'film_t', { assetId: 'loc_forest', role: 'location' })).resolves.toBeUndefined();
  });
  it('refuses unknown asset in refs with NOT_FOUND', async () => {
    await expect(assetRefCheck(paths, 'film_t', { assetId: 'char_ghost', role: 'character' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
  it('refuses duplicate asset ids', async () => {
    await assetRegister(paths, 'film_t', { kind: 'prop', assetId: 'prop_egg', descriptor: 'A dragon egg, cracked.' });
    await expect(assetRegister(paths, 'film_t', { kind: 'prop', assetId: 'prop_egg', descriptor: 'dup' }))
      .rejects.toMatchObject({ code: 'VALIDATION' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/store/asset.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement** — `src/store/asset.ts`

```ts
// src/store/asset.ts
import { writeText, readText } from './fs.js';
import { errValidation, errNotFound } from '../errors.js';
import { assertId, filmMetaOrThrow } from './film.js';
import type { AssetKindDir, StudioPaths } from './paths.js';

export type AssetKind = 'character' | 'location' | 'prop' | 'style';
const KIND_DIR: Record<AssetKind, AssetKindDir> = {
  character: 'characters', location: 'locations', prop: 'props', style: 'styles',
};

export interface AssetInput {
  kind: AssetKind; assetId: string; descriptor: string;
  voice?: string; acting?: string; geoBlock?: string;
}

const kindDirOf = (kind: AssetKind): AssetKindDir => {
  if (!(kind in KIND_DIR)) throw errValidation(`unknown asset kind "${kind}"`, 'use character|location|prop|style');
  return KIND_DIR[kind];
};

export async function assetRegister(paths: StudioPaths, filmId: string, input: AssetInput): Promise<{ assetDir: string }> {
  await filmMetaOrThrow(paths, filmId);
  assertId(input.assetId, 'asset');
  const dir = paths.assetDir(filmId, kindDirOf(input.kind), input.assetId);
  if (await existsJoin(dir, 'descriptor.md')) {
    throw errValidation(`asset "${input.assetId}" already exists`, 'use a new asset_id or update the files directly');
  }
  if (!input.descriptor?.trim()) {
    throw errValidation('descriptor is required', 'the descriptor is the identity the model gets in every shot — write it fully');
  }
  if (input.kind === 'character' && (!input.voice?.trim() || !input.acting?.trim())) {
    throw errValidation(`character "${input.assetId}" needs voice and acting blocks`,
      'voice: register+tempo+accent+manner · acting: behavior paragraph — the completeness law');
  }
  await writeText(joinDir(dir, 'descriptor.md'), input.descriptor.trim());
  if (input.kind === 'character') {
    await writeText(joinDir(dir, 'voice.md'), input.voice!.trim());
    await writeText(joinDir(dir, 'acting.md'), input.acting!.trim());
  }
  if (input.kind === 'location' && input.geoBlock?.trim()) {
    await writeText(joinDir(dir, 'geo_block.md'), input.geoBlock.trim());
  }
  return { assetDir: dir };
}

// helpers
function joinDir(dir: string, file: string): string { return `${dir}/${file}`; }
async function existsJoin(dir: string, file: string): Promise<boolean> {
  try { await readText(`${dir}/${file}`); return true; } catch { return false; }
}

export async function assertAssetExists(paths: StudioPaths, filmId: string, kindDir: AssetKindDir, assetId: string): Promise<string> {
  const dir = paths.assetDir(filmId, kindDir, assetId);
  try { await readText(`${dir}/descriptor.md`); } catch {
    throw errNotFound(`asset "${assetId}" (${kindDir}) is not registered`, 'register it with asset_register before referencing it in shots');
  }
  return dir;
}

export async function assetRefCheck(paths: StudioPaths, filmId: string, ref: { assetId: string; role: string }): Promise<void> {
  const kindDir = roleToKindDir(ref.role);
  const dir = await assertAssetExists(paths, filmId, kindDir, ref.assetId);
  if (ref.role === 'character') {
    for (const f of ['voice.md', 'acting.md']) {
      try { await readText(`${dir}/${f}`); } catch {
        throw errValidation(`character "${ref.assetId}" is incomplete on disk (${f} missing)`,
          're-register with voice and acting blocks before shooting it');
      }
    }
  }
}

function roleToKindDir(role: string): AssetKindDir {
  if (role === 'character' || role === 'location' || role === 'prop' || role === 'style') return `${role}s` as AssetKindDir;
  if (role === 'size_ref') return 'props';
  throw errValidation(`unknown ref role "${role}"`, 'use character|location|prop|style|size_ref');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/store/asset.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(m1): asset registry with character completeness law"
```

---

### Task 5: Shot registry — the validation matrix (the discipline enforcer)

**Files:**
- Create: `src/store/shot.ts`
- Test: `test/store/shot.test.ts`

**Interfaces:**
- Consumes: Task 2 paths/fs, Task 3 `filmMetaOrThrow` (+`FilmMeta.sequences` for geo lock), Task 4 `assetRefCheck`.
- Produces: `shotCreate(paths, filmId, input): Promise<ShotRecord>`; `shotUpdate(paths, filmId, shotId, patch): Promise<ShotRecord>`; `shotShow(paths, filmId, shotId)`; `setStatus(paths, filmId, shotId, status)`. Types: `ShotRef { assetId, role }`, `CameraBlock { lens, move, reason }`, `DialogueLine { voiceRef?, line }`, `AudioBlock { dialogue?, sfx?, music? }`, `ShotRecord { id, sequence, status, geoBlock, refs, camera, audioBlock, durationS, takes: [] }`.

- [ ] **Step 1: Write the failing test**

```ts
// test/store/shot.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { studioPaths } from '../../src/store/paths.js';
import { initStudio } from '../../src/store/studio.js';
import { filmCreate, patchFilmMeta } from '../../src/store/film.js';
import { assetRegister } from '../../src/store/asset.js';
import { shotCreate, shotShow, shotUpdate } from '../../src/store/shot.js';

let root: string; let paths: ReturnType<typeof studioPaths>;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'fsm-'));
  paths = studioPaths(root);
  await initStudio(paths);
  await filmCreate(paths, 'film_t', { title: 'T', logline: 'L' });
  await assetRegister(paths, 'film_t', {
    kind: 'character', assetId: 'char_mara', descriptor: 'MARA — frost-pale, wool coat.',
    voice: 'low, careful.', acting: 'paces when cornered.',
  });
  await assetRegister(paths, 'film_t', { kind: 'location', assetId: 'loc_forest', descriptor: 'Frozen pine forest, blue hour.' });
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

const goodShot = {
  id: 'seq01-shot01', sequence: 'seq01',
  geoBlock: '— CLEARING = center; — CABIN: frame-LEFT; camera north of treeline',
  refs: [ { assetId: 'char_mara', role: 'character' }, { assetId: 'loc_forest', role: 'location' } ],
  camera: { lens: '35mm', move: 'slow push-in', reason: 'closing on the choice' },
  audioBlock: { sfx: 'wind, distant ice crack', music: 'none' as const },
  durationS: 10,
};

describe('shot validation matrix', () => {
  it('accepts a fully disciplined shot and round-trips it', async () => {
    const s = await shotCreate(paths, 'film_t', goodShot);
    expect(s.status).toBe('draft');
    expect((await shotShow(paths, 'film_t', 'seq01-shot01')).camera.reason).toBe('closing on the choice');
  });
  it('refuses missing geo_block — doctrine as a validation error', async () => {
    const { geoBlock, ...without } = goodShot;
    await expect(shotCreate(paths, 'film_t', without as typeof goodShot))
      .rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('refuses empty refs', async () => {
    await expect(shotCreate(paths, 'film_t', { ...goodShot, id: 'seq01-shot02', refs: [] }))
      .rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('refuses unknown ref asset with NOT_FOUND', async () => {
    await expect(shotCreate(paths, 'film_t', { ...goodShot, id: 'seq01-shot03',
      refs: [{ assetId: 'char_ghost', role: 'character' }] })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
  it('refuses camera move without reason', async () => {
    await expect(shotCreate(paths, 'film_t', { ...goodShot, id: 'seq01-shot04',
      camera: { lens: '35mm', move: 'push-in', reason: '' } })).rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('refuses duration >30s (single-take ceiling; chain via extend)', async () => {
    await expect(shotCreate(paths, 'film_t', { ...goodShot, id: 'seq01-shot05', durationS: 45 }))
      .rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('refuses a duplicate shot id', async () => {
    await shotCreate(paths, 'film_t', goodShot);
    await expect(shotCreate(paths, 'film_t', goodShot)).rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('enforces the sequence geo lock verbatim', async () => {
    await patchFilmMeta(paths, 'film_t', (m) => ({ ...m, sequences: { seq01: { geoLocked: 'LOCKED-GEO-TEXT' } } }));
    await expect(shotCreate(paths, 'film_t', goodShot)).rejects.toMatchObject({ code: 'VALIDATION' });
    const s = await shotCreate(paths, 'film_t', { ...goodShot, geoBlock: 'LOCKED-GEO-TEXT' });
    expect(s.geoBlock).toBe('LOCKED-GEO-TEXT');
  });
  it('shot_update re-validates patches', async () => {
    await shotCreate(paths, 'film_t', goodShot);
    await expect(shotUpdate(paths, 'film_t', 'seq01-shot01', { camera: { lens: '35mm', move: 'whip', reason: '' } }))
      .rejects.toMatchObject({ code: 'VALIDATION' });
    const s = await shotUpdate(paths, 'film_t', 'seq01-shot01', { durationS: 15 });
    expect(s.durationS).toBe(15);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/store/shot.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement** — `src/store/shot.ts`

```ts
// src/store/shot.ts
import { readJson, writeJsonAtomic } from './fs.js';
import { errValidation, errNotFound } from '../errors.js';
import { assertId, filmMetaOrThrow, patchFilmMeta, type FilmMeta } from './film.js';
import { assetRefCheck } from './asset.js';
import type { StudioPaths } from './paths.js';

export interface ShotRef { assetId: string; role: 'character' | 'location' | 'prop' | 'style' | 'size_ref' }
export interface CameraBlock { lens: string; move: string; reason: string }
export interface DialogueLine { voiceRef?: string; line: string }
export interface AudioBlock { dialogue?: DialogueLine[]; sfx?: string; music?: 'none' }
export interface TakeEntry { jobId: string; verdict: 'pending' | 'kept' | 'rejected'; costUsd?: number; notes?: string }

export interface ShotRecord {
  id: string; sequence: string;
  status: 'draft' | 'rendering' | 'kept' | 'rejected';
  geoBlock: string; refs: ShotRef[]; camera: CameraBlock; audioBlock: AudioBlock;
  durationS: number; takes: TakeEntry[];
}

const MAX_TAKE_S = 30; // single-take ceiling; longer = chain via repair/extend (M3)

function validate(input: {
  geoBlock?: string; refs?: ShotRef[]; camera?: Partial<CameraBlock>; durationS?: number;
}): void {
  if (!input.geoBlock?.trim()) {
    throw errValidation('geo_block is required',
      'lock the scene first (sequence_lock_geo) and paste its block verbatim');
  }
  if (!input.refs?.length) {
    throw errValidation('refs are required (≥1)',
      'reference at least the location asset — a shot with no anchors is a lottery');
  }
  const c = input.camera ?? {};
  for (const [k, v] of [['lens', c.lens], ['move', c.move], ['reason', c.reason]] as const) {
    if (!v?.trim()) {
      throw errValidation(`camera.${k} is required`,
        k === 'reason' ? 'a camera move without a reason is drift — state the story job' : 'state the lens/move explicitly');
    }
  }
  if (input.durationS === undefined || input.durationS <= 0 || input.durationS > MAX_TAKE_S) {
    throw errValidation(`duration_s must be 1–${MAX_TAKE_S}`,
      `longer than ${MAX_TAKE_S}s → split the shot or chain via repair/extend`);
  }
}

export async function shotCreate(paths: StudioPaths, filmId: string, input: {
  id: string; sequence: string; geoBlock: string; refs: ShotRef[];
  camera: CameraBlock; audioBlock: AudioBlock; durationS: number;
}): Promise<ShotRecord> {
  assertId(input.id, 'shot');
  await filmMetaOrThrow(paths, filmId);
  validate(input);
  for (const ref of input.refs) await assetRefCheck(paths, filmId, ref);
  const geoLock = (await filmMetaOrThrow(paths, filmId)).sequences[input.sequence]?.geoLocked;
  if (geoLock && input.geoBlock !== geoLock) {
    throw errValidation(`sequence "${input.sequence}" has a locked geo block`,
      'paste the locked block verbatim — characters teleport when the map changes between shots');
  }
  if (await existsShot(paths, filmId, input.id)) {
    throw errValidation(`shot "${input.id}" already exists`, 'use shot_update for changes');
  }
  const record: ShotRecord = {
    id: input.id, sequence: input.sequence, status: 'draft',
    geoBlock: input.geoBlock, refs: input.refs, camera: input.camera,
    audioBlock: input.audioBlock ?? {}, durationS: input.durationS, takes: [],
  };
  await writeJsonAtomic(paths.shotPath(filmId, input.id), record);
  return record;
}

async function existsShot(paths: StudioPaths, filmId: string, shotId: string): Promise<boolean> {
  try { await readJson(paths.shotPath(filmId, shotId)); return true; } catch { return false; }
}

export async function shotShow(paths: StudioPaths, filmId: string, shotId: string): Promise<ShotRecord> {
  try {
    return await readJson<ShotRecord>(paths.shotPath(filmId, shotId));
  } catch {
    throw errNotFound(`shot "${shotId}" not found`, 'check the id or create it with shot_create');
  }
}

export async function shotUpdate(paths: StudioPaths, filmId: string, shotId: string, patch: Partial<ShotRecord>): Promise<ShotRecord> {
  const current = await shotShow(paths, filmId, shotId);
  const merged: ShotRecord = { ...structuredClone(current), ...structuredClone(patch) };
  validate(merged);
  for (const ref of merged.refs) await assetRefCheck(paths, filmId, ref);
  await writeJsonAtomic(paths.shotPath(filmId, shotId), merged);
  return merged;
}

export async function setStatus(paths: StudioPaths, filmId: string, shotId: string, status: ShotRecord['status']): Promise<ShotRecord> {
  return shotUpdate(paths, filmId, shotId, { status });
}

export { patchFilmMeta, type FilmMeta };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/store/shot.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(m1): shot registry with full validation matrix + geo lock enforcement"
```

---

### Task 6: Sequence GEO locking

**Files:**
- Create: `src/store/sequence.ts`
- Test: `test/store/sequence.test.ts`

**Interfaces:**
- Consumes: Task 3 `patchFilmMeta`/`filmMetaOrThrow`.
- Produces: `sequenceLockGeo(paths, filmId, sequence, geoBlock): Promise<void>` (refuses re-lock with different text), `sequenceGeo(paths, filmId, sequence): Promise<string | undefined>`.

- [ ] **Step 1: Write the failing test**

```ts
// test/store/sequence.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { studioPaths } from '../../src/store/paths.js';
import { initStudio } from '../../src/store/studio.js';
import { filmCreate } from '../../src/store/film.ts?JS';
import { sequenceLockGeo, sequenceGeo } from '../../src/store/sequence.js';

let root: string; let paths: ReturnType<typeof studioPaths>;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'fsm-'));
  paths = studioPaths(root);
  await initStudio(paths);
  await filmCreate(paths, 'film_t', { title: 'T', logline: 'L' });
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe('sequence geo lock', () => {
  it('locks once; identical re-lock passes; different text refuses', async () => {
    await sequenceLockGeo(paths, 'film_t', 'seq01', 'GEO-A');
    expect(await sequenceGeo(paths, 'film_t', 'seq01')).toBe('GEO-A');
    await sequenceLockGeo(paths, 'film_t', 'seq01', 'GEO-A'); // idempotent
    await expect(sequenceLockGeo(paths, 'film_t', 'seq01', 'GEO-B'))
      .rejects.toMatchObject({ code: 'VALIDATION' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/store/sequence.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement** — `src/store/sequence.ts`

```ts
// src/store/sequence.ts
import { errValidation } from '../errors.js';
import { patchFilmMeta } from './film.js';
import type { StudioPaths } from './paths.js';

export async function sequenceLockGeo(paths: StudioPaths, filmId: string, sequence: string, geoBlock: string): Promise<void> {
  if (!geoBlock.trim()) {
    throw errValidation('geo_block text is empty', 'write the room map: landmarks, frame sides, camera side, 180° axis');
  }
  const current = (await patchFilmMetaTarget(paths, filmId)).sequences[sequence]?.geoLocked;
  if (current && current !== geoBlock) {
    throw errValidation(`sequence "${sequence}" is already geo-locked with different text`,
      'paste the locked block verbatim — the lock is the point');
  }
  await patchFilmMeta(paths, filmId, (m) => ({
    ...m, sequences: { ...m.sequences, [sequence]: { ...m.sequences[sequence], geoLocked: geoBlock } },
  }));
}

export async function sequenceGeo(paths: StudioPaths, filmId: string, sequence: string): Promise<string | undefined> {
  const meta = await filmMetaOrThrow(paths, filmId);
  return meta.sequences[sequence]?.geoLocked;
}

async function patchFilmMetaTarget(paths: StudioPaths, filmId: string) {
  return filmMetaOrThrow(paths, filmId);
}
```

Note: import `filmMetaOrThrow` from `./film.js` (the test's `film.ts?JS` typo above is a plan artifact — implementer imports from `'../../src/store/film.js'`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/store/sequence.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(m1): sequence geo locking (idempotent, refuses drift)"
```

---

### Task 7: MCP server wiring — registry tools live over stdio

**Files:**
- Create: `src/server.ts`, `src/tools/registry.ts`
- Test: `test/server.test.ts`

**Interfaces:**
- Consumes: all store functions above.
- Produces: `buildServer(): Promise<McpServer>` — exports the wired server for tests; `src/server.ts` main entry connects `StdioServerTransport`. Registered tools: `film_create, film_set_active, film_show, asset_register, shot_create, shot_update, shot_show, sequence_lock_geo`. `StudioError` → MCP error mapping: `VALIDATION`/`NOT_FOUND` → `-32602` with `NEXT:` line in message; `AUTH`/`BUDGET`/`LANE_DOWN` → `-32000`.

- [ ] **Step 1: Write the failing test**

```ts
// test/server.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { Client } from '@modelclient/sdk';
```
*(Correction for implementer: the MCP SDK client import is `import { Client } from '@modelcontextprotocol/sdk/client/index.js'` with `StdioClientTransport` from `.../client/stdio.js` — wire an in-process client/server pair via `InMemoryTransport.createLinkedPair()` from `@modelcontextprotocol/sdk/inMemory.js` to avoid spawning a subprocess in tests.)*

```ts
// test/server.test.ts — corrected, full content
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../src/server.js';

let root: string;
let client: Client;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'fsm-'));
  const server = buildServer({ studioRoot: root });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  client = new Client({ name: 'test', version: '0' });
  // NOTE: construct client BEFORE connect; see order fix below in Step 3
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

function rpc(name: string, args: Record<string, unknown>) {
  return client.callTool({ name, arguments: args });
}

describe('MCP registry tools', () => {
  it('film_create → film_show round trip', async () => {
    await rpc('film_create', { film_id: 'film_x', title: 'X', logline: 'Y', budget_usd: 40 });
    const res = await rpc('film_show', {});
    expect(JSON.stringify(res)).toContain('film_x');
  });
  it('shot_create without geo_block returns a VALIDATION refusal naming the fix', async () => {
    await rpc('film_create', { film_id: 'film_x', title: 'X', logline: 'Y' });
    await rpc('film_set_active', { film_id: 'film_x' });
    const res = await rpc('shot_create', { id: 'seq01-shot01', sequence: 'seq01', refs: [], camera: {}, duration_s: 10 });
    expect((res as { isError?: boolean }).isError).toBe(true);
    expect(JSON.stringify(res)).toMatch(/geo_block is required/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/server.test.ts`
Expected: FAIL — `buildServer` not found

- [ ] **Step 3: Implement** — `src/tools/registry.ts` + `src/server.ts`

```ts
// src/tools/registry.ts
import { z } from 'zod';
import { studioPaths } from '../store/paths.js';
import { filmCreate, filmShow } from '../store/film.js';
import { initStudio, setActiveFilm } from '../store/studio.js';
import { assetRegister } from '../store/asset.js';
import { shotCreate, shotUpdate, shotShow } from '../store/shot.js';
import { sequenceLockGeo } from '../store/sequence.js';
import { getActiveFilmOrThrow } from '../tools/active.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StudioError } from '../errors.js';

export function registerRegistryTools(server: McpServer, studioRoot: string): void {
  const paths = studioPaths(studioRoot);
  const guard = (fn: () => Promise<unknown>) => fn().catch((e) => {
    if (e instanceof StudioError) {
      throw new McpError(e.code === 'VALIDATION' || e.code === 'NOT_FOUND' ? -32602 : -32000, e.message);
    }
    throw e;
  });
  // film_create / film_set_active / film_show / asset_register / shot_create / shot_update / shot_show / sequence_lock_geo
  server.tool('film_create', { film_id: z.string(), title: z.string(), logline: z.string(), budget_usd: z.number().optional(), target_runtime_min: z.number().optional() },
    async (a) => guard(async () => { await initStudio(paths); await filmCreate(paths, a.film_id, a); return out(a.film_id); }));
  server.tool('film_set_active', { film_id: z.string() },
    async (a) => guard(async () => { await setActiveFilm(paths, a.film_id); return out(`active film: ${a.film_id}`); }));
  server.tool('film_show', {},
    async () => guard(async () => { const f = await getActiveFilmOrThrow(paths); return JSON.stringify(await filmShow(paths, f), null, 2); }));
  server.tool('asset_register', { film_id: z.string(), kind: z.enum(['character','location','prop','style']), asset_id: z.string(), descriptor: z.string(), voice: z.string().optional(), acting: z.string().optional(), geo_block: z.string().optional() },
    async (a) => guard(async () => out((await assetRegister(paths, a.film_id, a)).assetDir)));
  server.tool('shot_create', { film_id: z.string(), id: z.string(), sequence: z.string(), geo_block: z.string(), refs: z.array(z.object({ asset_id: z.string(), role: z.enum(['character','location','prop','style','size_ref']) })), camera: z.object({ lens: z.string(), move: z.string(), reason: z.string() }), audio_block: z.object({ dialogue: z.array(z.object({ voice_ref: z.string().optional(), line: z.string() })).optional(), sfx: z.string().optional(), music: z.literal('none').optional() }), duration_s: z.number() },
    async (a) => guard(async () => out((await shotCreate(paths, a.film_id, {
      id: a.id, sequence: a.sequence, geoBlock: a.geo_block, refs: a.refs.map((r) => ({ assetId: r.asset_id, role: r.role })),
      camera: a.camera, audioBlock: a.audio_block, durationS: a.duration_s,
    })))));
  server.tool('shot_update', { film_id: z.string(), shot_id: z.string(), patch: z.record(z.unknown()) },
    async (a) => guard(async () => out(await shotUpdate(paths, a.film_id, a.shot_id, fromWire(a.patch)))));
  server.tool('shot_show', { film_id: z.string(), shot_id: z.string() },
    async (a) => guard(async () => JSON.stringify(await shotShow(paths, a.film_id, a.shot_id), null, 2)));
  server.tool('sequence_lock_geo', { film_id: z.string(), sequence: z.string(), geo_block: z.string() },
    async (a) => guard(async () => { await sequenceLockGeo(paths, a.film_id, a.sequence, a.geo_block); return out(`locked ${a.sequence}`); }));
}

function out(x: unknown) { return { content: [{ type: 'text' as const, text: typeof x === 'string' ? x : JSON.stringify(x, null, 2) }] }; }
```
*(Implementer notes: `McpError` import from `@modelcontextprotocol/sdk/server/mcp.js` — hmm, actually from `../errors.js` is wrong; `McpError` comes from the SDK. If the SDK's `server.tool()` overload shape differs at implementation time, consult `node_modules/@modelcontextprotocol/sdk` types — the plan's intent is fixed: 8 tools, snake_case args, guard→MCP error mapping.)*

```ts
// src/server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { registerRegistryTools } from './tools/registry.ts';

export function buildServer(opts: { studioRoot: string }): McpServer {
  const server = new McpServer({ name: 'frontier-studio-mcp', version: '0.1.0' });
  registerRegistryTools(server, opts.studioRoot);
  return server;
}

// main entry — only runs when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cfg = loadConfig();
  const server = buildServer({ studioRoot: cfg.studioRoot });
  await server.connect(new StdioServerTransport());
}
```

- [ ] **Step  extension:** wire the test client correctly (construct `Client` **before** `connect`), fix `import.meta.url` main-entry guard for Windows (`pathToFileURL(process.argv[1]).href`), and verify E2E round trip passes.

- [ ] **Step 4: Run tests — all green**

Run: `npx vitest run`
Expected: ALL PASS (~23 tests across 6 files)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(m1): stdio MCP server with 8 registry tools live"
```

---

### Task 8: README + M1 verification run

**Files:**
- Create: `README.md`

- [ ] **Step 1: README** — install, STUDIO_ROOT env, tool list, `npm run dev` + MCP inspector snippet (`npx @modelcontextprotocol/inspector node dist/server.js`).
- [ ] **Step 2: Full suite + build**

Run: `npm test && npm run build`
Expected: tests pass, `dist/` emitted.

- [ ] **Step 3: Inspector demo** — create film → asset_register character (no voice → observe refusal naming voice/acting) → sequence_lock_geo → shot_create → shot_show. Paste results into the PR/M5 ledger as M1 verification evidence.

- [ ] **Step 4: Commit + tag**

```bash
git add -A && git commit -m "docs(m1): README + verification" && git tag m1-registry-core
```

---

## Self-review notes (already applied)

- Spec coverage: §5 layout (Task 2 paths test), §6 shot schema (Task 5), §6 character completeness (Task 4), §7 registry tools (Task 7), §8 mechanisms 1–2 partial (verbatim injection + priced lanes are M2/M3; geo lock done), §9 errors (Task 1 + guard mapping), §10 unit tests (all tasks). Remaining spec sections have M2–M5 tasks in follow-up plans.
- Type consistency: `StudioError` code union matches spec §9; `FilmMeta.sequences` shape shared by Tasks 3/5/6; shot wire format `snake_case` at MCP boundary, `camelCase` in store — mapping lives only in `tools/registry.ts`.
- Known plan artifacts fixed inline: film/studio circular import (Task 3 correction), client-before-connect (Task 7 correction), Windows main-entry guard (Task 7 extension step).
