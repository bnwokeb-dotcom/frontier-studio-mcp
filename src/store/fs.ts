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
