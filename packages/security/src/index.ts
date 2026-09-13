import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { Agent } from 'undici';

export class UnsafeTargetUrlError extends Error {
  readonly code = 'UNSAFE_TARGET_URL';

  constructor() {
    super('UNSAFE_TARGET_URL');
  }
}

export interface ResolvedAddress {
  address: string;
  family: number;
}

export interface PublicUrlPolicyOptions {
  lookup?: (hostname: string) => Promise<ResolvedAddress[]>;
}

export interface ValidatedPublicUrl {
  url: URL;
  resolvedAddresses: ResolvedAddress[];
}

const blockedHostnames = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.aws.internal'
]);

const maxUrlLength = 2_048;

function isUnsafeIpv4(address: string): boolean {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return true;
  }
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    (a === 100 && b >= 64 && b <= 127) ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isUnsafeIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedIpv4) return isUnsafeIpv4(mappedIpv4[1]);

  const ipv4Tail = normalized.includes('.') ? normalized.slice(normalized.lastIndexOf(':') + 1) : undefined;
  const tailWords = ipv4Tail ? ipv4Tail.split('.').map(Number) : [];
  const withoutIpv4Tail = ipv4Tail ? normalized.slice(0, normalized.lastIndexOf(':')) : normalized;
  const halves = withoutIpv4Tail.split('::');
  if (halves.length > 2) return true;

  const left = halves[0] ? halves[0].split(':').filter(Boolean).map((part) => Number.parseInt(part, 16)) : [];
  const right = halves[1] ? halves[1].split(':').filter(Boolean).map((part) => Number.parseInt(part, 16)) : [];
  const words = ipv4Tail
    ? [...left, ...(halves.length === 2 ? Array(6 - left.length - right.length).fill(0) : []), ...right, (tailWords[0] << 8) | tailWords[1], (tailWords[2] << 8) | tailWords[3]]
    : [...left, ...(halves.length === 2 ? Array(8 - left.length - right.length).fill(0) : []), ...right];
  if (words.length !== 8 || words.some((word) => !Number.isInteger(word) || word < 0 || word > 0xffff)) return true;

  const allZero = words.every((word) => word === 0);
  const loopback = words.slice(0, 7).every((word) => word === 0) && words[7] === 1;
  const mapped = words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;
  const mappedAddress = `${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`;
  return (
    allZero ||
    loopback ||
    (mapped && isUnsafeIpv4(mappedAddress)) ||
    (words[0] & 0xfe00) === 0xfc00 ||
    (words[0] & 0xffc0) === 0xfe80 ||
    (words[0] & 0xff00) === 0xff00 ||
    (words[0] & 0xffc0) === 0xfec0
  );
}

export function isUnsafeIpAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isUnsafeIpv4(address);
  if (family === 6) return isUnsafeIpv6(address);
  return true;
}

async function resolvePublicHostname(hostname: string): Promise<ResolvedAddress[]> {
  const addresses = await dnsLookup(hostname, { all: true, verbatim: true });
  return addresses.map((address) => ({ address: address.address, family: address.family }));
}

function parsePublicUrl(value: string): URL {
  if (value.length === 0 || value.length > maxUrlLength) throw new UnsafeTargetUrlError();

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new UnsafeTargetUrlError();
  }

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.hash ||
    (url.port !== '' && url.port !== '80' && url.port !== '443')
  ) {
    throw new UnsafeTargetUrlError();
  }

  const hostname = url.hostname.toLowerCase();
  if (blockedHostnames.has(hostname) || hostname.endsWith('.localhost')) {
    throw new UnsafeTargetUrlError();
  }

  return url;
}

export async function validatePublicUrl(
  value: string,
  options: PublicUrlPolicyOptions = {}
): Promise<ValidatedPublicUrl> {
  const url = parsePublicUrl(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const authority = value.match(/^[a-z][a-z\d+.-]*:\/\/([^/?#]*)/i)?.[1] ?? '';
  if ([...authority].some((character) => character.charCodeAt(0) > 0x7f)) {
    throw new UnsafeTargetUrlError();
  }
  const family = isIP(hostname);
  const addresses = family
    ? [{ address: hostname, family }]
    : await (options.lookup ?? resolvePublicHostname)(hostname);

  if (!addresses.length || addresses.some(({ address }) => isUnsafeIpAddress(address))) {
    throw new UnsafeTargetUrlError();
  }

  return { url, resolvedAddresses: addresses };
}

export async function validateRedirectTarget(
  location: string,
  currentUrl: URL,
  options: PublicUrlPolicyOptions = {}
): Promise<ValidatedPublicUrl> {
  return validatePublicUrl(new URL(location, currentUrl).toString(), options);
}

export async function fetchValidatedPublicUrl(
  target: ValidatedPublicUrl,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  const resolvedAddress = target.resolvedAddresses[0];
  if (!resolvedAddress) throw new UnsafeTargetUrlError();

  const dispatcher = new Agent({
    connect: {
      lookup: (_hostname, _options, callback) => {
        callback(null, resolvedAddress.address, resolvedAddress.family);
      }
    }
  });

  try {
    const response = await fetchImpl(target.url.toString(), {
      ...init,
      // Redirects must be handled by the caller so every destination can be
      // revalidated before the next request is sent.
      redirect: 'manual',
      dispatcher
    } as RequestInit & { dispatcher: Agent });
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > 2 * 1024 * 1024) {
      throw new Error('PUBLIC_RESPONSE_TOO_LARGE');
    }

    if (!response.body) {
      return new Response(null, { status: response.status, headers: response.headers });
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      totalBytes += chunk.value.byteLength;
      if (totalBytes > 2 * 1024 * 1024) {
        await reader.cancel();
        throw new Error('PUBLIC_RESPONSE_TOO_LARGE');
      }
      chunks.push(chunk.value);
    }

    const body = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new Response(body, { status: response.status, headers: response.headers });
  } finally {
    await dispatcher.close();
  }
}
