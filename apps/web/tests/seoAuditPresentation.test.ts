import { describe, expect, it } from 'vitest';
import type { SeoAuditIssue } from '../src/api/siteConnections';
import {
  getSeoAuditEffort,
  getSeoAuditHealthScore,
  getSeoAuditImpact,
  getSeoAuditPopulation,
  getSeoAuditPriority,
  getSeoAuditScope,
  sortSeoAuditIssues
} from '../src/utils/seoAuditPresentation';

function createIssue(overrides: Partial<SeoAuditIssue> = {}): SeoAuditIssue {
  return {
    id: 'issue-1',
    auditId: 'audit-1',
    siteId: 'site-1',
    targetType: 'article',
    targetCmsId: 'article-1',
    ruleCode: 'ARTICLE_META_DESCRIPTION_LENGTH',
    severity: 'medium',
    message: 'Meta description is missing',
    fieldName: 'metaDescription',
    createdAt: '2026-10-04T00:00:00.000Z',
    ...overrides
  };
}

describe('SEO audit presentation helpers', () => {
  it('prioritizes site-wide errors as P1 and scales impact with reach', () => {
    const issue = createIssue({
      severity: 'high',
      affectedPages: 80,
      metadata: { providerSeverity: 'error' }
    });

    expect(getSeoAuditPriority(issue, 100)).toBe('P1');
    expect(getSeoAuditImpact(issue, 100)).toBeGreaterThan(50);
  });

  it('uses rule hints to estimate repair effort without changing the issue', () => {
    expect(getSeoAuditEffort(createIssue({ ruleCode: 'AHREFS_REDIRECT_CHAIN' }))).toBe('high');
    expect(getSeoAuditEffort(createIssue({ ruleCode: 'ARTICLE_INTERNAL_LINKS' }))).toBe('medium');
    expect(getSeoAuditEffort(createIssue({ metadata: { effort: 'high' } }))).toBe('high');
    expect(getSeoAuditEffort(createIssue({ ruleCode: 'ARTICLE_TITLE_LENGTH' }))).toBe('low');
  });

  it('does not reward issue reductions as new negative impact', () => {
    const improving = createIssue({ severity: 'medium', affectedPages: 10, change: -584 });
    const unchanged = createIssue({ severity: 'medium', affectedPages: 10, change: 0 });
    const worsening = createIssue({ severity: 'medium', affectedPages: 10, change: 50 });

    expect(getSeoAuditImpact(improving, 100)).toBe(getSeoAuditImpact(unchanged, 100));
    expect(getSeoAuditImpact(worsening, 100)).toBeGreaterThan(getSeoAuditImpact(unchanged, 100));
  });

  it('keeps zero-affected provider issues out of urgent work', () => {
    const resolvedIssue = createIssue({
      severity: 'high',
      affectedPages: 0,
      change: 100,
      metadata: { providerSeverity: 'error' }
    });

    expect(getSeoAuditImpact(resolvedIssue, 100)).toBe(0);
    expect(getSeoAuditPriority(resolvedIssue, 100)).toBe('P3');
  });

  it('classifies broad medium issues as P2 and keeps narrow ones at P3', () => {
    const issue = createIssue({ severity: 'medium', affectedPages: 15 });

    expect(getSeoAuditPriority(issue, 100)).toBe('P2');
    expect(getSeoAuditPriority({ ...issue, affectedPages: 14 }, 100)).toBe('P3');
    expect(getSeoAuditPriority(createIssue({ severity: 'high', affectedPages: 1 }), 100)).toBe('P2');
  });

  it('caps the worsening change boost', () => {
    const issue = createIssue({ severity: 'low', affectedPages: 1 });

    expect(getSeoAuditImpact({ ...issue, change: 100 }, 100)).toBe(
      getSeoAuditImpact({ ...issue, change: 10_000 }, 100)
    );
  });

  it('uses target-specific populations when sorting mixed audit issues', () => {
    const articleIssue = createIssue({ id: 'article', targetType: 'article', severity: 'medium', affectedPages: 20 });
    const mediaIssue = createIssue({ id: 'media', targetType: 'media', severity: 'medium', affectedPages: 10 });
    const sorted = sortSeoAuditIssues(
      [articleIssue, mediaIssue],
      (issue) => issue.targetType === 'media' ? 10 : 200
    );

    expect(sorted.map((issue) => issue.id)).toEqual(['media', 'article']);
    expect(getSeoAuditPriority(mediaIssue, (issue) => issue.targetType === 'media' ? 10 : 200)).toBe('P2');
    expect(getSeoAuditPriority(articleIssue, (issue) => issue.targetType === 'media' ? 10 : 200)).toBe('P3');
  });

  it('builds an exact scope from audit metadata and falls back for legacy audits', () => {
    expect(getSeoAuditScope({ articleCount: 320, mediaCount: 480 }, 250, 100, 100)).toEqual({
      pages: 250,
      articles: 320,
      media: 480
    });
    expect(getSeoAuditScope(undefined, undefined, 0, 4)).toEqual({
      pages: 1,
      articles: 0,
      media: 4
    });
  });

  it('selects the Ahrefs, article, or media population for each issue', () => {
    const scope = { pages: 500, articles: 320, media: 480 };

    expect(getSeoAuditPopulation(createIssue({ source: 'ahrefs' }), scope)).toBe(500);
    expect(getSeoAuditPopulation(createIssue({ targetType: 'article' }), scope)).toBe(320);
    expect(getSeoAuditPopulation(createIssue({ targetType: 'media' }), scope)).toBe(480);
    expect(getSeoAuditPopulation(createIssue({ targetType: 'media' }), { pages: 0, articles: 0, media: 0 })).toBe(1);
  });

  it('keeps a category with a high-impact issue out of the healthy range', () => {
    const highIssue = createIssue({ severity: 'high', affectedPages: 100 });
    const lowIssue = createIssue({ id: 'low', severity: 'low', affectedPages: 100 });

    expect(getSeoAuditHealthScore([highIssue], 100)).toBeLessThan(80);
    expect(getSeoAuditHealthScore([highIssue, lowIssue], 100)).toBe(36);
    expect(getSeoAuditHealthScore([highIssue, highIssue, highIssue], 100)).toBe(10);
    expect(getSeoAuditHealthScore([], 100)).toBe(100);
  });

  it('falls back to impact and affected pages inside the same priority', () => {
    const higherImpact = createIssue({ id: 'higher-impact', severity: 'low', affectedPages: 1, change: 20 });
    const widerTie = createIssue({ id: 'wider-tie', severity: 'low', affectedPages: 2 });
    const narrowTie = createIssue({ id: 'narrow-tie', severity: 'low', affectedPages: 1 });

    expect(sortSeoAuditIssues([narrowTie, higherImpact, widerTie], 10_000).map((issue) => issue.id)).toEqual([
      'higher-impact',
      'wider-tie',
      'narrow-tie'
    ]);
  });

  it('returns a new list ordered by priority and impact', () => {
    const lowIssue = createIssue({ id: 'low', severity: 'low', affectedPages: 1 });
    const highIssue = createIssue({ id: 'high', severity: 'high', affectedPages: 20 });
    const source = [lowIssue, highIssue];
    const sorted = sortSeoAuditIssues(source, 20);

    expect(sorted.map((issue) => issue.id)).toEqual(['high', 'low']);
    expect(sorted).not.toBe(source);
    expect(source.map((issue) => issue.id)).toEqual(['low', 'high']);
  });
});
