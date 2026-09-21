import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  blogArticles,
  getAdjacentBlogArticles,
  getBlogArticleSeoDescription,
  loadBlogArticle
} from '../src/blog/articles';
import { publicSeoKeywordKeys } from '../src/constants/publicSeo';
import {
  activePublicSeoRoutes,
  activeRouteEntries,
  getNavigationRoutes,
  plannedRouteEntries,
  routeRegistry
} from '../src/constants/routeRegistry';
import { useTheme } from '../src/composables/useTheme';
import { i18n } from '../src/i18n';
import { darkAntDesignTheme, darkWorkspacePalette } from '../src/theme/darkWorkspaceTheme';
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
      expect(mediaViewSource).not.toContain('issue: activeIssue.value');
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

  it('prefers the site-scoped route context for traffic analytics', async () => {
    const analyticsViewSource = await readFile(resolve('src/views/AnalyticsView.vue'), 'utf8');

    expect(analyticsViewSource).toContain(
      "const routedSiteId = computed(() => typeof route.params.siteId === 'string' ? route.params.siteId : '');"
    );
    expect(analyticsViewSource).toContain("sites.value.some((site) => site.id === routedSiteId.value)");
    expect(analyticsViewSource).toContain('v-if="!routedSiteId"');
    const pageLoaderSource = analyticsViewSource.slice(analyticsViewSource.indexOf('async function loadAnalyticsPage()'));
    expect(pageLoaderSource.indexOf('await loadSites();')).toBeLessThan(
      pageLoaderSource.indexOf('await loadAnalytics();')
    );
    expect(analyticsViewSource).toContain('formatCalendarDate(date)');
    expect(analyticsViewSource).not.toContain('date.toISOString().slice(0, 10)');
  });

  it('allows manually added sites to connect a read-only GA4 Property ID', async () => {
    const analyticsViewSource = await readFile(resolve('src/views/AnalyticsView.vue'), 'utf8');
    const siteApiSource = await readFile(resolve('src/api/siteConnections.ts'), 'utf8');
    expect(analyticsViewSource).toContain('manualPropertyDescription');
    expect(analyticsViewSource).toContain('saveAnalyticsPropertyId');
    expect(analyticsViewSource).toContain("updateSiteAnalyticsSettings(selectedSiteId.value");
    expect(siteApiSource).toContain('/analytics-settings');
  });

  it('keeps the content editor aligned with the five-step editorial workflow', async () => {
    const editorSource = await readFile(resolve('src/views/ContentOptimizerView.vue'), 'utf8');
    const editorApiSource = await readFile(resolve('src/api/contentOptimization.ts'), 'utf8');

    expect(editorSource).toContain('content-editor-steps');
    expect(editorSource).toContain("t('contentOptimizer.steps.brief')");
    expect(editorSource).toContain("t('contentOptimizer.steps.draft')");
    expect(editorSource).toContain("t('contentOptimizer.steps.image')");
    expect(editorSource).toContain("t('contentOptimizer.steps.links')");
    expect(editorSource).toContain("t('contentOptimizer.steps.publish')");
    expect(editorSource).toContain('getSyncedArticles');
    expect(editorSource).toContain('createContentRewrite');
    expect(editorSource).toContain('@click="analyzeContent"');
    expect(editorSource).toContain("getRoutePath('app-site-media-scoped'");
    expect(editorSource).toContain("getRoutePath('app-site-links-scoped'");
    expect(editorSource).toContain('publishDisabled');
    expect(editorApiSource).toContain('tone?: string;');
    expect(editorApiSource).toContain('updateContentRewriteSuggestion');
  });

  it('keeps manual URL and synced-content audits read-only', async () => {
    const auditViewSource = await readFile(resolve('src/views/SiteAuditView.vue'), 'utf8');
    const auditApiSource = await readFile(resolve('src/api/siteConnections.ts'), 'utf8');

    expect(auditViewSource).toContain('manualReadOnlyDescription');
    expect(auditViewSource).toContain('handleManualUrlAudit');
    expect(auditViewSource).toContain('handleSyncedContentAudit');
    expect(auditViewSource).toContain("article.type === 'post' || article.type === 'product'");
    expect(auditApiSource).toContain('/site-audit/manual-runs');
    expect(auditApiSource).toContain('writebackEnabled: false');
  });

  it('shows affected page URLs and gates one-click fixes by writeback capability', async () => {
    const auditViewSource = await readFile(resolve('src/views/SiteAuditView.vue'), 'utf8');
    expect(auditViewSource).toContain('affectedUrls');
    expect(auditViewSource).toContain('handleOneClickFix');
    expect(auditViewSource).toContain('selectedSite?.canWriteBack');
    expect(auditViewSource).toContain("safeOneClickSuggestionTypes.has(suggestion.suggestionType)");
    expect(auditViewSource).toContain("batchApplyOptimizationSuggestions(selectedSiteId.value");
    expect(auditViewSource).toContain('canonicalSeoCategories');
    expect(auditViewSource).toContain('recommendationAi');
    expect(auditViewSource).toContain('getSearchConsolePages');
    expect(auditViewSource).toContain('handleIssueFixForRow');
  });

  it('keeps a single current-site context across customer navigation', async () => {
    const appSource = await readFile(resolve('src/App.vue'), 'utf8');
    const routerSource = await readFile(resolve('src/router/index.ts'), 'utf8');
    const siteStoreSource = await readFile(resolve('src/stores/site.ts'), 'utf8');

    expect(appSource).toContain('useSiteStore');
    expect(appSource).toContain('global-site-switcher');
    expect(appSource).toContain("'app-site-audit-scoped'");
    expect(routerSource).toContain('siteStore.refreshSites()');
    expect(siteStoreSource).toContain('rankwoven_current_site_id');
    expect(siteStoreSource).toContain('site.status === \'connected\'');
  });

  it('renders one in-page title and aligns non-standard customer pages', async () => {
    const appSource = await readFile(resolve('src/App.vue'), 'utf8');
    const alertsSource = await readFile(resolve('src/views/AlertsView.vue'), 'utf8');
    const monitorSource = await readFile(resolve('src/views/MonitorEventsView.vue'), 'utf8');
    const billingSource = await readFile(resolve('src/views/BillingView.vue'), 'utf8');
    const auditSource = await readFile(resolve('src/views/SiteAuditView.vue'), 'utf8');

    expect(appSource).toContain('class="topbar-context"');
    expect(appSource).not.toContain('<h1>{{ currentTitle }}</h1>');
    expect(alertsSource).toContain('<section class="page-section alerts-view">');
    expect(monitorSource).toContain('<section class="page-section monitor-events-view">');
    expect(billingSource).toContain('<section class="page-section billing-view">');
    expect(auditSource).toContain('<div class="page-section site-audit-view">');
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
      expect(i18n.global.t('publicPages.features.title')).toContain(
        'AI SEO Website Optimization Tools'
      );
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
    expect(blogArticles.map((article) => article.chapter)).toEqual(
      Array.from({ length: 86 }, (_, index) => index + 1)
    );
    expect(new Set(blogArticles.map((article) => article.slug)).size).toBe(86);
    expect(blogArticles.every((article) => article.coverImage.endsWith('.webp'))).toBe(true);

    const firstArticle = await loadBlogArticle('seo-introduction');
    expect(firstArticle?.title).toContain('SEO 是什麼');
    expect(firstArticle?.seoTitle).toContain('2026 香港新手');
    expect(firstArticle?.metaDescription).toContain('香港市場');
    expect(firstArticle?.focusKeyphrase).toBe('SEO是什麼');
    expect(firstArticle?.html).not.toContain('seo_title');
    expect(firstArticle?.html).not.toContain('meta_description');
    expect(firstArticle?.html).toContain('香港本地');
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

  it('uses imported SEO attributes for the blog head instead of article body content', async () => {
    const blogArticleViewSource = await readFile(resolve('src/views/BlogArticleView.vue'), 'utf8');
    const importScriptSource = await readFile(resolve('../../scripts/import-seo-blog.mjs'), 'utf8');

    expect(blogArticleViewSource).toContain('currentArticle.seoTitle');
    expect(blogArticleViewSource).toContain('currentArticle.metaDescription');
    expect(blogArticleViewSource).toContain('currentArticle.focusKeyphrase');
    expect(importScriptSource).toContain('parseFrontmatter');
    expect(importScriptSource).toContain("replaceAll('在地', '本地')");
    expect(importScriptSource).toContain('seoTitle: attributes.seo_title');
    expect(importScriptSource).toContain('generated-images');
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
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
      '網站 SEO'
    );
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'index, follow'
    );
    expect(document.querySelector('meta[name="keywords"]')?.getAttribute('content')).toBe(
      'SEO 教學'
    );
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
      'https://rankwoven.com/'
    );
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://rankwoven.com/'
    );
    expect(
      document.querySelector('link[rel="alternate"][hreflang="x-default"]')?.getAttribute('href')
    ).toBe('https://rankwoven.com/');
    expect(document.querySelector('#rankwoven-route-schema')?.textContent).toContain('WebPage');

    updateSeoHead({
      title: '登入 RankWoven',
      description: '登入工作台。',
      canonicalUrl: 'https://rankwoven.com/login',
      indexable: false,
      locale: 'zh_Hant'
    });

    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow'
    );
    expect(document.querySelector('meta[name="keywords"]')).toBeNull();
    expect(document.querySelector('link[rel="alternate"][hreflang="x-default"]')).toBeNull();
    expect(document.querySelector('#rankwoven-route-schema')).toBeNull();
  });

  it('keeps the route registry as the source of truth for public and private boundaries', () => {
    expect(activePublicSeoRoutes.map((route) => route.publicSeoKey)).toEqual(
      Object.keys(publicSeoKeywordKeys)
    );
    expect(new Set(activePublicSeoRoutes.map((route) => route.path)).size).toBe(
      activePublicSeoRoutes.length
    );
    expect(activePublicSeoRoutes.every((route) => route.indexable && route.sitemapGroup)).toBe(
      true
    );
    const privateRoutes = activeRouteEntries.filter((route) => route.area !== 'public');
    expect(privateRoutes.every((route) => route.indexable === false)).toBe(true);
    expect(privateRoutes.every((route) => route.sitemapGroup === undefined)).toBe(true);
    expect(getNavigationRoutes('customer').every((route) => route.area === 'customer')).toBe(true);
    expect(getNavigationRoutes('admin').every((route) => route.area === 'admin')).toBe(true);
    const appDashboard = activeRouteEntries.find((route) => route.id === 'app-dashboard');
    expect(appDashboard).toMatchObject({ componentKey: 'SiteAuditView', titleKey: 'nav.siteAudit' });
    expect(routeRegistry.redirects).toEqual(
      expect.arrayContaining([
        { from: '/app/articles', to: '/app/sites' },
        { from: '/app/article-sync', to: '/app/tasks' }
      ])
    );
    const siteResearch = activeRouteEntries.find((route) => route.id === 'app-site-research');
    expect(siteResearch).toMatchObject({
      siteScope: 'required',
      featureKey: 'keyword_research',
      parentId: 'app-sites'
    });
    expect(plannedRouteEntries.every((route) => route.enabled === false)).toBe(true);
    const contentOptimizer = activeRouteEntries.find((route) => route.id === 'app-site-content-optimizer');
    expect(contentOptimizer).toMatchObject({
      siteScope: 'required',
      featureKey: 'content_optimization',
      parentId: 'app-sites',
      navigationSurface: 'customer_sidebar'
    });
    expect(activeRouteEntries.some((route) => route.id === 'public-tools')).toBe(false);
    const billingRoute = activeRouteEntries.find((route) => route.id === 'app-billing');
    expect(billingRoute).toMatchObject({
      componentKey: 'BillingView',
      featureKey: 'billing',
      navigationSurface: 'customer_sidebar',
      indexable: false
    });
  });

  it('localizes navigation groups without exposing missing i18n keys', async () => {
    const originalLocale = i18n.global.locale.value;
    const appSource = await readFile(resolve('src/App.vue'), 'utf8');

    try {
      i18n.global.locale.value = 'en';
      expect(i18n.global.t('navigationGroups.workspace')).toBe('Monitoring');
      expect(i18n.global.t('navigationGroups.workspace_operations')).toBe('Workspace Operations');
      expect(i18n.global.t('navigationGroups.current_site')).toBe('Current Site');

      i18n.global.locale.value = 'zh-Hant';
      expect(i18n.global.t('navigationGroups.workspace')).toBe('監控');
      expect(i18n.global.t('navigationGroups.workspace_operations')).toBe('工作區操作');
      expect(i18n.global.t('navigationGroups.current_site')).toBe('目前站點');
      expect(appSource).toContain('function navigationGroupLabel(group: string)');
      expect(appSource).toContain("t('navigationGroups.default')");
    } finally {
      i18n.global.locale.value = originalLocale;
    }
  });

  it('assigns one unique localized keyword to every indexable public page', () => {
    const originalLocale = i18n.global.locale.value;
    const contentPages = [
      'features',
      'docs',
      'help',
      'about',
      'contact',
      'privacy',
      'terms',
      'blog'
    ] as const;

    try {
      for (const locale of ['en', 'zh-Hant'] as const) {
        i18n.global.locale.value = locale;
        const keywords = Object.values(publicSeoKeywordKeys).map((keywordKey) =>
          String(i18n.global.t(keywordKey))
        );

        expect(keywords).toHaveLength(10);
        expect(new Set(keywords).size).toBe(keywords.length);
        expect(
          keywords.every((keyword, index) => keyword !== Object.values(publicSeoKeywordKeys)[index])
        ).toBe(true);

        for (const page of contentPages) {
          const keyword = String(i18n.global.t(publicSeoKeywordKeys[page])).toLocaleLowerCase();
          expect(String(i18n.global.t(`publicPages.${page}.title`)).toLocaleLowerCase()).toContain(
            keyword
          );
          expect(String(i18n.global.t(`publicPages.${page}.body`)).toLocaleLowerCase()).toContain(
            keyword
          );
        }

        const homeKeyword = String(i18n.global.t(publicSeoKeywordKeys.home)).toLocaleLowerCase();
        expect(String(i18n.global.t('marketing.homeTitle')).toLocaleLowerCase()).toContain(
          homeKeyword
        );
        expect(String(i18n.global.t('marketing.headline')).toLocaleLowerCase()).toContain(
          homeKeyword
        );
        expect(String(i18n.global.t('marketing.homeDescription')).toLocaleLowerCase()).toContain(
          homeKeyword
        );

        const pricingKeyword = String(
          i18n.global.t(publicSeoKeywordKeys.pricing)
        ).toLocaleLowerCase();
        expect(String(i18n.global.t('pricing.title')).toLocaleLowerCase()).toContain(
          pricingKeyword
        );
        expect(String(i18n.global.t('pricing.body')).toLocaleLowerCase()).toContain(pricingKeyword);
        expect(String(i18n.global.t('marketing.pricingDescription')).toLocaleLowerCase()).toContain(
          pricingKeyword
        );
      }

      i18n.global.locale.value = 'zh-Hant';
      expect(i18n.global.t(publicSeoKeywordKeys.home)).toBe('SEO 教學');
    } finally {
      i18n.global.locale.value = originalLocale;
    }
  });

  it('persists and applies the selected theme', () => {
    const { isDark, setTheme } = useTheme();

    setTheme('dark');
    expect(isDark.value).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(globalThis.localStorage.getItem('aieo-theme')).toBe('dark');

    setTheme('light');
    expect(isDark.value).toBe(false);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(globalThis.localStorage.getItem('aieo-theme')).toBe('light');
  });

  it('keeps the dark theme logo and article content readable', async () => {
    const appSource = await readFile(resolve('src/App.vue'), 'utf8');
    const darkLogoSource = await readFile(resolve('src/assets/rankwoven-logo-dark.svg'), 'utf8');
    const chartSource = await readFile(resolve('src/components/AnalyticsChart.vue'), 'utf8');
    const mainSource = await readFile(resolve('src/main.ts'), 'utf8');
    const styleSource = await readFile(resolve('src/styles.css'), 'utf8');

    expect(appSource).toContain('isDark.value ? rankwovenLogoDark : rankwovenLogo');
    expect(darkLogoSource).toContain('fill="#EDF3F8"');
    expect(styleSource).toContain(
      "html[data-theme='dark'] .seo-markdown {\n  color: var(--color-muted);\n}"
    );
    expect(styleSource).toContain(
      "html[data-theme='dark'] .seo-markdown blockquote {\n  background: var(--color-surface-soft);\n  color: var(--color-ink);\n}"
    );
    expect(styleSource).toContain(
      "html[data-theme='dark'] .seo-markdown code:not(pre code) {\n  background: var(--color-brand-primary-mist);\n  color: var(--color-ink);\n}"
    );
    expect(mainSource).toContain('h(ConfigProvider, { theme: antDesignTheme.value }');
    expect(mainSource).toContain('isDark.value ? darkAntDesignTheme : lightWorkspaceTheme');
    expect(chartSource).toContain(':theme="chartTheme"');
  });

  it('uses an accessible dark palette for forms, tables, and charts', async () => {
    const styleSource = await readFile(resolve('src/styles.css'), 'utf8');

    function getRelativeLuminance(hexColor: string) {
      const channels = hexColor
        .replace('#', '')
        .match(/.{2}/g)!
        .map((channel) => Number.parseInt(channel, 16) / 255)
        .map((channel) =>
          channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
        );

      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    }

    function getContrastRatio(foreground: string, background: string) {
      const foregroundLuminance = getRelativeLuminance(foreground);
      const backgroundLuminance = getRelativeLuminance(background);
      return (
        (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
        (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
      );
    }

    expect(darkAntDesignTheme.algorithm).toBeTruthy();
    expect(darkAntDesignTheme.token).toMatchObject({
      colorBgContainer: darkWorkspacePalette.surface,
      colorBgElevated: darkWorkspacePalette.elevated,
      colorText: darkWorkspacePalette.text,
      colorTextPlaceholder: darkWorkspacePalette.textTertiary,
      colorBorder: darkWorkspacePalette.border
    });
    expect(
      getContrastRatio(darkWorkspacePalette.text, darkWorkspacePalette.surface)
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      getContrastRatio(darkWorkspacePalette.textTertiary, darkWorkspacePalette.surface)
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      getContrastRatio(darkWorkspacePalette.border, darkWorkspacePalette.surface)
    ).toBeGreaterThanOrEqual(3);
    expect(
      getContrastRatio(darkWorkspacePalette.primaryText, darkWorkspacePalette.primary)
    ).toBeGreaterThanOrEqual(4.5);
    expect(styleSource).toContain(
      "html[data-theme='dark'] .app-shell .ant-tag {\n  color: var(--color-ink);\n}"
    );
    expect(styleSource).toContain(
      '.ant-card,\n.ant-card-body,\n.analytics-chart {\n  min-width: 0;\n}'
    );
  });

  it('centers and balances the localized pricing heading', async () => {
    const styleSource = await readFile(resolve('src/styles.css'), 'utf8');

    expect(styleSource).toContain(
      '.pricing-heading h1 {\n  max-width: 680px;\n  margin-inline: auto;\n  font-size: 40px;\n  font-weight: 700;\n  line-height: 1.2;\n  text-wrap: balance;\n}'
    );
    expect(styleSource).toContain('@media (min-width: 761px) and (max-width: 1080px)');
    expect(styleSource).toContain(
      '.marketing-nav {\n    order: 3;\n    justify-content: center;\n    width: 100%;\n  }'
    );
  });
});
