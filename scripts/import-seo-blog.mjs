import { execFile } from 'node:child_process';
import { access, mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = process.env.SEO_ARTICLE_SOURCE ?? '/Volumes/Extreme SSD/gitCode/終身學習文件/SEO';
const sourceChaptersDirectory = path.join(sourceRoot, 'chapters');
const sourceImagesDirectory = process.env.SEO_IMAGE_SOURCE ?? path.join(sourceRoot, 'generated-images');
const contentDirectory = path.join(repositoryRoot, 'apps/web/src/content/seo');
const imageDirectory = path.join(repositoryRoot, 'apps/web/public/blog/seo/images');

const articleSlugs = [
  'seo-introduction',
  'seo-business-value',
  'seo-vs-sem',
  'seo-glossary',
  'how-search-engines-work',
  'serp-guide',
  'search-intent',
  'google-algorithm-history',
  'google-core-updates',
  'eeat-guide',
  'seo-ranking-factors',
  'helpful-content',
  'keyword-research',
  'long-tail-keywords',
  'competitor-keyword-gap',
  'seo-keyword-matrix',
  'title-tag-guide',
  'meta-description-guide',
  'heading-tags',
  'seo-url-structure',
  'image-seo',
  'content-structure',
  'internal-linking',
  'schema-markup',
  'site-speed',
  'core-web-vitals',
  'mobile-first-seo',
  'xml-sitemap',
  'robots-meta-robots',
  'canonical-duplicate-content',
  'ssl-https-seo',
  'redirects-http-status',
  'javascript-seo-log-analysis',
  'technical-seo-checklist',
  'content-marketing-seo',
  'quality-seo-content',
  'seo-writing-framework',
  'content-refresh-pruning',
  'cro-and-seo',
  'ten-x-content',
  'backlinks',
  'white-hat-link-building',
  'anchor-text',
  'pagerank-link-equity',
  'toxic-links-disavow',
  'local-seo',
  'google-business-profile',
  'google-reviews',
  'nap-citations',
  'local-pack',
  'multi-location-seo',
  'local-business-schema',
  'multilingual-seo',
  'international-seo',
  'pagination-infinite-scroll',
  'crawl-budget',
  'site-migration-seo',
  'ai-search-seo',
  'aiso-principles',
  'aiso-basics',
  'geo-generative-engine-optimization',
  'aeo-answer-engine-optimization',
  'ai-citations',
  'llms-txt',
  'ai-seo-roadmap',
  'query-fan-out-entity-seo',
  'seo-kpi',
  'google-search-console',
  'ga4-seo',
  'seo-data-diagnosis',
  'white-grey-black-hat-seo',
  'google-penalties',
  'negative-seo',
  'seo-budget',
  'seo-project-roadmap',
  'seo-team',
  'seo-launch-checklist',
  'website-redesign-migration',
  'monthly-seo-maintenance',
  'seo-health-check',
  'youtube-seo',
  'ecommerce-multilingual-seo',
  'taiwan-social-seo',
  'yahoo-bing-seo',
  'seo-faq',
  'seo-myths'
];

const categoryRanges = [
  { id: 'fundamentals', start: 1, end: 4 },
  { id: 'search-engines', start: 5, end: 7 },
  { id: 'algorithms', start: 8, end: 12 },
  { id: 'on-page', start: 13, end: 24 },
  { id: 'technical', start: 25, end: 34 },
  { id: 'content', start: 35, end: 40 },
  { id: 'off-page', start: 41, end: 45 },
  { id: 'local', start: 46, end: 51 },
  { id: 'advanced', start: 52, end: 57 },
  { id: 'ai-search', start: 58, end: 66 },
  { id: 'analytics', start: 67, end: 70 },
  { id: 'risk', start: 71, end: 73 },
  { id: 'management', start: 74, end: 76 },
  { id: 'operations', start: 77, end: 80 },
  { id: 'specialized', start: 81, end: 84 },
  { id: 'faq', start: 85, end: 86 }
];

function getChapterNumber(fileName) {
  const match = fileName.match(/^(\d{2})-/);
  return match ? Number(match[1]) : null;
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return { attributes: {}, content: markdown };

  const attributes = {};
  for (const line of match[1].split(/\r?\n/)) {
    const attribute = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!attribute) continue;
    const [, key, rawValue] = attribute;
    const value = rawValue.trim();
    attributes[key] = value.startsWith('"') && value.endsWith('"')
      ? JSON.parse(value)
      : value.startsWith("'") && value.endsWith("'")
        ? value.slice(1, -1).replace(/''/g, "'")
        : value;
  }

  return { attributes, content: markdown.slice(match[0].length) };
}

