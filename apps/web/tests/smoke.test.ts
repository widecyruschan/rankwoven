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
      expect(i18n.global.t('media.retryApply')).toBe('Retry apply');

      i18n.global.locale.value = 'zh-Hant';
      expect(i18n.global.t('common.cancel')).toBe('取消');
      expect(i18n.global.t('articleSuggestions.approve')).toBe('批准');
      expect(i18n.global.t('media.applySelected', { count: 2 })).toBe('一鍵套用修改（2）');
      expect(i18n.global.t('media.retryApply')).toBe('重試套用');

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
      expect(mediaViewSource).toContain('async function retrySuggestion');
      expect(mediaViewSource).toContain("activeReviewRow.suggestion.status === 'failed'");
      expect(mediaViewSource).toContain('@click="retrySuggestion(activeReviewRow.suggestion)"');
      expect(mediaViewSource).toContain('selectedIds.has(suggestion.targetCmsId)');
      expect(appSource).not.toContain("{ to: '/app/apply', labelKey: 'nav.apply'");
    } finally {
      i18n.global.locale.value = originalLocale;
    }
  });

  it('defaults traffic analytics to the first connected site', async () => {
    const analyticsViewSource = await readFile(resolve('src/views/AnalyticsView.vue'), 'utf8');

    expect(analyticsViewSource).toContain('const hasSelectedSite = sites.value.some((site) => site.id === selectedSiteId.value);');
    expect(analyticsViewSource).toContain('selectedSiteId.value = sites.value[0].id;');
    expect(analyticsViewSource.indexOf('await loadSites();')).toBeLessThan(
      analyticsViewSource.indexOf('await loadAnalytics();')
    );
  });

  it('keeps site details customer-facing and delete confirmation controlled', async () => {
    const sitesViewSource = await readFile(resolve('src/views/SitesView.vue'), 'utf8');

    expect(sitesViewSource).toContain('sitePendingDelete');
    expect(sitesViewSource).toContain('@click.stop="openDeleteConfirm(record.raw)"');
    expect(sitesViewSource).toContain('@ok="confirmDeleteSite"');
    expect(sitesViewSource).toContain(':confirm-loading="isDeleting"');
    expect(sitesViewSource).toContain("t('sites.writebackStatus')");
    expect(sitesViewSource).toContain("t('sites.analyticsStatus')");
    expect(sitesViewSource).not.toContain("t('sites.siteId')");
    expect(sitesViewSource).not.toContain("t('sites.tokenPreview')");
    expect(sitesViewSource).not.toContain("t('sites.wordpressUser')");
  });
});
