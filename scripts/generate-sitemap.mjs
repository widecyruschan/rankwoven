import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const articleManifestPath = path.join(repositoryRoot, 'apps/web/src/content/seo/articles.json');
const outputPath = path.join(repositoryRoot, 'apps/web/public/sitemap.xml');
const siteUrl = 'https://rankwoven.com';
const publicPaths = ['/', '/pricing', '/features', '/blog', '/docs', '/help', '/about', '/contact', '/privacy', '/terms'];

const articles = JSON.parse(await readFile(articleManifestPath, 'utf8'));
const paths = [...publicPaths, ...articles.map((article) => `/blog/${article.slug}`)];
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...paths.map((pathname) => `  <url><loc>${siteUrl}${pathname}</loc></url>`),
  '</urlset>',
  ''
].join('\n');

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, xml, 'utf8');
console.log(`Generated sitemap with ${paths.length} URLs.`);