function normalizeArticleText(value) {
  return value.replaceAll('在地', '本地');
}

function getCategoryId(chapterNumber) {
  return categoryRanges.find((range) => chapterNumber >= range.start && chapterNumber <= range.end)?.id ?? 'fundamentals';
}

function getTitle(markdown, chapterNumber) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading?.replace(new RegExp(`^第\\s*${chapterNumber}\\s*章[：:]?\\s*`), '') ?? `SEO 第 ${chapterNumber} 章`;
}

function getExcerpt(markdown) {
  const paragraphs = markdown
    .replace(/^#\s+.+$/m, '')
    .replace(/^!\[[^\]]*\]\([^\n]+\)$/gm, '')
    .replace(/^>\s*第.+部分.+$/gm, '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph && !paragraph.startsWith('#') && !paragraph.startsWith('---'));

  const paragraph = paragraphs.find((value) => !value.startsWith('```') && !value.startsWith('|')) ?? '';
  const plainText = paragraph
    .replace(/^>\s*/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return plainText.length > 118 ? `${plainText.slice(0, 118).trim()}…` : plainText;
}

function getReadingMinutes(markdown) {
  const chineseCharacters = (markdown.match(/[\u3400-\u9fff]/g) ?? []).length;
  const latinWords = (markdown.match(/[A-Za-z0-9]+/g) ?? []).length;
  return Math.max(4, Math.ceil(chineseCharacters / 420 + latinWords / 220));
}

function rewriteMarkdown(markdown, chapterNumber, fileToSlug) {
  const rewritten = markdown
    .replace(/^#\s+.+\r?\n/, '')
    .replace(/^!\[[^\]]*\]\((?:\.\.\/)?(?:images|generated-images)\/[^\n]+\)\s*$/gm, '')
    .replace(/\(([^)\n]+\.md)(#[^)\n]*)?\)/g, (fullMatch, targetPath, hash = '') => {
      const decodedPath = decodeURIComponent(targetPath);
      if (decodedPath.endsWith('索引.md')) return '(/blog)';

      const targetFile = path.basename(decodedPath);
      const targetSlug = fileToSlug.get(targetFile);
      return targetSlug ? `(/blog/${targetSlug}${hash})` : '(/blog)';
    })
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const previousSlug = articleSlugs[chapterNumber - 2];
  const nextSlug = articleSlugs[chapterNumber];
  const hasPreviousLink = !previousSlug || rewritten.includes(`/blog/${previousSlug}`);
  const hasNextLink = !nextSlug || rewritten.includes(`/blog/${nextSlug}`);
  const hasIndexLink = rewritten.includes('/blog)');
  if (hasPreviousLink && hasNextLink && hasIndexLink) return rewritten;

  const navigation = [
    previousSlug ? `[上一章：第 ${chapterNumber - 1} 章](/blog/${previousSlug})` : '',
    '[回索引](/blog)',
    nextSlug ? `[下一章：第 ${chapterNumber + 1} 章](/blog/${nextSlug})` : ''
  ].filter(Boolean).join(' | ');
  return `${rewritten}\n\n---\n\n${navigation}`;
}

async function clearGeneratedFiles(directory, extensions) {
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && extensions.some((extension) => entry.name.endsWith(extension)))
      .map((entry) => unlink(path.join(directory, entry.name)))
  );
}

