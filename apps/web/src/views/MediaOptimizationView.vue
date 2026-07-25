<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const mediaRows = computed(() => [
  {
    file: 'IMG_2048.jpg',
    article: 'WordPress Image SEO Guide',
    imageTitleMeta: 'Image SEO dashboard / WordPress media optimization preview',
    alt: 'WordPress image SEO dashboard showing alt text recommendations',
    filename: 'wordpress-image-seo-alt-text-dashboard.jpg',
    status: t('media.statusReady')
  },
  {
    file: 'product-category.png',
    article: 'OpenCart Product SEO Basics',
    imageTitleMeta: 'Product category image / OpenCart SEO media asset',
    alt: 'OpenCart product category page with optimized image filenames',
    filename: 'opencart-product-category-image-seo.png',
    status: t('media.statusReview')
  },
  {
    file: 'model-routing.webp',
    article: 'Gemini vs DeepSeek for SEO',
    imageTitleMeta: 'AI provider routing chart / SEO content model comparison',
    alt: 'AI model routing comparison for SEO content optimization',
    filename: 'ai-model-routing-seo-optimization.webp',
    status: t('media.statusReady')
  }
]);
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('media.title') }}</h2>
        <p>{{ t('media.body') }}</p>
      </div>
      <button class="primary-button" type="button">{{ t('media.generate') }}</button>
    </div>

    <section class="content-panel">
      <div class="data-table" role="table">
        <div class="data-row data-head" role="row">
          <span>{{ t('media.file') }}</span>
          <span>{{ t('articles.article') }}</span>
          <span>{{ t('media.imageTitleMeta') }}</span>
          <span>{{ t('media.altText') }}</span>
          <span>{{ t('media.filename') }}</span>
          <span>{{ t('articles.action') }}</span>
        </div>
        <div v-for="row in mediaRows" :key="row.file" class="data-row" role="row">
          <strong>{{ row.file }}</strong>
          <span>{{ row.article }}</span>
          <span>{{ row.imageTitleMeta }}</span>
          <span>{{ row.alt }}</span>
          <span>{{ row.filename }}</span>
          <span class="action-row">
            <span class="status-pill">{{ row.status }}</span>
            <button class="text-button" type="button">{{ t('media.apply') }}</button>
          </span>
        </div>
      </div>
    </section>
  </section>
</template>
