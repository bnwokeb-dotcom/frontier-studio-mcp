// src/store/asset.ts
import { copyFile, readFile, rename, rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { writeText, readText, ensureDir } from './fs.js';
import { errValidation, errNotFound } from '../errors.js';
import { assertId, filmMetaOrThrow } from './film.js';
import type { AssetKindDir, StudioPaths } from './paths.js';

export type AssetKind = 'character' | 'location' | 'prop' | 'style';
const KIND_DIR: Record<AssetKind, AssetKindDir> = {
  character: 'characters', location: 'locations', prop: 'props', style: 'styles',
};

export type AnatomyProfile = 'humanoid' | 'creature' | 'hybrid';

export interface BiologicalMarkers {
  anatomyProfile?: AnatomyProfile;
  irisColorHex?: string;
  boneStructure?: string;
  signatureMarks?: string;
  ethnicAncestry?: string;
  locomotionRig?: string;
  carapaceMaterial?: string;
  corneaSpec?: string;
  collarHarness?: string;
}

/** Formats persisted biological/anatomical markers into a deterministic prompt clause. */
export function formatBiologicalMarkersClause(bio: BiologicalMarkers): string | undefined {
  const parts: string[] = [];
  if (bio.irisColorHex) parts.push(`exact iris color ${bio.irisColorHex}`);
  if (bio.boneStructure) parts.push(`bone structure: ${bio.boneStructure}`);
  if (bio.signatureMarks) parts.push(`distinctive markings: ${bio.signatureMarks}`);
  if (bio.ethnicAncestry) parts.push(`ancestry: ${bio.ethnicAncestry}`);
  if (bio.locomotionRig) parts.push(`locomotion rig: ${bio.locomotionRig}`);
  if (bio.carapaceMaterial) parts.push(`surface/carapace: ${bio.carapaceMaterial}`);
  if (bio.corneaSpec) parts.push(`corneal eye spec: ${bio.corneaSpec}`);
  if (bio.collarHarness) parts.push(`collar/harness integration: ${bio.collarHarness}`);
  return parts.length > 0 ? `Biological consistency markers: ${parts.join(', ')}.` : undefined;
}

/** Reads biological_markers.json from an asset directory if present and valid. */
export async function readBiologicalMarkers(assetDir: string): Promise<BiologicalMarkers | undefined> {
  try {
    const raw = await readText(`${assetDir}/biological_markers.json`);
    return JSON.parse(raw) as BiologicalMarkers;
  } catch {
    return undefined;
  }
}

export interface AssetInput {
  kind: AssetKind; assetId: string; descriptor: string;
  voice?: string; acting?: string; geoBlock?: string;
  voiceSamplePath?: string; voiceId?: string; voiceProvider?: 'google' | 'elevenlabs';
  biologicalMarkers?: BiologicalMarkers;
  parentDna?: string;
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

    if (input.voiceSamplePath) {
      await copyFile(input.voiceSamplePath, joinDir(dir, 'voice_sample.wav'));
    }
    if (input.voiceId || input.voiceProvider || input.voiceSamplePath) {
      const isGoogleName = Boolean(input.voiceId && (input.voiceId.includes('-') || ['Charon', 'Fenrir', 'Puck', 'Aoede', 'Kore'].includes(input.voiceId)));
      const profile = {
        voiceId: input.voiceId ?? null,
        provider: input.voiceProvider ?? (isGoogleName ? 'google' : input.voiceId ? 'elevenlabs' : 'google'),
        hasSample: Boolean(input.voiceSamplePath),
      };
      await writeText(joinDir(dir, 'voice_profile.json'), JSON.stringify(profile, null, 2));
    }
    let markers = input.biologicalMarkers;
    if (input.parentDna) {
      await writeText(joinDir(dir, 'parent_dna.txt'), input.parentDna.trim());
      const parentDir = paths.assetDir(filmId, 'characters', input.parentDna.trim());
      try {
        const parentMarkersRaw = await readText(joinDir(parentDir, 'biological_markers.json'));
        const parentMarkers = JSON.parse(parentMarkersRaw) as BiologicalMarkers;
        markers = { ...parentMarkers, ...markers };
      } catch {
        // Parent may not define biological_markers.json
      }
    }
    if (markers) {
      await writeText(joinDir(dir, 'biological_markers.json'), JSON.stringify(markers, null, 2));
    }
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

// The four kind dirs, in probe order — deterministic when the same asset_id is
// (pathologically) registered under two kinds: the earliest hit wins.
const PROBE_ORDER: AssetKindDir[] = ['characters', 'locations', 'props', 'styles'];

// Which kind dir holds the asset (descriptor.md present)? undefined → registered
// nowhere. Callers turn undefined into NOT_FOUND with their own wording; a hit
// under a non-character kind is also the explicit kind check for tools that are
// character-only (e.g. character_sheet_build), so a location id fails with its
// actual kind named instead of a blind "no file under characters/".
export async function findAssetKindDir(paths: StudioPaths, filmId: string, assetId: string): Promise<AssetKindDir | undefined> {
  for (const kindDir of PROBE_ORDER) {
    try {
      await readFile(`${paths.assetDir(filmId, kindDir, assetId)}/descriptor.md`);
      return kindDir;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
  }
  return undefined;
}

// Canonical asset images only: a character's sheet, a location's or style's
// plate (styles keyframe to plate.png via keyframe_build — Task 5 ruling). The
// name↔kind pairing is the law — sheet.png is a character file, plate.png a
// location/style file — so a plate can never masquerade as a sheet.
const ASSET_IMAGE_NAME = /^sheet\.png$|^plate\.png$/;

export async function attachImage(
  paths: StudioPaths,
  filmId: string,
  kindDir: AssetKindDir,
  assetId: string,
  srcPath: string,
  name: string,
): Promise<string> {
  // pure arg validation first, then existence, then the effect
  if (!ASSET_IMAGE_NAME.test(name)) {
    throw errValidation(
      `asset images are sheet.png or plate.png (got "${name}")`,
      'name the image sheet.png (characters) or plate.png (locations)',
    );
  }
  if (name === 'sheet.png' && kindDir !== 'characters') {
    throw errValidation(
      'sheet.png is a characters image',
      `asset "${assetId}" is a ${kindDir} asset — canonical images: sheet.png for characters · plate.png for locations and styles`,
    );
  }
  if (name === 'plate.png' && kindDir !== 'locations' && kindDir !== 'styles') {
    throw errValidation(
      'plate.png is a locations or styles image',
      `asset "${assetId}" is a ${kindDir} asset — plate.png attaches to locations or styles, sheet.png to characters`,
    );
  }
  await assertAssetExists(paths, filmId, kindDir, assetId);
  const dir = paths.assetDir(filmId, kindDir, assetId);
  const dest = `${dir}/${name}`;
  await ensureDir(dir);
  // tmp+rename (same dir, writeJsonAtomic's pattern): the swap onto dest is
  // atomic, so a failed or half-finished copy can never leave the canonical
  // name pointing at partial or mismatched bytes. The tmp copy is dropped on
  // any failure so no debris lingers in the asset dir.
  const tmp = `${dest}.tmp-${randomBytes(4).toString('hex')}`;
  try {
    await copyFile(srcPath, tmp);
    await rename(tmp, dest);
  } catch (e) {
    try { await rm(tmp, { force: true }); } catch { /* nothing to clean up */ }
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      throw errNotFound(
        `image not found: ${srcPath}`,
        'use an absolute path, a STUDIO_ROOT-relative path, or a film-relative path that exists',
      );
    }
    throw e;
  }
  return dest;
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
