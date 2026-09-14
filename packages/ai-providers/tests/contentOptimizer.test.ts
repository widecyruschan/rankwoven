import { describe, expect, it } from 'vitest';
import { parseContentRewriteOutput, scoreContent } from '../src/contentOptimizer.js';

describe('content optimizer contract', () => {
  it('returns explainable five-dimension checks and confidence without imputing unavailable dimensions', () => {
    const result = scoreContent({
      content: '<p>內容優化能協助編輯改善結構與可讀性。</p><p>這段內容提供明確步驟與 <a href="https://example.com">來源</a>。</p>',
      focusKeyword: '內容優化'
    });

    expect(result.checks.map((item) => item.dimension)).toContain('on_page');
    expect(result.checks.map((item) => item.dimension)).toContain('trust_citability');
    expect(result.checks.some((item) => item.status === 'not_applicable')).toBe(true);
    expect(result.confidence).toBeLessThan(1);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('requires structured rewrite output and preserves source-required claims', () => {
    expect(parseContentRewriteOutput({ suggestedText: '更新後的內容', claims: [{ text: '需要來源的數字', sourceType: 'source_required' }] })).toEqual({
      suggestedText: '更新後的內容',
      claims: [{ text: '需要來源的數字', sourceType: 'source_required', sourceUrl: undefined }]
    });
    expect(parseContentRewriteOutput({ suggestedText: '' })).toBeUndefined();
  });
});
