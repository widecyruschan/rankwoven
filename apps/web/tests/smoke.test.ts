import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { blogArticles, getAdjacentBlogArticles, getBlogArticleSeoDescription, loadBlogArticle } from '../src/blog/articles';
import { publicSeoKeywordKeys } from '../src/constants/publicSeo';
import { i18n } from '../src/i18n';
import { updateSeoHead } from '../src/utils/seoHead';

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

  it('keeps public page copy available in English and Traditional Chinese', () => {
    const originalLocale = i18n.global.locale.value;

    try {
      i18n.global.locale.value = 'en';
      expect(i18n.global.t('publicPages.features.title')).toContain('AI SEO Website Optimization Tools');
      expect(i18n.global.t('publicPages.privacy.title')).toBe('AI SEO Tool Privacy Policy');

      i18n.global.locale.value = 'zh-Hant';
      expect(i18n.global.t('publicPages.features.title')).toContain('可審核');
      expect(i18n.global.t('publicPages.terms.title')).toBe('AI SEO 工具服務條款');
    } finally {
      i18n.global.locale.value = originalLocale;
    }
  });

  it('keeps the SEO handbook complete and internally navigable', async () => {
    expect(blogArticles).toHaveLength(86);
    expect(blogArticles.map((article) => article.chapter)).toEqual(Array.from({ length: 86 }, (_, index) => index + 1));
    expect(new Set(blogArticles.map((article) => article.slug)).size).toBe(86);
    expect(blogArticles.every((article) => article.coverImage.endsWith('.webp'))).toBe(true);

    const firstArticle = await loadBlogArticle('seo-introduction');
    expect(firstArticle?.title).toContain('SEO 是什麼');
    expect(firstArticle?.html).toContain('/blog/seo-business-value');
    expect(firstArticle?.html).not.toContain('<script');
    expect(firstArticle?.tableOfContents.length).toBeGreaterThan(3);

    const adjacentArticles = getAdjacentBlogArticles(1);
    expect(adjacentArticles.previous).toBeNull();
    expect(adjacentArticles.next?.slug).toBe('seo-business-value');

    const shortExcerptArticle = await loadBlogArticle('nap-citations');
    expect(shortExcerptArticle).not.toBeNull();
    const seoDescription = getBlogArticleSeoDescription(shortExcerptArticle!);
    expect([...seoDescription].length).toBeGreaterThanOrEqual(120);
    expect([...seoDescription].length).toBeLessThanOrEqual(156);
  });

  it('builds a keyword-aligned public SEO head without indexing private pages', () => {
    document.head.innerHTML = '';

    updateSeoHead({
      title: 'SEO 教學｜網站 SEO 整合 AI 優化教程｜RankWoven',
      description: 'RankWoven SEO 教學與網站 SEO 優化教程。',
      canonicalUrl: 'https://rankwoven.com/',
      indexable: true,
      keywords: ['SEO 教學'],
      locale: 'zh_Hant'
    });

    expect(document.title).toContain('SEO 教學');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain('網站 SEO');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index, follow');
    expect(document.querySelector('meta[name="keywords"]')?.getAttribute('content')).toBe('SEO 教學');
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe('https://rankwoven.com/');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://rankwoven.com/');

    updateSeoHead({
      title: '登入 RankWoven',
      description: '登入工作台。',
      canonicalUrl: 'https://rankwoven.com/login',
      indexable: false,
      locale: 'zh_Hant'
    });

    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
    expect(document.querySelector('meta[name="keywords"]')).toBeNull();
  });

  it('assigns one unique localized keyword to every indexable public page', () => {
    const originalLocale = i18n.global.locale.value;
    const contentPages = ['features', 'docs', 'help', 'about', 'contact', 'privacy', 'terms', 'blog'] as const;

    try {
      for (const locale of ['en', 'zh-Hant'] as const) {
        i18n.global.locale.value = locale;
        const keywords = Object.values(publicSeoKeywordKeys).map((keywordKey) => String(i18n.global.t(keywordKey)));

        expect(keywords).toHaveLength(10);
        expect(new Set(keywords).size).toBe(keywords.length);
        expect(keywords.every((keyword, index) => keyword !== Object.values(publicSeoKeywordKeys)[index])).toBe(true);

        for (const page of contentPages) {
          const keyword = String(i18n.global.t(publicSeoKeywordKeys[page])).toLocaleLowerCase();
          expect(String(i18n.global.t(`publicPages.${page}.title`)).toLocaleLowerCase()).toContain(keyword);
          expect(String(i18n.global.t(`publicPages.${page}.body`)).toLocaleLowerCase()).toContain(keyword);
        }

        const homeKeyword = String(i18n.global.t(publicSeoKeywordKeys.home)).toLocaleLowerCase();
        expect(String(i18n.global.t('marketing.homeTitle')).toLocaleLowerCase()).toContain(homeKeyword);
        expect(String(i18n.global.t('marketing.headline')).toLocaleLowerCase()).toContain(homeKeyword);
        expect(String(i18n.global.t('marketing.homeDescription')).toLocaleLowerCase()).toContain(homeKeyword);

        const pricingKeyword = String(i18n.global.t(publicSeoKeywordKeys.pricing)).toLocaleLowerCase();
        expect(String(i18n.global.t('pricing.title')).toLocaleLowerCase()).toContain(pricingKeyword);
        expect(String(i18n.global.t('pricing.body')).toLocaleLowerCase()).toContain(pricingKeyword);
        expect(String(i18n.global.t('marketing.pricingDescription')).toLocaleLowerCase()).toContain(pricingKeyword);
      }

      i18n.global.locale.value = 'zh-Hant';
      expect(i18n.global.t(publicSeoKeywordKeys.home)).toBe('SEO 教學');
    } finally {
      i18n.global.locale.value = originalLocale;
    }
  });
});
