import { createSign, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export interface GoogleServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

function base64UrlEncode(value: Buffer | string) {
  return Buffer.from(value).toString('base64url');
}

export async function readGoogleCredentials(
  credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
): Promise<GoogleServiceAccountCredentials | null> {
  const inlineCredentials =
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ??
    (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64
      ? Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64, 'base64').toString('utf8')
      : '');
  if (inlineCredentials) {
    return parseGoogleCredentials(inlineCredentials);
  }

  if (!credentialsPath) {
    return null;
  }

  const rawValue = await readFile(credentialsPath, 'utf8');
  return parseGoogleCredentials(rawValue);
}

function parseGoogleCredentials(rawValue: string): GoogleServiceAccountCredentials | null {
  const credentials = JSON.parse(rawValue) as Partial<GoogleServiceAccountCredentials>;

  if (!credentials.client_email || !credentials.private_key) {
    return null;
  }

  return {
    client_email: credentials.client_email,
    private_key: credentials.private_key
  };
}

export function createServiceAccountJwt(
  credentials: GoogleServiceAccountCredentials,
  scope: string
) {
  const issuedAtSeconds = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: credentials.client_email,
      scope,
      aud: 'https://oauth2.googleapis.com/token',
      exp: issuedAtSeconds + 3600,
      iat: issuedAtSeconds,
      jti: randomUUID()
    })
  );
  const unsignedToken = `${header}.${payload}`;
  const signature = createSign('RSA-SHA256').update(unsignedToken).sign(credentials.private_key, 'base64url');

  return `${unsignedToken}.${signature}`;
}

let cachedAccessToken: string | null = null;
let cachedTokenExpiry = 0;

export async function requestGoogleAccessToken(
  credentials: GoogleServiceAccountCredentials,
  scope: string
): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedTokenExpiry - 300_000) {
    return cachedAccessToken;
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: createServiceAccountJwt(credentials, scope)
    })
  });
  const body = (await response.json()) as { access_token?: string };

  if (!response.ok || !body.access_token) {
    throw new Error('Google access token request failed');
  }

  cachedAccessToken = body.access_token;
  cachedTokenExpiry = Date.now();

  return body.access_token;
}
