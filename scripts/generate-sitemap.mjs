import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const articleManifestPath = path.join(repositoryRoot, 'apps/web/src/content/seo/articles.json');
const routeRegistryPath = path.join(repositoryRoot, 'apps/web/src/constants/routeRegistry.json');
const outputDirectory = path.join(repositoryRoot, 'apps/web/public');
const siteUrl = 'https://rankwoven.com';

const [articles, routeRegistry] = await Promise.all([
  readFile(articleManifestPath, 'utf8').then(JSON.parse),
  readFile(routeRegistryPath, 'utf8').then(JSON.parse)
]);

function escapeXml(value) {
  return value.replace(
    /[<>&'\"]/g,
    (character) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;'
      })[character]
  );
}

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
const staticPaths = activePublicRoutes
  .filter((route) => route.dynamic !== true && route.canonicalPath)
  .map((route) => ({ group: route.sitemapGroup ?? 'pages', path: route.canonicalPath }));
const registeredPublicSeoKeys = new Set(
  activePublicRoutes
    .filter((route) => route.dynamic !== true)
    .map((route) => route.publicSeoKey)
    .filter(Boolean)
);
const publicSeoPages = JSON.parse(
  await readFile(path.join(repositoryRoot, 'apps/web/src/constants/publicSeo.json'), 'utf8')
);
const missingSeoRoutes = activePublicRoutes
  .filter(
    (route) => route.dynamic !== true && route.publicSeoKey && !publicSeoPages[route.publicSeoKey]
  )
  .map((route) => route.id);
if (missingSeoRoutes.length > 0) {
  throw new Error(`Sitemap routes missing public SEO metadata: ${missingSeoRoutes.join(', ')}`);
}
const unregisteredSeoKeys = Object.keys(publicSeoPages).filter(
  (key) => !registeredPublicSeoKeys.has(key)
);
if (unregisteredSeoKeys.length > 0) {
  throw new Error(
    `Sitemap SEO metadata missing from route registry: ${unregisteredSeoKeys.join(', ')}`
  );
}

const groupedPaths = new Map();
for (const item of staticPaths) {
  const entries = groupedPaths.get(item.group) ?? [];
  entries.push(item.path);
  groupedPaths.set(item.group, entries);
}
const blogPaths = groupedPaths.get('blog') ?? [];
for (const article of articles) {
  blogPaths.push(`/blog/${article.slug}`);
}
groupedPaths.set('blog', blogPaths);

const groupFiles = {
  pages: 'sitemap-pages.xml',
  tools: 'sitemap-tools.xml',
  blog: 'sitemap-blog.xml'
};
const generatedGroups = [];
for (const [group, paths] of groupedPaths) {
  const uniquePaths = [...new Set(paths)];
  if (uniquePaths.length === 0) continue;
  const fileName = groupFiles[group] ?? `sitemap-${group}.xml`;
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...uniquePaths.map(
      (pathname) => `  <url><loc>${escapeXml(`${siteUrl}${pathname}`)}</loc></url>`
    ),
    '</urlset>',
    ''
  ].join('\n');
  await writeFile(path.join(outputDirectory, fileName), xml, 'utf8');
  generatedGroups.push(fileName);
}

if (generatedGroups.length === 0) {
  throw new Error('No indexable public routes found for sitemap generation.');
}

const indexXml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...generatedGroups.map(
    (fileName) => `  <sitemap><loc>${escapeXml(`${siteUrl}/${fileName}`)}</loc></sitemap>`
  ),
  '</sitemapindex>',
  ''
].join('\n');

await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, 'sitemap.xml'), indexXml, 'utf8');
console.log(
  `Generated sitemap index with ${generatedGroups.length} groups and ${staticPaths.length + articles.length} URLs.`
);
