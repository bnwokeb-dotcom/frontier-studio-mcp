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
