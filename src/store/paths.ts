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
  storyboardsDir(filmId: string): string;
  audioDir(filmId: string): string;
  audioPath(filmId: string, file: string): string;
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
    storyboardsDir: (f) => j('films', f, 'storyboards'),
    audioDir: (f) => j('films', f, 'audio'),
    audioPath: (f, file) => j('films', f, 'audio', file),
    jobsPath: (f) => j('films', f, 'jobs.json'),
    ledgerPath: (f) => j('films', f, 'ledger.jsonl'),
  };
}

function joinPath(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/');
}
