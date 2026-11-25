// test/storage/r2.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHash, createHmac } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getR2Config, isR2Configured, uploadToR2 } from '../../src/storage/r2.js';
import { StudioError } from '../../src/errors.js';

function sha256Hex(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

describe('Cloudflare R2 Real AWS SigV4 Storage Adapter', () => {
  let root: string;
  const envBackup: Record<string, string | undefined> = {};
  const ENV_KEYS = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_DOMAIN',
  ] as const;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fsm-r2-'));
    for (const k of ENV_KEYS) {
      envBackup[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    for (const k of ENV_KEYS) {
      if (envBackup[k] !== undefined) process.env[k] = envBackup[k];
      else delete process.env[k];
    }
    await rm(root, { recursive: true, force: true });
  });

  it('reports unconfigured and throws AUTH loudly instead of returning fake file:// fallback', async () => {
    expect(getR2Config()).toBeNull();
    expect(isR2Configured()).toBe(false);

    const localFile = join(root, 'rough_cut.mp4');
    await writeFile(localFile, Buffer.from('real-binary-payload'));

    await expect(uploadToR2(localFile, 'films/demo/rough_cut.mp4')).rejects.toThrow(StudioError);
    try {
      await uploadToR2(localFile, 'films/demo/rough_cut.mp4');
      expect.fail('Expected uploadToR2 to throw when credentials are missing');
    } catch (err) {
      expect(err).toBeInstanceOf(StudioError);
      expect((err as StudioError).code).toBe('AUTH');
      expect((err as Error).message).toMatch(/R2 credentials/i);
    }
  });

  it('computes real AWS SigV4 signature and PUTs exact fileBytes to R2 endpoint', async () => {
    process.env.R2_ACCOUNT_ID = 'acct123456';
    process.env.R2_ACCESS_KEY_ID = 'r2_key_abc';
    process.env.R2_SECRET_ACCESS_KEY = 'r2_secret_xyz';
    process.env.R2_BUCKET_NAME = 'my-studio-bucket';

    expect(isR2Configured()).toBe(true);

    const payload = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);
    const localFile = join(root, 'clip.mp4');
    await writeFile(localFile, payload);

    let capturedUrl = '';
    let capturedInit: { method?: string; headers?: Record<string, string>; body?: unknown } | undefined;

    const fakeFetch = async (
      url: string,
      init?: { method?: string; headers?: Record<string, string>; body?: Uint8Array | Buffer | string },
    ) => {
      capturedUrl = url;
      capturedInit = init;
      return {
        ok: true,
        status: 200,
        text: async () => '',
      };
    };

    const result = await uploadToR2(localFile, 'films/my film/rough cut!.mp4', 'video/mp4', fakeFetch);

    const expectedUri = '/my-studio-bucket/films/my%20film/rough%20cut%21.mp4';
    expect(capturedUrl).toBe(`https://acct123456.r2.cloudflarestorage.com${expectedUri}`);
    expect(capturedInit?.method).toBe('PUT');
    expect(Buffer.isBuffer(capturedInit?.body) || capturedInit?.body instanceof Uint8Array).toBe(true);
    expect(Buffer.from(capturedInit?.body as Uint8Array).equals(payload)).toBe(true);

    const headers = capturedInit?.headers ?? {};
    const amzDate = headers['x-amz-date'];
    expect(amzDate).toMatch(/^\d{8}T\d{6}Z$/);
    const dateStamp = amzDate.slice(0, 8);
    const expectedPayloadHash = sha256Hex(payload);
    expect(headers['x-amz-content-sha256']).toBe(expectedPayloadHash);
    expect(headers['content-type']).toBe('video/mp4');
    expect(headers['host']).toBe('acct123456.r2.cloudflarestorage.com');

    // Independently recompute expected AWS SigV4 signature
    const canonicalHeaders =
      `content-type:video/mp4\n` +
      `host:acct123456.r2.cloudflarestorage.com\n` +
      `x-amz-content-sha256:${expectedPayloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = ['PUT', expectedUri, '', canonicalHeaders, signedHeaders, expectedPayloadHash].join('\n');
    const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');
    const kDate = hmacSha256('AWS4r2_secret_xyz', dateStamp);
    const kRegion = hmacSha256(kDate, 'auto');
    const kService = hmacSha256(kRegion, 's3');
    const kSigning = hmacSha256(kService, 'aws4_request');
    const expectedSig = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

    expect(headers['authorization']).toBe(
      `AWS4-HMAC-SHA256 Credential=r2_key_abc/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${expectedSig}`,
    );

    expect(result).toEqual({
      url: `https://acct123456.r2.cloudflarestorage.com${expectedUri}`,
      key: 'films/my film/rough cut!.mp4',
      sizeBytes: payload.length,
    });
  });

  it('uses R2_PUBLIC_DOMAIN for returned URL when configured', async () => {
    process.env.R2_ACCOUNT_ID = 'acct1';
    process.env.R2_ACCESS_KEY_ID = 'key1';
    process.env.R2_SECRET_ACCESS_KEY = 'sec1';
    process.env.R2_PUBLIC_DOMAIN = 'cdn.viduxtool.com';

    const localFile = join(root, 'out.mp4');
    await writeFile(localFile, Buffer.from('mp4bytes'));

    const result = await uploadToR2(
      localFile,
      'films/f1/rough_cut.mp4',
      'video/mp4',
      async () => ({ ok: true, status: 200, text: async () => '' }),
    );
    expect(result.url).toBe('https://cdn.viduxtool.com/films/f1/rough_cut.mp4');
    expect(result.sizeBytes).toBe(8);
  });

  it('throws LANE_DOWN when R2 returns non-2xx HTTP status', async () => {
    process.env.R2_ACCOUNT_ID = 'acct1';
    process.env.R2_ACCESS_KEY_ID = 'key1';
    process.env.R2_SECRET_ACCESS_KEY = 'sec1';

    const localFile = join(root, 'out.mp4');
    await writeFile(localFile, Buffer.from('mp4bytes'));

    try {
      await uploadToR2(localFile, 'films/f1/rough_cut.mp4', 'video/mp4', async () => ({
        ok: false,
        status: 403,
        text: async () => '<Error><Code>AccessDenied</Code></Error>',
      }));
      expect.fail('Expected uploadToR2 to throw on 403');
    } catch (err) {
      expect(err).toBeInstanceOf(StudioError);
      expect((err as StudioError).code).toBe('LANE_DOWN');
      expect((err as Error).message).toContain('403');
      expect((err as Error).message).toContain('AccessDenied');
    }
  });
});
