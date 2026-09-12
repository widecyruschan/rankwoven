<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { BookOpen, ChevronLeft, ChevronRight, Search } from 'lucide-vue-next';
import { blogArticles, blogCategoryIds, type BlogCategoryId } from '../blog/articles';
import { getRoutePath } from '../constants/routeRegistry';

const pageSize = 12;
const { t } = useI18n();
const searchQuery = ref('');
const selectedCategory = ref<'all' | BlogCategoryId>('all');
const currentPage = ref(1);

const categoryOptions = computed(() => [
  { value: 'all', label: t('publicPages.blog.allCategories'), count: blogArticles.length },
  ...blogCategoryIds.map((categoryId) => ({
    value: categoryId,
    label: t(`publicPages.blog.categories.${categoryId}`),
    count: blogArticles.filter((article) => article.categoryId === categoryId).length
  }))
]);

const filteredArticles = computed(() => {
  const normalizedQuery = searchQuery.value.trim().toLocaleLowerCase();
  return blogArticles.filter((article) => {
    const matchesCategory = selectedCategory.value === 'all' || article.categoryId === selectedCategory.value;
    const searchableText = `${article.title} ${article.excerpt}`.toLocaleLowerCase();
    return matchesCategory && (!normalizedQuery || searchableText.includes(normalizedQuery));
  });
});

const pageCount = computed(() => Math.max(1, Math.ceil(filteredArticles.value.length / pageSize)));
const paginatedArticles = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize;
  return filteredArticles.value.slice(startIndex, startIndex + pageSize);
});

watch([searchQuery, selectedCategory], () => {
  currentPage.value = 1;
});

function clearFilters() {
  searchQuery.value = '';
  selectedCategory.value = 'all';
}

function changePage(nextPage: number) {
  currentPage.value = Math.min(Math.max(nextPage, 1), pageCount.value);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>

<template>
  <main class="blog-page">
    <header class="blog-heading">
      <p class="eyebrow">{{ t('publicPages.blog.eyebrow') }}</p>
      <h1>{{ t('publicPages.blog.title') }}</h1>
      <p>{{ t('publicPages.blog.body') }}</p>
      <div class="blog-heading-meta">
        <BookOpen :size="18" aria-hidden="true" />
        <span>{{ t('publicPages.blog.articleCount', { count: blogArticles.length }) }}</span>
        <span aria-hidden="true">·</span>
        <span>{{ t('publicPages.blog.languageNote') }}</span>
      </div>
    </header>

    <section class="blog-toolbar" :aria-label="t('publicPages.blog.filtersLabel')">
      <label class="blog-search-field">
        <span>{{ t('publicPages.blog.searchLabel') }}</span>
        <span class="blog-search-control">
          <Search :size="18" aria-hidden="true" />
          <input v-model="searchQuery" type="search" :placeholder="t('publicPages.blog.searchPlaceholder')">
        </span>
      </label>
      <label class="blog-category-field">
        <span>{{ t('publicPages.blog.categoryLabel') }}</span>
        <select v-model="selectedCategory">
          <option v-for="category in categoryOptions" :key="category.value" :value="category.value">
            {{ category.label }} ({{ category.count }})
          </option>
        </select>
      </label>
    </section>

    <section v-if="paginatedArticles.length" class="blog-article-grid">
      <article v-for="article in paginatedArticles" :key="article.slug" class="blog-article-card">
        <RouterLink class="blog-card-image" :to="getRoutePath('public-blog-article', { slug: article.slug })" :aria-label="article.title">
          <img :src="article.coverImage" :alt="article.title" loading="lazy" width="1024" height="1024">
        </RouterLink>
        <div class="blog-card-content">
          <div class="blog-card-meta">
            <span>{{ t(`publicPages.blog.categories.${article.categoryId}`) }}</span>
            <span>{{ t('publicPages.blog.chapter', { chapter: article.chapter }) }}</span>
            <span>{{ t('publicPages.blog.readingMinutes', { minutes: article.readingMinutes }) }}</span>
          </div>
          <h2><RouterLink :to="getRoutePath('public-blog-article', { slug: article.slug })">{{ article.title }}</RouterLink></h2>
          <p>{{ article.excerpt }}</p>
          <RouterLink class="blog-read-link" :to="getRoutePath('public-blog-article', { slug: article.slug })">
            {{ t('publicPages.blog.readArticle') }}
            <ChevronRight :size="16" aria-hidden="true" />
          </RouterLink>
        </div>
      </article>
    </section>

    <section v-else class="blog-empty-state">
      <Search :size="28" aria-hidden="true" />
      <h2>{{ t('publicPages.blog.noResultsTitle') }}</h2>
      <p>{{ t('publicPages.blog.noResultsBody') }}</p>
      <button class="secondary-button" type="button" @click="clearFilters">{{ t('publicPages.blog.clearFilters') }}</button>
    </section>

    <nav v-if="filteredArticles.length > pageSize" class="blog-pagination" :aria-label="t('publicPages.blog.paginationLabel')">
      <button type="button" :disabled="currentPage === 1" :title="t('publicPages.blog.previousPage')" @click="changePage(currentPage - 1)">
        <ChevronLeft :size="18" aria-hidden="true" />
        <span>{{ t('publicPages.blog.previousPage') }}</span>
      </button>
      <span>{{ t('publicPages.blog.pageStatus', { current: currentPage, total: pageCount }) }}</span>
      <button type="button" :disabled="currentPage === pageCount" :title="t('publicPages.blog.nextPage')" @click="changePage(currentPage + 1)">
        <span>{{ t('publicPages.blog.nextPage') }}</span>
        <ChevronRight :size="18" aria-hidden="true" />
      </button>
    </nav>
  </main>
</template>
