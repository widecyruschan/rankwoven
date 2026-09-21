import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { marked } from 'marked';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDirectory = path.join(webRoot, 'dist');
const publicSeoPath = path.join(webRoot, 'src/constants/publicSeo.json');
const routeRegistryPath = path.join(webRoot, 'src/constants/routeRegistry.json');
const articleManifestPath = path.join(webRoot, 'src/content/seo/articles.json');
const siteUrl = 'https://rankwoven.com';

const [template, publicSeoPages, routeRegistry, articles] = await Promise.all([
  readFile(path.join(distDirectory, 'index.html'), 'utf8'),
  readFile(publicSeoPath, 'utf8').then(JSON.parse),
  readFile(routeRegistryPath, 'utf8').then(JSON.parse),
  readFile(articleManifestPath, 'utf8').then(JSON.parse)
]);

const activePublicRoutes = routeRegistry.routes.filter(
  (route) => route.area === 'public' && route.enabled !== false && route.indexable === true
);
const publicRoutesMissingSeoKey = activePublicRoutes
  .filter((route) => route.dynamic !== true && typeof route.publicSeoKey !== 'string')
  .map((route) => route.id);
if (publicRoutesMissingSeoKey.length > 0) {
  throw new Error(
    `Indexable public routes missing publicSeoKey: ${publicRoutesMissingSeoKey.join(', ')}`
  );
}
const publicSeoRouteEntries = activePublicRoutes.filter(
  (route) => route.dynamic !== true && typeof route.publicSeoKey === 'string'
);
const publicSeoPageConfigs = publicSeoRouteEntries.map((route) => {
  const page = publicSeoPages[route.publicSeoKey];
  if (!page || page.path !== route.path) {
    throw new Error(`Public SEO route registry mismatch: ${route.id}`);
  }
  return { ...page, path: route.path };
});
const registeredSeoKeys = new Set(publicSeoRouteEntries.map((route) => route.publicSeoKey));
const unregisteredSeoPages = Object.keys(publicSeoPages).filter(
  (pageKey) => !registeredSeoKeys.has(pageKey)
);
if (unregisteredSeoPages.length > 0) {
  throw new Error(
    `Public SEO pages missing from route registry: ${unregisteredSeoPages.join(', ')}`
  );
}

const blogArticleRoute = activePublicRoutes.find((route) => route.id === 'public-blog-article');
if (!blogArticleRoute || blogArticleRoute.path !== '/blog/:slug') {
  throw new Error('Route registry must contain the enabled /blog/:slug route.');
}

