import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { i18n } from '../src/i18n';

describe('web smoke test', () => {
  it('keeps the app test runner wired', () => {
    expect('AIEO').toContain('SEO'.replace('SEO', 'AIEO'));
  });

  it('resolves media review action labels', async () => {
    const originalLocale = i18n.global.locale.value;
    const appSource = await readFile(resolve('src/App.vue'), 'utf8');
    const mediaViewSource = await readFile(resolve('src/views/MediaOptimizationView.vue'), 'utf8');

    try {
      i18n.global.locale.value = 'en';
      expect(i18n.global.t('common.cancel')).toBe('Cancel');
      expect(i18n.global.t('articleSuggestions.approve')).toBe('Approve');
      expect(i18n.global.t('media.applySelected', { count: 2 })).toBe('Apply selected changes (2)');

      i18n.global.locale.value = 'zh-Hant';
      expect(i18n.global.t('common.cancel')).toBe('取消');
      expect(i18n.global.t('articleSuggestions.approve')).toBe('批准');
      expect(i18n.global.t('media.applySelected', { count: 2 })).toBe('一鍵套用修改（2）');

      expect(mediaViewSource).not.toContain("t('suggestions.approve')");
      expect(mediaViewSource).toContain("t('articleSuggestions.approve')");
      expect(mediaViewSource).not.toContain('<a-tabs');
      expect(mediaViewSource).not.toContain('activeTab');
      expect(mediaViewSource).not.toContain('activeIssue');
      expect(mediaViewSource).not.toContain("issue: activeIssue.value");
      expect(mediaViewSource).toContain(':row-selection="mediaRowSelection"');
      expect(mediaViewSource).toContain('batchApproveOptimizationSuggestions');
      expect(mediaViewSource).toContain('batchApplyOptimizationSuggestions');
      expect(mediaViewSource).toContain('@click="applySelectedMediaSuggestions"');
      expect(mediaViewSource).toContain('selectedIds.has(suggestion.targetCmsId)');
      expect(appSource).not.toContain("{ to: '/app/apply', labelKey: 'nav.apply'");
    } finally {
      i18n.global.locale.value = originalLocale;
    }
  });
});
