import type { SeoAuditIssue } from '../api/siteConnections';

export type SeoAuditPriority = 'P1' | 'P2' | 'P3';
export type SeoAuditEffort = 'low' | 'medium' | 'high';
export interface SeoAuditScope {
  pages: number;
  articles: number;
  media: number;
}
type SeoAuditPopulation = number | ((issue: SeoAuditIssue) => number);

const severityImpact: Record<SeoAuditIssue['severity'], number> = {
  high: 60,
  medium: 35,
  low: 15
};

const priorityRank: Record<SeoAuditPriority, number> = {
  P1: 0,
  P2: 1,
  P3: 2
};

function getAffectedPageCount(issue: SeoAuditIssue) {
  return Math.max(0, issue.affectedPages ?? 1);
}

export function getSeoAuditScope(
  metadata: Record<string, unknown> | undefined,
  crawledPages: number | undefined,
  syncedArticleCount: number,
  syncedMediaCount: number
): SeoAuditScope {
  const articles = typeof metadata?.articleCount === 'number' ? metadata.articleCount : syncedArticleCount;
  const media = typeof metadata?.mediaCount === 'number' ? metadata.mediaCount : syncedMediaCount;
  return {
    pages: crawledPages ?? Math.max(1, articles),
    articles,
    media
  };
}

export function getSeoAuditPopulation(issue: SeoAuditIssue, scope: SeoAuditScope) {
  if (issue.source === 'ahrefs') return Math.max(1, scope.pages);
  return Math.max(1, issue.targetType === 'media' ? scope.media : scope.articles);
}

function resolvePopulation(issue: SeoAuditIssue, population: SeoAuditPopulation) {
  return typeof population === 'function' ? population(issue) : population;
}

function getReach(issue: SeoAuditIssue, population: SeoAuditPopulation) {
  const pageCount = resolvePopulation(issue, population);
  return Math.min(1, getAffectedPageCount(issue) / Math.max(1, pageCount));
}

export function getSeoAuditImpact(issue: SeoAuditIssue, population: SeoAuditPopulation) {
  if (getAffectedPageCount(issue) === 0) return 0;

  const reach = getReach(issue, population);
  const changeBoost = Math.min(20, Math.max(0, issue.change ?? 0) / 5);
  const impact = severityImpact[issue.severity] * (0.6 + 0.4 * reach) + changeBoost;
  return Math.min(100, Math.round(impact));
}

export function getSeoAuditPriority(issue: SeoAuditIssue, population: SeoAuditPopulation): SeoAuditPriority {
  if (getAffectedPageCount(issue) === 0) return 'P3';

  const providerSeverity = issue.metadata?.providerSeverity;
  const reach = getReach(issue, population);

  if (providerSeverity === 'error' || (issue.severity === 'high' && reach >= 0.25)) {
    return 'P1';
  }
  if (issue.severity === 'high' || (issue.severity === 'medium' && reach >= 0.15)) {
    return 'P2';
  }
  return 'P3';
}

export function getSeoAuditEffort(issue: SeoAuditIssue): SeoAuditEffort {
  const metadataEffort = issue.metadata?.effort;
  if (metadataEffort === 'low' || metadataEffort === 'medium' || metadataEffort === 'high') {
    return metadataEffort;
  }

  const ruleCode = issue.ruleCode.toUpperCase();
  if (ruleCode.includes('REDIRECT') || ruleCode.includes('INDEX') || ruleCode.includes('JAVASCRIPT') || ruleCode.includes('CSS')) {
    return 'high';
  }
  if (ruleCode.includes('LINK') || ruleCode.includes('CONTENT')) {
    return 'medium';
  }
  return 'low';
}

export function getSeoAuditHealthScore(issues: SeoAuditIssue[], population: SeoAuditPopulation) {
  if (issues.length === 0) return 100;

  const impacts = issues.map((issue) => getSeoAuditImpact(issue, population));
  const highestImpact = Math.max(...impacts);
  const remainingImpact = impacts.reduce((total, impact) => total + impact, 0) - highestImpact;
  const penalty = Math.min(100, highestImpact + remainingImpact * 0.25);
  return Math.max(0, Math.round(100 - penalty));
}

export function sortSeoAuditIssues(issues: SeoAuditIssue[], population: SeoAuditPopulation) {
  return [...issues].sort((left, right) => {
    const leftPriority = getSeoAuditPriority(left, population);
    const rightPriority = getSeoAuditPriority(right, population);
    if (priorityRank[leftPriority] !== priorityRank[rightPriority]) {
      return priorityRank[leftPriority] - priorityRank[rightPriority];
    }

    const impactDifference = getSeoAuditImpact(right, population) - getSeoAuditImpact(left, population);
    if (impactDifference !== 0) return impactDifference;

    return getAffectedPageCount(right) - getAffectedPageCount(left);
  });
}
