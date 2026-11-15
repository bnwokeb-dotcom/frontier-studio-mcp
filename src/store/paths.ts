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
