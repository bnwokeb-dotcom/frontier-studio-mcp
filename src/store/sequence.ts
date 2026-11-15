// src/store/sequence.ts
import { errValidation } from '../errors.js';
import { filmMetaOrThrow, patchFilmMeta } from './film.js';
import type { StudioPaths } from './paths.js';

export async function sequenceLockGeo(paths: StudioPaths, filmId: string, sequence: string, geoBlock: string): Promise<void> {
  if (!geoBlock.trim()) {
    throw errValidation('geo_block text is empty', 'write the room map: landmarks, frame sides, camera side, 180° axis');
  }
  const current = (await filmMetaOrThrow(paths, filmId)).sequences[sequence]?.geoLocked;
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
