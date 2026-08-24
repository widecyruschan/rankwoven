import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDirectory = path.join(webRoot, 'dist');
const publicSeoPath = path.join(webRoot, 'src/constants/publicSeo.json');
const articleManifestPath = path.join(webRoot, 'src/content/seo/articles.json');
const siteUrl = 'https://rankwoven.com';

const [template, publicSeoPages, articles] = await Promise.all([
  readFile(path.join(distDirectory, 'index.html'), 'utf8'),
  readFile(publicSeoPath, 'utf8').then(JSON.parse),
  readFile(articleManifestPath, 'utf8').then(JSON.parse)
]);

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

function renderSeoPage(seo) {
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

  if (seo.imageUrl) {
    setMeta(document, 'property', 'og:image', seo.imageUrl);
    setMeta(document, 'name', 'twitter:image', seo.imageUrl);
    setMeta(document, 'name', 'twitter:card', 'summary_large_image');
  }

  if (seo.schema) {
    const schemaElement = document.createElement('script');
    schemaElement.id = 'rankwoven-route-schema';
    schemaElement.type = 'application/ld+json';
    schemaElement.textContent = JSON.stringify(seo.schema);
    document.head.appendChild(schemaElement);
  }

  return dom.serialize();
}

async function writeSeoPage(seo) {
  const relativePath = seo.path === '/' ? '' : seo.path.replace(/^\//, '');
  const outputDirectory = path.join(distDirectory, relativePath);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, 'index.html'), renderSeoPage(seo), 'utf8');
}

for (const page of Object.values(publicSeoPages)) {
  await writeSeoPage({ path: page.path, ...page.seo });
}

for (const article of articles) {
  if (!/^[a-z0-9-]+$/.test(article.slug)) {
    throw new Error(`Invalid blog article slug: ${article.slug}`);
  }

  const articlePath = `/blog/${article.slug}`;
  const imageUrl = new globalThis.URL(article.coverImage, siteUrl).toString();
  await writeSeoPage({
    path: articlePath,
    title: article.title,
    description: article.excerpt,
    keyword: article.title,
    type: 'article',
    imageUrl,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: article.title,
      description: article.excerpt,
      keywords: article.title,
      image: imageUrl,
      inLanguage: 'zh-Hant',
      isPartOf: { '@type': 'Blog', name: 'RankWoven SEO 學習中心', url: `${siteUrl}/blog` },
      publisher: { '@type': 'Organization', name: 'RankWoven', url: siteUrl }
    }
  });
}

globalThis.console.log(`Generated SEO fallback HTML for ${Object.keys(publicSeoPages).length + articles.length} public URLs.`);
