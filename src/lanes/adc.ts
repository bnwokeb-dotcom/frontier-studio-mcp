// src/lanes/adc.ts — Shared GCP Application Default Credentials (authorized_user) OAuth2 token exchange.
import { readFile } from 'node:fs/promises';
import { errAuth, errLaneDown } from '../errors.js';
import type { FetchLike } from './types.js';

export interface AuthorizedUserCreds {
  type?: string;
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
}

export async function loadAuthorizedUserCreds(credentialsPath: string): Promise<AuthorizedUserCreds> {
  let creds: AuthorizedUserCreds;
  try {
    creds = JSON.parse(await readFile(credentialsPath, 'utf8')) as AuthorizedUserCreds;
  } catch {
    throw errAuth(
      `ADC credentials not readable at ${credentialsPath}`,
      'run gcloud auth application-default login, or set GOOGLE_APPLICATION_CREDENTIALS to the credentials file',
    );
  }
  if (creds.type !== 'authorized_user' || !creds.refresh_token || !creds.client_id || !creds.client_secret) {
    throw errAuth(
      `ADC credentials at ${credentialsPath} are not an authorized_user file`,
      'run gcloud auth application-default login to create one',
    );
  }
  return creds;
}

export async function refreshAdcAccessToken(
  creds: AuthorizedUserCreds,
  fetchFn: FetchLike = fetch,
): Promise<{ access_token: string; expires_in: number }> {
  let res: Awaited<ReturnType<FetchLike>>;
  try {
    res = await fetchFn('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: creds.client_id ?? '',
        client_secret: creds.client_secret ?? '',
        refresh_token: creds.refresh_token ?? '',
        grant_type: 'refresh_token',
      }).toString(),
    });
  } catch (e) {
    throw errLaneDown(`token refresh unreachable (${(e as Error).message})`, 'check network, then retry');
  }
  const raw = await res.text().catch(() => '');
  let json: { access_token?: string; expires_in?: number; error_description?: string };
  try {
    json = JSON.parse(raw) as { access_token?: string; expires_in?: number; error_description?: string };
  } catch {
    throw errLaneDown(
      'token refresh returned an unreadable response',
      'retry; if it persists, re-run gcloud auth application-default login',
    );
  }
  if (!res.ok || !json.access_token) {
    throw errAuth(
      `token refresh rejected: ${json.error_description ?? raw.slice(0, 200)}`,
      're-run gcloud auth application-default login to refresh the consent',
    );
  }
  return { access_token: json.access_token, expires_in: json.expires_in ?? 3600 };
}
