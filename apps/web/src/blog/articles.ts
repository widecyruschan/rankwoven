import DOMPurify from 'dompurify';
import { marked } from 'marked';
import articleManifest from '../content/seo/articles.json';

export const blogCategoryIds = [
  'fundamentals',
  'search-engines',
  'algorithms',
  'on-page',
  'technical',
  'content',
  'off-page',
  'local',
  'advanced',
  'ai-search',
  'analytics',
  'risk',
  'management',
  'operations',
  'specialized',
  'faq'
] as const;

export type BlogCategoryId = (typeof blogCategoryIds)[number];

export interface BlogArticleSummary {
  chapter: number;
  slug: string;
  title: string;
  excerpt: string;
  categoryId: BlogCategoryId;
  readingMinutes: number;
  contentFile: string;
  coverImage: string;
  seoTitle: string;
  metaDescription: string;
  longTailKeyword: string;
  focusKeyphrase: string;
}

export interface BlogTableOfContentsItem {
  id: string;
  title: string;
  depth: 2 | 3;
}

export interface BlogArticle extends BlogArticleSummary {
  html: string;
  tableOfContents: BlogTableOfContentsItem[];
}

const contentModules = import.meta.glob<string>('../content/seo/*.md', {
  query: '?raw',
  import: 'default'
});

export const blogArticles = (articleManifest as BlogArticleSummary[]).slice().sort((left, right) => left.chapter - right.chapter);

function createHeadingId(title: string, index: number) {
  const normalized = title
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || `section-${index + 1}`;
}

function renderMarkdown(markdown: string) {
  const rawHtml = marked.parse(markdown, { gfm: true, breaks: false }) as string;
  const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel']
  });
  const documentFragment = new DOMParser().parseFromString(`<article>${sanitizedHtml}</article>`, 'text/html');
  const articleElement = documentFragment.querySelector('article');
  const tableOfContents: BlogTableOfContentsItem[] = [];
  const usedHeadingIds = new Set<string>();

  articleElement?.querySelectorAll('h2, h3').forEach((heading, index) => {
    const title = heading.textContent?.trim() ?? '';
    const baseId = createHeadingId(title, index);
    let headingId = baseId;
    let duplicateIndex = 2;

    while (usedHeadingIds.has(headingId)) {
      headingId = `${baseId}-${duplicateIndex}`;
      duplicateIndex += 1;
    }

    usedHeadingIds.add(headingId);
    heading.id = headingId;
    tableOfContents.push({
      id: headingId,
      title,
      depth: heading.tagName === 'H2' ? 2 : 3
    });
  });

  articleElement?.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href') ?? '';
    if (/^https?:\/\//.test(href)) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return {
    html: articleElement?.innerHTML ?? '',
    tableOfContents
  };
}

export function getBlogArticleSummary(slug: string) {
  return blogArticles.find((article) => article.slug === slug) ?? null;
}

export function getAdjacentBlogArticles(chapter: number) {
  const articleIndex = blogArticles.findIndex((article) => article.chapter === chapter);
  return {
    previous: articleIndex > 0 ? blogArticles[articleIndex - 1] : null,
    next: articleIndex >= 0 && articleIndex < blogArticles.length - 1 ? blogArticles[articleIndex + 1] : null
  };
}

export function getBlogArticleSeoDescription(article: BlogArticle) {
  const contentDocument = new DOMParser().parseFromString(article.html, 'text/html');
  contentDocument.querySelectorAll('script, style, pre, code').forEach((element) => element.remove());
  const excerpt = article.excerpt.replace(/\s+/g, ' ').trim();
  const contentText = (contentDocument.body.textContent ?? '').replace(/\s+/g, ' ').trim();
  const sourceText = contentText.startsWith(excerpt) ? contentText : `${excerpt} ${contentText}`.trim();
  const characters = [...sourceText];
  if (characters.length <= 156) return sourceText;

  const candidate = characters.slice(0, 155).join('');
  const naturalEnding = Math.max(candidate.lastIndexOf('。'), candidate.lastIndexOf('！'), candidate.lastIndexOf('？'));
  return `${(naturalEnding >= 119 ? candidate.slice(0, naturalEnding + 1) : candidate).trim()}…`;
}

export async function loadBlogArticle(slug: string): Promise<BlogArticle | null> {
  const summary = getBlogArticleSummary(slug);
  if (!summary) return null;

  const contentPath = `../content/seo/${summary.contentFile}`;
  const loadContent = contentModules[contentPath];
  if (!loadContent) throw new Error(`Missing blog content module: ${contentPath}`);

  const markdown = await loadContent();
  const rendered = renderMarkdown(markdown);
  return { ...summary, ...rendered };
}
