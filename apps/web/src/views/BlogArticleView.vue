<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ArrowLeft, ArrowRight, Clock3, List } from 'lucide-vue-next';
import { getAdjacentBlogArticles, loadBlogArticle, type BlogArticle } from '../blog/articles';
import { updateSeoHead } from '../utils/seoHead';

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const article = ref<BlogArticle | null>(null);
const contentElement = ref<HTMLElement | null>(null);
const isLoading = ref(true);
const loadFailed = ref(false);
let schemaElement: HTMLScriptElement | null = null;

const adjacentArticles = computed(() => (article.value ? getAdjacentBlogArticles(article.value.chapter) : { previous: null, next: null }));

function updateArticleSeo(currentArticle: BlogArticle) {
  const canonicalUrl = new window.URL(`/blog/${currentArticle.slug}`, window.location.origin).toString();
  updateSeoHead({
    title: `${currentArticle.title} | RankWoven`,
    description: currentArticle.excerpt,
    canonicalUrl,
    indexable: true,
    keywords: [currentArticle.title],
    type: 'article',
    imageUrl: new window.URL(currentArticle.coverImage, window.location.origin).toString(),
    // Article content is authored in Traditional Chinese; keep social metadata aligned
    // instead of claiming an untranslated English article.
    locale: 'zh_Hant'
  });
}

function updateStructuredData(currentArticle: BlogArticle) {
  schemaElement?.remove();
  schemaElement = document.createElement('script');
  schemaElement.type = 'application/ld+json';
  schemaElement.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: currentArticle.title,
    description: currentArticle.excerpt,
    keywords: currentArticle.title,
    image: new window.URL(currentArticle.coverImage, window.location.origin).toString(),
    articleSection: t(`publicPages.blog.categories.${currentArticle.categoryId}`),
    inLanguage: 'zh-Hant',
    isPartOf: { '@type': 'Blog', name: 'RankWoven SEO 學習中心', url: `${window.location.origin}/blog` },
    publisher: { '@type': 'Organization', name: 'RankWoven', url: window.location.origin }
  });
  document.head.appendChild(schemaElement);
}

async function renderArticleContent() {
  await nextTick();
  if (contentElement.value) {
    contentElement.value.innerHTML = article.value?.html ?? '';
  }
}

async function loadCurrentArticle() {
  isLoading.value = true;
  loadFailed.value = false;
  article.value = null;
  schemaElement?.remove();
  schemaElement = null;

  try {
    article.value = await loadBlogArticle(String(route.params.slug ?? ''));

    if (article.value) {
      updateArticleSeo(article.value);
      updateStructuredData(article.value);
    } else {
      updateSeoHead({
        title: `${t('publicPages.blog.notFoundTitle')} | RankWoven`,
        description: t('publicPages.blog.notFoundBody'),
        canonicalUrl: new window.URL('/blog', window.location.origin).toString(),
        indexable: false,
        locale: String(locale.value).replace('-', '_')
      });
    }
  } catch (error) {
    console.error(error);
    loadFailed.value = true;
    updateSeoHead({
      title: `${t('publicPages.blog.notFoundTitle')} | RankWoven`,
      description: t('publicPages.blog.notFoundBody'),
      canonicalUrl: new window.URL('/blog', window.location.origin).toString(),
      indexable: false,
      locale: String(locale.value).replace('-', '_')
    });
  } finally {
    isLoading.value = false;
    if (article.value && !loadFailed.value) {
      await renderArticleContent();
    }
  }
}

function navigateArticleContent(event: MouseEvent) {
  const link = (event.target as Element | null)?.closest('a[href]');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const href = link.getAttribute('href') ?? '';
  if (href.startsWith('/blog')) {
    event.preventDefault();
    void router.push(href);
  }
}

watch(() => route.params.slug, loadCurrentArticle, { immediate: true });
watch(locale, () => {
  if (article.value) {
    updateArticleSeo(article.value);
    updateStructuredData(article.value);
  }
});

onBeforeUnmount(() => {
  schemaElement?.remove();
});
</script>

<template>
  <main class="blog-article-page">
    <div v-if="isLoading" class="blog-article-state" role="status">{{ t('publicPages.blog.loading') }}</div>

    <section v-else-if="loadFailed || !article" class="blog-article-state">
      <h1>{{ t('publicPages.blog.notFoundTitle') }}</h1>
      <p>{{ t('publicPages.blog.notFoundBody') }}</p>
      <RouterLink class="primary-button" to="/blog">{{ t('publicPages.blog.browseArticles') }}</RouterLink>
    </section>

    <template v-else>
      <nav class="blog-breadcrumb" :aria-label="t('publicPages.blog.breadcrumbLabel')">
        <RouterLink to="/blog"><ArrowLeft :size="16" aria-hidden="true" />{{ t('publicPages.blog.backToBlog') }}</RouterLink>
      </nav>

      <article>
        <header class="blog-article-header">
          <div class="blog-article-header-copy">
            <div class="blog-card-meta">
              <span>{{ t(`publicPages.blog.categories.${article.categoryId}`) }}</span>
              <span>{{ t('publicPages.blog.chapter', { chapter: article.chapter }) }}</span>
              <span><Clock3 :size="15" aria-hidden="true" />{{ t('publicPages.blog.readingMinutes', { minutes: article.readingMinutes }) }}</span>
            </div>
            <h1>{{ article.title }}</h1>
            <p>{{ article.excerpt }}</p>
          </div>
          <img :src="article.coverImage" :alt="article.title" width="1024" height="1024">
        </header>

        <div class="blog-article-layout">
          <aside class="blog-toc">
            <h2><List :size="17" aria-hidden="true" />{{ t('publicPages.blog.tableOfContents') }}</h2>
            <nav>
              <a
                v-for="item in article.tableOfContents"
                :key="item.id"
                :class="{ 'blog-toc-child': item.depth === 3 }"
                :href="`#${item.id}`"
              >{{ item.title }}</a>
            </nav>
          </aside>

          <div>
            <p class="blog-editorial-note">{{ t('publicPages.blog.editorialNote') }}</p>
            <div ref="contentElement" class="seo-markdown" @click="navigateArticleContent" />
          </div>
        </div>
      </article>

      <nav class="blog-article-navigation" :aria-label="t('publicPages.blog.articleNavigationLabel')">
        <RouterLink v-if="adjacentArticles.previous" :to="`/blog/${adjacentArticles.previous.slug}`">
          <ArrowLeft :size="18" aria-hidden="true" />
          <span><small>{{ t('publicPages.blog.previousArticle') }}</small>{{ adjacentArticles.previous.title }}</span>
        </RouterLink>
        <span v-else />
        <RouterLink v-if="adjacentArticles.next" :to="`/blog/${adjacentArticles.next.slug}`">
          <span><small>{{ t('publicPages.blog.nextArticle') }}</small>{{ adjacentArticles.next.title }}</span>
          <ArrowRight :size="18" aria-hidden="true" />
        </RouterLink>
      </nav>
    </template>
  </main>
</template>
