#!/usr/bin/env node
/* eslint-env node */

/**
 * AI 模型 JSON 輸出驗證腳本（使用實際可用模型）
 *
 * 透過 Wenwen proxy API 測試實際可用的三個模型：
 * - OpenAI: gpt-4o-mini
 * - Google Gemini: gemini-2.5-flash
 * - Google Gemini: gemini-2.5-pro
 *
 * 安全規則：不輸出完整 API Key
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

function loadEnv() {
  const envPath = resolve(repoRoot, '.env');
  const content = readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
  return env;
}

const env = loadEnv();
const BASE_URL = (env.WENWEN_API_BASE_URL || 'https://breakout.wenwen-ai.com').replace(/\/$/, '');
const API_KEY = env.WENWEN_API_KEY || '';

if (!API_KEY) {
  console.error('ERROR: WENWEN_API_KEY not set in .env');
  process.exit(1);
}

const safeKey = API_KEY.length > 8 ? API_KEY.slice(0, 8) + '...' : '***';

// 實際可用的三個模型
const MODELS = [
  { name: 'OpenAI (gpt-4o-mini)', model: 'gpt-4o-mini', provider: 'openai' },
  { name: 'Google Gemini (2.5 Flash)', model: 'gemini-2.5-flash', provider: 'google' },
  { name: 'Google Gemini (2.5 Pro)', model: 'gemini-2.5-pro', provider: 'google' }
];

const JSON_SYSTEM_PROMPT =
  'You are RankWoven SEO assistant. You must ALWAYS return ONLY valid JSON. No markdown, no explanation, no code fences. ONLY the raw JSON object.';

function buildTestPrompt(testId) {
  switch (testId) {
    case 0:
      return `Return a JSON object with these fields:
- "keywords": array of 3 SEO-related keywords
- "source": string, always "ai-test"
- "timestamp": ISO 8601 date string
Return ONLY the raw JSON object, no markdown.`;
    case 1:
      return `Return a JSON object matching this exact schema:
{
  "suggestions": [
    {
      "keyword": "string (SEO keyword)",
      "monthlySearchVolume": number (50-100000),
      "cpcUsd": number (0.05-50.0),
      "competition": number (0.0-1.0),
      "difficulty": "low" | "medium" | "high",
      "intent": "informational" | "commercial" | "transactional",
      "contentAngle": "string (one-sentence content angle in English)"
    }
  ]
}
Generate 3 suggestions for the seed keyword "digital marketing tools".
Return ONLY the raw JSON object, no markdown.`;
    case 2:
      return `Return a JSON array of 3 objects, each with fields: "rank", "keyword", "volume", "difficulty".
Sort by volume descending.
Return ONLY the raw JSON array, no markdown.`;
    default:
      return 'Return ONLY {"status":"ok","message":"hello"} as raw JSON, no markdown.';
  }
}

async function requestModel(model, testId, modelIndex) {
  const url = `${BASE_URL}/v1/chat/completions`;

  const body = {
    model,
    temperature: 0.3,
    messages: [
      { role: 'system', content: JSON_SYSTEM_PROMPT },
      { role: 'user', content: buildTestPrompt(testId) }
    ]
  };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000)
    });
  } catch (err) {
    return { success: false, status: 0, error: `Network error: ${err.message}` };
  }

  const json = await response.json();

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      error: json.error?.message || `HTTP ${response.status}`,
      raw: JSON.stringify(json).slice(0, 300)
    };
  }

  const text = json.choices?.[0]?.message?.content;
  const usage = json.usage;

  if (!text) {
    return {
      success: false,
      status: response.status,
      error: 'Empty response content'
    };
  }

  // JSON 解析
  let parsed;
  let parseError = null;
  let wasCleaned = false;

  try {
    parsed = JSON.parse(text);
  } catch {
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();
    try {
      parsed = JSON.parse(cleaned);
      wasCleaned = true;
    } catch (e2) {
      parseError = e2.message;
    }
  }

  if (!parsed) {
    return {
      success: false,
      status: response.status,
      error: `JSON parse error: ${parseError || 'unknown'}`,
      rawText: text.slice(0, 800)
    };
  }

  // 驗證 JSON 結構完整性
  const validations = [];
  if (testId === 0) {
    validations.push(Array.isArray(parsed.keywords) ? 'keywords[] ✓' : 'keywords[] ✗');
    validations.push(typeof parsed.source === 'string' ? 'source ✓' : 'source ✗');
    validations.push(typeof parsed.timestamp === 'string' ? 'timestamp ✓' : 'timestamp ✗');
  } else if (testId === 1) {
    validations.push(Array.isArray(parsed.suggestions) ? `suggestions[${parsed.suggestions?.length || 0}] ✓` : 'suggestions[] ✗');
    if (parsed.suggestions?.[0]) {
      const s = parsed.suggestions[0];
      validations.push(s.keyword ? 'keyword ✓' : 'keyword ✗');
      validations.push(typeof s.monthlySearchVolume === 'number' ? 'volume ✓' : 'volume ✗');
      validations.push(typeof s.cpcUsd === 'number' ? 'cpc ✓' : 'cpc ✗');
    }
  } else if (testId === 2) {
    validations.push(Array.isArray(parsed) ? `array[${parsed.length}] ✓` : 'array ✗');
  }

  return {
    success: true,
    status: response.status,
    modelUsed: json.model || model,
    wasCleaned,
    type: Array.isArray(parsed) ? 'array' : 'object',
    fields: validations,
    usage: usage
      ? { in: usage.prompt_tokens, out: usage.completion_tokens, total: usage.total_tokens }
      : { in: 0, out: 0, total: 0 }
  };
}

const TEST_NAMES = ['Basic JSON object', 'Nested SEO schema', 'JSON array'];

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  RankWoven AI Model JSON Output Validation');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Base URL  : ${BASE_URL}`);
  console.log(`  API Key   : ${safeKey}`);
  console.log(`  Test time : ${new Date().toISOString()}`);
  console.log(`  Models tested: ${MODELS.length}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  let allPassed = true;
  const allResults = [];

  for (let mi = 0; mi < MODELS.length; mi++) {
    const { name, model, provider } = MODELS[mi];

    console.log(`\n── ${name} (${model}) ──`);

    const modelResults = [];
    for (let testId = 0; testId < 3; testId++) {
      process.stdout.write(`   [${testId + 1}/3] ${TEST_NAMES[testId]}... `);

      const result = await requestModel(model, testId, mi);
      const icon = result.success ? '✓ PASS' : '✗ FAIL';
      console.log(icon);

      if (result.success) {
        const cleaned = result.wasCleaned ? ' (stripped markdown)' : '';
        console.log(`       → type=${result.type}  model=${result.modelUsed}${cleaned}`);
        console.log(`       → tokens: in=${result.usage.in} out=${result.usage.out} total=${result.usage.total}`);
        if (result.fields.length > 0) {
          console.log(`       → ${result.fields.join(', ')}`);
        }
      } else {
        allPassed = false;
        console.log(`       → Error: ${result.error}`);
        if (result.rawText) {
          console.log(`       → Raw (first 400 chars): ${result.rawText.slice(0, 400)}`);
        }
      }

      modelResults.push({ test: TEST_NAMES[testId], ...result });
      allResults.push({ model: name, modelId: model, test: TEST_NAMES[testId], passed: result.success });

      if (testId < 2) await new Promise((r) => setTimeout(r, 300));
    }
  }

  // ── 匯總 ──
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  FINAL SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');

  const total = allResults.length;
  const passed = allResults.filter((r) => r.passed).length;

  console.log(`  Total: ${total}  |  Passed: ${passed}  |  Failed: ${total - passed}`);
  console.log('');

  for (const { name, modelId } of MODELS) {
    const mr = allResults.filter((r) => r.modelId === modelId);
    const mp = mr.filter((r) => r.passed).length;
    const bar = mp === 3 ? '✓✓✓' : mp === 0 ? '✗✗✗' : `${mp}/3`;
    console.log(`  ${name.padEnd(30)} ${bar}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  RESULT: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('═══════════════════════════════════════════════════════════════');

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