function findSourceImage(chapterNumber, imageFileNames) {
  const matches = imageFileNames.filter((fileName) =>
    new RegExp(`^${chapterNumber}(?:\\.|\\s|-)`, 'i').test(fileName)
  );

  if (matches.length !== 1) {
    throw new Error(`Expected one generated image for chapter ${chapterNumber}, found: ${matches.join(', ') || 'none'}.`);
  }

  return path.join(sourceImagesDirectory, matches[0]);
}

await access(sourceChaptersDirectory);
await access(sourceImagesDirectory);

const chapterFiles = (await readdir(sourceChaptersDirectory))
  .filter((fileName) => /^\d{2}-.+\.md$/.test(fileName))
  .sort((left, right) => Number(left.slice(0, 2)) - Number(right.slice(0, 2)));

if (chapterFiles.length !== articleSlugs.length) {
  throw new Error(`Expected ${articleSlugs.length} chapters, found ${chapterFiles.length}.`);
}

const imageFileNames = (await readdir(sourceImagesDirectory)).filter((fileName) =>
  /\.(png|jpe?g|webp)$/i.test(fileName)
);
for (let chapterNumber = 1; chapterNumber <= articleSlugs.length; chapterNumber += 1) {
  findSourceImage(chapterNumber, imageFileNames);
}

await clearGeneratedFiles(contentDirectory, ['.md', '.json']);
await clearGeneratedFiles(imageDirectory, ['.webp']);

const fileToSlug = new Map(
  chapterFiles.map((fileName) => {
    const chapterNumber = getChapterNumber(fileName);
    return [fileName, articleSlugs[chapterNumber - 1]];
  })
);

const articles = [];

for (const fileName of chapterFiles) {
  const chapterNumber = getChapterNumber(fileName);
  if (!chapterNumber) throw new Error(`Cannot parse chapter number from ${fileName}.`);

  const sourcePath = path.join(sourceChaptersDirectory, fileName);
  const rawMarkdown = normalizeArticleText(await readFile(sourcePath, 'utf8'));
  const { attributes, content: markdown } = parseFrontmatter(rawMarkdown);
  const slug = articleSlugs[chapterNumber - 1];
  const outputFile = `seo-chapter-${String(chapterNumber).padStart(2, '0')}.md`;
  const outputImage = `seo-chapter-${String(chapterNumber).padStart(2, '0')}.webp`;
  const sourceImage = findSourceImage(chapterNumber, imageFileNames);
  const targetImage = path.join(imageDirectory, outputImage);

  await access(sourceImage);
  await writeFile(
    path.join(contentDirectory, outputFile),
    `${rewriteMarkdown(markdown, chapterNumber, fileToSlug)}\n`,
    'utf8'
  );
  await execFileAsync('cwebp', ['-quiet', '-q', '76', '-m', '6', sourceImage, '-o', targetImage]);

  articles.push({
    chapter: chapterNumber,
    slug,
    title: getTitle(markdown, chapterNumber),
    excerpt: getExcerpt(markdown),
    categoryId: getCategoryId(chapterNumber),
    readingMinutes: getReadingMinutes(markdown),
    contentFile: outputFile,
    coverImage: `/blog/seo/images/${outputImage}`,
    seoTitle: attributes.seo_title ?? getTitle(markdown, chapterNumber),
    metaDescription: attributes.meta_description ?? getExcerpt(markdown),
    longTailKeyword: attributes.long_tail_keyword ?? '',
    focusKeyphrase: attributes.focus_keyphrase ?? ''
  });
}

await writeFile(path.join(contentDirectory, 'articles.json'), `${JSON.stringify(articles, null, 2)}\n`, 'utf8');
console.log(`Imported ${articles.length} SEO articles into ${path.relative(repositoryRoot, contentDirectory)}.`);
