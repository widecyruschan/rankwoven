#!/usr/bin/env node
/**
 * Test Google Service Account credentials for GA4 + Search Console + PageSpeed access.
 * Usage: node scripts/test-google-auth.mjs
 * Requires GOOGLE_APPLICATION_CREDENTIALS_JSON env var.
 * Optional: GA4_PROPERTY_ID=properties/XXXXXX to test report fetching.
 */
import { createSign, randomUUID } from 'node:crypto';

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function createJwt(credentials, scope) {
  const iat = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: credentials.client_email,
      scope,
      aud: 'https://oauth2.googleapis.com/token',
      exp: iat + 3600,
      iat,
      jti: randomUUID()
    })
  );
  const unsigned = `${header}.${payload}`;
  const sig = createSign('RSA-SHA256').update(unsigned).sign(credentials.private_key, 'base64url');
  return `${unsigned}.${sig}`;
}

async function getAccessToken(credentials, scope) {
  const jwt = createJwt(credentials, scope);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) {
    throw new Error(`OAuth failed (HTTP ${res.status}): ${JSON.stringify(body).substring(0, 200)}`);
  }
  return body.access_token;
}

async function testApi(name, url, token, opts = {}) {
  process.stdout.write(`  ${name}... `);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
      ...(opts.method ? { method: opts.method, body: opts.body, headers: { ...opts.headers, 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } } : {})
    });
    const body = await res.json().catch(() => null);
    if (res.ok) {
      console.log(`✓ OK (HTTP ${res.status})`);
      if (body && opts.summary) opts.summary(body);
    } else if (res.status === 403 && body?.error?.message?.includes('has not been used')) {
      console.log(`⚠ API NOT ENABLED in GCP project`);
    } else if (res.status === 403) {
      console.log(`⚠ PERMISSION DENIED — service account may lack access to this resource`);
    } else {
      console.log(`✗ HTTP ${res.status}: ${JSON.stringify(body).substring(0, 150)}`);
    }
  } catch (err) {
    console.log(`✗ Error: ${err.message}`);
  }
}

async function main() {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!raw) {
    console.error('GOOGLE_APPLICATION_CREDENTIALS_JSON not set');
    process.exit(1);
  }

  let credentials;
  try {
    credentials = JSON.parse(raw);
  } catch {
    console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON');
    process.exit(1);
  }

  console.log(`Service Account: ${credentials.client_email}`);
  console.log(`Private Key: ${credentials.private_key.substring(0, 27)}... (${credentials.private_key.length} chars)\n`);

  // Get a single token for all scopes we need
  const scopes = [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/webmasters.readonly',
  ].join(' ');

  console.log('--- OAuth Token ---');
  let token;
  try {
    token = await getAccessToken(credentials, scopes);
    console.log(`✓ Token: ${token.substring(0, 12)}... (${token.length} chars)\n`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }

  console.log('--- API Availability Check ---');

  // 1. Analytics Data API (used for GA4 reports) — requires property ID to test
  console.log('Analytics Data API (analyticsdata.googleapis.com):');
  await testApi('metadata', `https://analyticsdata.googleapis.com/v1beta/properties/0/metadata`, token);

  // 2. Search Console API
  console.log('\nSearch Console API (searchconsole.googleapis.com):');
  await testApi('list sites', `https://www.googleapis.com/webmasters/v3/sites`, token, {
    summary: (body) => {
      const sites = body.siteEntry || [];
      console.log(`    ${sites.length} site(s) found`);
      for (const s of sites.slice(0, 3)) {
        console.log(`    - ${s.siteUrl} (${s.permissionLevel})`);
      }
    }
  });

  // 3. PageSpeed Insights API (no auth needed, but verify accessibility)
  console.log('\nPageSpeed Insights API:');
  try {
    const psiRes = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://rankwoven.com&strategy=mobile&key=${token.substring(0, 50)}`);
    console.log(`  Public API: ${psiRes.ok ? '✓ reachable' : `⚠ HTTP ${psiRes.status}`}`);
  } catch {
    console.log('  ✗ unreachable');
  }

  // 4. GA4 Report test (only if property ID provided)
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (propertyId) {
    console.log(`\n--- GA4 Report Test (${propertyId}) ---`);
    try {
      const reportRes = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
            metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
            dimensions: [{ name: 'date' }]
          })
        }
      );
      const reportBody = await reportRes.json();
      if (reportRes.ok) {
        console.log(`✓ Report fetched: ${reportBody.rowCount || 0} rows`);
      } else {
        console.log(`✗ HTTP ${reportRes.status}: ${JSON.stringify(reportBody).substring(0, 300)}`);
      }
    } catch (err) {
      console.log(`✗ Error: ${err.message}`);
    }
  } else {
    console.log('\n--- GA4 Report Test: Skipped (set GA4_PROPERTY_ID=properties/XXXXXX) ---');
  }

  console.log('\n=== Summary ===');
  console.log('OAuth token exchange: ✓');
  console.log('Next steps:');
  console.log('1. Enable "Google Analytics Data API" and "Google Analytics Admin API" in GCP console');
  console.log('2. Grant service account access to target GA4 properties');
  console.log('3. Add GA4 property ID when connecting WordPress sites');
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
