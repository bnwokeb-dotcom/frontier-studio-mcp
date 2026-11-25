// src/storage/r2.ts — Cloudflare R2 Object Storage Adapter ($0 Egress Video Hosting)
// Connects VIDUXTOOL to Cloudflare R2 via native AWS Signature Version 4 (SigV4) HTTP PUT uploads.

import { createHash, createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { errAuth, errLaneDown, errNotFound, errValidation } from '../errors.js';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicDomain?: string;
}

export type R2FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: Uint8Array | Buffer | string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

function encodeRfc3986(segment: string): string {
  return encodeURIComponent(segment).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

export function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim() || 'viduxtool-renders';
  const publicDomain = process.env.R2_PUBLIC_DOMAIN?.trim() || undefined;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicDomain,
  };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

/**
 * Signs and uploads a local media file to Cloudflare R2 using AWS Signature Version 4 (S3-compatible PUT).
 */
export async function uploadToR2(
  localPath: string,
  r2Key: string,
  contentType: string = 'video/mp4',
  fetchFn: R2FetchLike = globalThis.fetch as unknown as R2FetchLike,
): Promise<{ url: string; key: string; sizeBytes: number }> {
  const cfg = getR2Config();
  if (!cfg) {
    throw errAuth(
      'Cloudflare R2 credentials are not configured',
      'set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY',
    );
  }

  const cleanKey = r2Key.replace(/^\/+/, '');
  if (!cleanKey) {
    throw errValidation('r2Key is required', 'provide a non-empty R2 object key');
  }

  let fileBytes: Buffer;
  try {
    fileBytes = await readFile(localPath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      throw errNotFound(
        `local file not found for R2 upload: ${localPath}`,
        'verify the artifact file exists on disk before calling uploadToR2',
      );
    }
    throw errValidation(
      `failed to read local file for R2 upload: ${(err as Error).message}`,
      'pass a valid readable file path',
    );
  }
  const cleanContentType = contentType.trim() || 'application/octet-stream';

  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const encodedKeySegments = cleanKey.split('/').map(encodeRfc3986).join('/');
  const canonicalUri = `/${encodeRfc3986(cfg.bucketName)}/${encodedKeySegments}`;
  const endpoint = `https://${host}${canonicalUri}`;

  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(fileBytes);

  const canonicalHeaders =
    `content-type:${cleanContentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmacSha256(`AWS4${cfg.secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, 'auto');
  const kService = hmacSha256(kRegion, 's3');
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  let res: Awaited<ReturnType<R2FetchLike>>;
  try {
    res = await fetchFn(endpoint, {
      method: 'PUT',
      headers: {
        'content-type': cleanContentType,
        host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        authorization,
      },
      body: fileBytes,
    });
  } catch (err) {
    throw errLaneDown(
      `Cloudflare R2 upload network error: ${(err as Error).message}`,
      'check R2 endpoint connectivity and credentials',
    );
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw errLaneDown(
      `Cloudflare R2 upload failed (${res.status}): ${errBody}`,
      'verify R2 bucket permissions and API token',
    );
  }

  const cleanDomain = cfg.publicDomain?.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  const publicUrl = cleanDomain ? `https://${cleanDomain}/${encodedKeySegments}` : endpoint;

  return {
    url: publicUrl,
    key: cleanKey,
    sizeBytes: fileBytes.length,
  };
}