function setMeta(document, attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setLink(document, rel, href) {
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function setAlternateLink(document, hreflang, href) {
  let element = document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'alternate');
    element.setAttribute('hreflang', hreflang);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function buildDefaultRouteSchema(seo, canonicalUrl) {
  const organization = {
    '@type': 'Organization',
    name: 'RankWoven',
    url: siteUrl
  };
  const website = {
    '@type': 'WebSite',
    name: 'RankWoven',
    url: siteUrl,
    publisher: organization
  };
  const webpage = {
    '@type': 'WebPage',
    name: seo.title,
    description: seo.description,
    url: canonicalUrl,
    isPartOf: website,
    publisher: organization,
    inLanguage: 'zh-Hant'
  };

  return seo.path === '/'
    ? { '@context': 'https://schema.org', '@graph': [organization, website, webpage] }
    : { '@context': 'https://schema.org', ...webpage };
}

function appendTextElement(document, parent, tagName, text, className = '') {
  const element = document.createElement(tagName);
  element.textContent = text;
  if (className) element.className = className;
  parent.appendChild(element);
  return element;
}

function appendInternalLink(document, parent, href, text) {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = text;
  parent.appendChild(link);
  return link;
}

function appendPublicNavigation(document, parent, currentPath) {
  const navigation = document.createElement('nav');
  navigation.className = 'public-static-navigation';
  navigation.setAttribute('aria-label', 'RankWoven 公開頁面導覽');
  for (const page of publicSeoPageConfigs) {
    if (page.path === currentPath) continue;
    appendInternalLink(document, navigation, page.path, page.seo.title);
  }
  parent.appendChild(navigation);
  return navigation;
}

function renderPublicPageFallback(document, page) {
  const app = document.querySelector('#app');
  if (!app) throw new Error('Missing #app mount point in SEO template.');

  const main = document.createElement('main');
  main.className = 'public-content-page seo-static-fallback';
  const hero = document.createElement('section');
  hero.className = 'public-content-hero';
  appendTextElement(document, hero, 'p', 'RankWoven AI SEO', 'eyebrow');
  appendTextElement(document, hero, 'h1', page.seo.title);
  appendTextElement(document, hero, 'p', page.seo.description, 'public-content-lead');
  main.appendChild(hero);

  const linkSection = document.createElement('section');
  linkSection.className = 'public-content-section public-static-links';
  appendTextElement(document, linkSection, 'h2', '探索 RankWoven');
  appendPublicNavigation(document, linkSection, page.path);
  main.appendChild(linkSection);
  app.replaceChildren(main);
}

function renderBlogIndexFallback(document) {
  const app = document.querySelector('#app');
  if (!app) throw new Error('Missing #app mount point in SEO template.');

  const main = document.createElement('main');
  main.className = 'blog-page seo-static-fallback';
  const header = document.createElement('header');
  header.className = 'blog-heading';
  appendTextElement(document, header, 'p', 'SEO 教學', 'eyebrow');
  appendTextElement(document, header, 'h1', 'SEO 教學與 AI 搜尋優化文章');
  appendTextElement(
    document,
    header,
    'p',
    '從 SEO 基礎、技術 SEO、內容策略到 GEO 與 AI 搜尋優化，依章節閱讀完整教學。'
  );
  main.appendChild(header);
  appendPublicNavigation(document, main, '/blog');

  const articleGrid = document.createElement('section');
  articleGrid.className = 'blog-article-grid';
  articleGrid.setAttribute('aria-label', 'SEO 教學文章');
  for (const article of articles) {
    const articleCard = document.createElement('article');
    articleCard.className = 'blog-article-card';
    const cardContent = document.createElement('div');
    cardContent.className = 'blog-card-content';
    appendTextElement(document, cardContent, 'p', `第 ${article.chapter} 章`, 'blog-card-meta');
    const heading = document.createElement('h2');
    appendInternalLink(document, heading, `/blog/${article.slug}`, article.title);
    cardContent.appendChild(heading);
    appendTextElement(document, cardContent, 'p', article.excerpt);
    const readLink = appendInternalLink(document, cardContent, `/blog/${article.slug}`, '閱讀文章');
    readLink.className = 'blog-read-link';
    articleCard.appendChild(cardContent);
    articleGrid.appendChild(articleCard);
  }
  main.appendChild(articleGrid);
  app.replaceChildren(main);
}

function sanitizeArticleHtml(document, markdown) {
  const container = document.createElement('div');
  container.innerHTML = marked.parse(markdown, { gfm: true, breaks: false });
  container
    .querySelectorAll('script, style, iframe, object, embed')
    .forEach((element) => element.remove());
  container.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href') ?? '';
    if (!/^(?:https?:\/\/|\/|#)/.test(href)) link.removeAttribute('href');
    if (/^https?:\/\//.test(href)) link.setAttribute('rel', 'noopener noreferrer');
  });
  return container.innerHTML;
}

function buildArticleDescription(article, markdown) {
  if (article.metaDescription) return article.metaDescription;
  const contentDocument = new JSDOM(marked.parse(markdown, { gfm: true, breaks: false })).window
    .document;
  contentDocument
    .querySelectorAll('script, style, pre, code')
    .forEach((element) => element.remove());
  const excerpt = article.excerpt.replace(/\s+/g, ' ').trim();
  const contentText = (contentDocument.body.textContent ?? '').replace(/\s+/g, ' ').trim();
  const sourceText = contentText.startsWith(excerpt)
    ? contentText
    : `${excerpt} ${contentText}`.trim();
  const characters = [...sourceText];
  if (characters.length <= 156) return sourceText;

  const candidate = characters.slice(0, 155).join('');
  const naturalEnding = Math.max(
    candidate.lastIndexOf('。'),
    candidate.lastIndexOf('！'),
    candidate.lastIndexOf('？')
  );
  return `${(naturalEnding >= 119 ? candidate.slice(0, naturalEnding + 1) : candidate).trim()}…`;
}

function renderBlogArticleFallback(document, article, markdown, articleIndex) {
  const app = document.querySelector('#app');
  if (!app) throw new Error('Missing #app mount point in SEO template.');

  const main = document.createElement('main');
  main.className = 'blog-article-page seo-static-fallback';
  const breadcrumb = document.createElement('nav');
  breadcrumb.className = 'blog-breadcrumb';
  breadcrumb.setAttribute('aria-label', '文章導覽');
  appendInternalLink(document, breadcrumb, '/blog', '返回 SEO 教學文章');
  main.appendChild(breadcrumb);

  const articleElement = document.createElement('article');
  const header = document.createElement('header');
  header.className = 'blog-article-header';
  const headerCopy = document.createElement('div');
  headerCopy.className = 'blog-article-header-copy';
  appendTextElement(
    document,
    headerCopy,
    'p',
    `SEO 教學第 ${article.chapter} 章`,
    'blog-card-meta'
  );
  appendTextElement(document, headerCopy, 'h1', article.title);
  appendTextElement(document, headerCopy, 'p', article.excerpt);
  header.appendChild(headerCopy);
  const image = document.createElement('img');
  image.src = article.coverImage;
  image.alt = article.title;
  image.width = 1024;
  image.height = 1024;
  header.appendChild(image);
  articleElement.appendChild(header);

  const content = document.createElement('div');
  content.className = 'seo-markdown';
  content.innerHTML = sanitizeArticleHtml(document, markdown);
  articleElement.appendChild(content);
  main.appendChild(articleElement);

  const navigation = document.createElement('nav');
  navigation.className = 'blog-article-navigation';
  navigation.setAttribute('aria-label', '相關 SEO 教學文章');
  const previous = articleIndex > 0 ? articles[articleIndex - 1] : null;
  const next = articleIndex < articles.length - 1 ? articles[articleIndex + 1] : null;
  if (previous)
    appendInternalLink(document, navigation, `/blog/${previous.slug}`, `上一篇：${previous.title}`);
  if (next) appendInternalLink(document, navigation, `/blog/${next.slug}`, `下一篇：${next.title}`);

  const relatedArticles = articles
    .filter(
      (candidate, candidateIndex) =>
        candidateIndex !== articleIndex && candidate.categoryId === article.categoryId
    )
    .slice(0, 3);
  for (const relatedArticle of relatedArticles) {
    appendInternalLink(
      document,
      navigation,
      `/blog/${relatedArticle.slug}`,
      `相關文章：${relatedArticle.title}`
    );
  }
  main.appendChild(navigation);
  appendPublicNavigation(document, main, `/blog/${article.slug}`);
  app.replaceChildren(main);
}

function renderSeoPage(seo, renderBody) {
  const dom = new JSDOM(template);
  const { document } = dom.window;
  const canonicalUrl = new globalThis.URL(seo.path, siteUrl).toString();
  const title = `${seo.title} | RankWoven`;

  document.title = title;
  setMeta(document, 'name', 'description', seo.description);
  setMeta(document, 'name', 'keywords', seo.keyword);
  setMeta(document, 'name', 'robots', 'index, follow');
  setMeta(document, 'property', 'og:title', title);
  setMeta(document, 'property', 'og:description', seo.description);
  setMeta(document, 'property', 'og:url', canonicalUrl);
  setMeta(document, 'property', 'og:type', seo.type ?? 'website');
  setMeta(document, 'name', 'twitter:title', title);
  setMeta(document, 'name', 'twitter:description', seo.description);
  setLink(document, 'canonical', canonicalUrl);
  setAlternateLink(document, 'x-default', canonicalUrl);

  if (seo.imageUrl) {
    setMeta(document, 'property', 'og:image', seo.imageUrl);
    setMeta(document, 'name', 'twitter:image', seo.imageUrl);
    setMeta(document, 'name', 'twitter:card', 'summary_large_image');
  }

  if (seo.schema || seo.indexable !== false) {
    const schemaElement = document.createElement('script');
    schemaElement.id = 'rankwoven-route-schema';
    schemaElement.type = 'application/ld+json';
    schemaElement.textContent = JSON.stringify(
      seo.schema ?? buildDefaultRouteSchema(seo, canonicalUrl)
    );
    document.head.appendChild(schemaElement);
  }

  renderBody?.(document);

  return dom.serialize();
}

async function writeSeoPage(seo, renderBody) {
  const relativePath = seo.path === '/' ? '' : seo.path.replace(/^\//, '');
  const outputDirectory = path.join(distDirectory, relativePath);
  const html = renderSeoPage(seo, renderBody);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, 'index.html'), html, 'utf8');
  return html;
}

for (const page of publicSeoPageConfigs) {
  const renderBody =
    page.path === '/blog'
      ? renderBlogIndexFallback
      : (document) => renderPublicPageFallback(document, page);
  await writeSeoPage({ path: page.path, ...page.seo }, renderBody);
}

const generatedArticlePages = new Map();
for (const [articleIndex, article] of articles.entries()) {
  if (!/^[a-z0-9-]+$/.test(article.slug)) {
    throw new Error(`Invalid blog article slug: ${article.slug}`);
  }
  if (!/^seo-chapter-\d+\.md$/.test(article.contentFile)) {
    throw new Error(`Invalid blog article content file: ${article.contentFile}`);
  }

  const articlePath = `/blog/${article.slug}`;
  const imageUrl = new globalThis.URL(article.coverImage, siteUrl).toString();
  const markdown = await readFile(
    path.join(webRoot, 'src/content/seo', article.contentFile),
    'utf8'
  );
  const description = buildArticleDescription(article, markdown);
  const html = await writeSeoPage(
    {
      path: articlePath,
      title: article.seoTitle || article.title,
      description,
      keyword: [article.focusKeyphrase, article.longTailKeyword].filter(Boolean).join(', '),
      type: 'article',
      imageUrl,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: article.title,
        description,
        keywords: [article.focusKeyphrase, article.longTailKeyword].filter(Boolean).join(', '),
        image: imageUrl,
        inLanguage: 'zh-Hant',
        author: { '@type': 'Organization', name: 'RankWoven Editorial Team', url: siteUrl },
        isPartOf: { '@type': 'Blog', name: 'RankWoven SEO 學習中心', url: `${siteUrl}/blog` },
        publisher: { '@type': 'Organization', name: 'RankWoven', url: siteUrl }
      }
    },
    (document) => renderBlogArticleFallback(document, article, markdown, articleIndex)
  );
  generatedArticlePages.set(article.slug, html);
}

const blogIndexHtml = await readFile(path.join(distDirectory, 'blog/index.html'), 'utf8');
const blogIndexDocument = new JSDOM(blogIndexHtml).window.document;
const blogIndexLinks = new Set(
  [...blogIndexDocument.querySelectorAll('a[href^="/blog/"]')].map((link) =>
    link.getAttribute('href')
  )
);
for (const article of articles) {
  if (!blogIndexLinks.has(`/blog/${article.slug}`)) {
    throw new Error(`SEO blog index does not link to article: ${article.slug}`);
  }

  const articleDocument = new JSDOM(generatedArticlePages.get(article.slug)).window.document;
  const articleLinks = [...articleDocument.querySelectorAll('a[href^="/blog"]')];
  const descriptionLength = [
    ...(articleDocument.querySelector('meta[name="description"]')?.getAttribute('content') ?? '')
  ].length;
  if (
    !articleDocument.querySelector('h1') ||
    !articleDocument.querySelector('.seo-markdown') ||
    !articleLinks.some((link) => link.getAttribute('href') === '/blog')
  ) {
    throw new Error(`SEO fallback body is incomplete for article: ${article.slug}`);
  }
  if (!articleLinks.some((link) => link.getAttribute('href') !== '/blog')) {
    throw new Error(`SEO fallback article has no outgoing article link: ${article.slug}`);
  }
  if (descriptionLength < 70 || descriptionLength > 160) {
    throw new Error(
      `SEO description length ${descriptionLength} is invalid for article: ${article.slug}`
    );
  }
}

const publicPages = publicSeoPageConfigs;
const articlePaths = articles.map((article) => `/blog/${article.slug}`);
const publicPaths = new Set([...publicPages.map((page) => page.path), ...articlePaths]);
const publicIncomingLinks = new Map([...publicPaths].map((pathValue) => [pathValue, 0]));
const publicOutgoingLinks = new Map([...publicPaths].map((pathValue) => [pathValue, []]));

function collectLocalLinks(document) {
  return [...document.querySelectorAll('a[href]')]
    .map((link) => link.getAttribute('href') ?? '')
    .filter((href) => href.startsWith('/') && !href.startsWith('//'))
    .map((href) => href.split('#')[0].split('?')[0]);
}

function addGraphEdges(sourcePath, document) {
  const outgoingPaths = [...new Set(collectLocalLinks(document))];
  publicOutgoingLinks.set(sourcePath, outgoingPaths);
  for (const targetPath of outgoingPaths) {
    if (!publicPaths.has(targetPath)) {
      throw new Error(
        `SEO route graph contains an unknown internal link: ${sourcePath} -> ${targetPath}`
      );
    }
    publicIncomingLinks.set(targetPath, publicIncomingLinks.get(targetPath) + 1);
  }
}

for (const page of publicPages) {
  const relativePath = page.path === '/' ? '' : page.path.replace(/^\//, '');
  const html = await readFile(path.join(distDirectory, relativePath, 'index.html'), 'utf8');
  const document = new JSDOM(html).window.document;
  if (
    document.querySelectorAll('h1').length !== 1 ||
    document.body.textContent.trim().length < 80
  ) {
    throw new Error(`SEO fallback body is incomplete for public page: ${page.path}`);
  }

  const outgoingPaths = collectLocalLinks(document);
  if (outgoingPaths.length === 0) {
    throw new Error(`SEO fallback public page has no outgoing internal link: ${page.path}`);
  }
  addGraphEdges(page.path, document);
}

for (const article of articles) {
  const articlePath = `/blog/${article.slug}`;
  const articleDocument = new JSDOM(generatedArticlePages.get(article.slug)).window.document;
  addGraphEdges(articlePath, articleDocument);
}

const orphanedPublicPages = [...publicIncomingLinks].filter(([, count]) => count === 0);
if (orphanedPublicPages.length > 0) {
  throw new Error(
    `SEO public pages without incoming links: ${orphanedPublicPages.map(([pathValue]) => pathValue).join(', ')}`
  );
}

await writeFile(
  path.join(distDirectory, 'seo-route-graph.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      routeRegistryVersion: routeRegistry.version,
      nodeCount: publicPaths.size,
      edgeCount: [...publicOutgoingLinks.values()].reduce(
        (total, paths) => total + paths.length,
        0
      ),
      orphanedRoutes: orphanedPublicPages.map(([pathValue]) => pathValue),
      routes: [...publicPaths].map((pathValue) => ({
        path: pathValue,
        incomingLinks: publicIncomingLinks.get(pathValue),
        outgoingLinks: publicOutgoingLinks.get(pathValue)
      }))
    },
    null,
    2
  ),
  'utf8'
);

globalThis.console.log(
  `Generated SEO fallback HTML for ${Object.keys(publicSeoPages).length + articles.length} public URLs; verified ${articles.length} blog inlinks and ${publicPages.length} public page inlinks; route graph has ${publicPaths.size} nodes and ${[...publicOutgoingLinks.values()].reduce((total, paths) => total + paths.length, 0)} edges.`
);
