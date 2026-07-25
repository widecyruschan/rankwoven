<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const suggestionRows = computed(() => [
  {
    article: 'WordPress Image SEO Guide',
    type: t('suggestions.typeImageTitleMeta'),
    priority: t('suggestions.high'),
    changes: '5',
    status: t('tasks.statusWaiting')
  },
  { article: 'AI SEO Checklist for 2026', type: t('suggestions.typeContent'), priority: t('suggestions.medium'), changes: '9', status: t('suggestions.statusReady') },
  { article: 'OpenCart Product SEO Basics', type: t('suggestions.typeMedia'), priority: t('suggestions.high'), changes: '14', status: t('tasks.statusWaiting') },
  { article: 'Gemini vs DeepSeek for SEO', type: t('suggestions.typeLinks'), priority: t('suggestions.low'), changes: '6', status: t('suggestions.statusReady') }
]);

const queues = computed(() => [
  { label: t('suggestions.imageTitleMetaQueue'), value: '38' },
  { label: t('suggestions.contentQueue'), value: '64' },
  { label: t('suggestions.mediaQueue'), value: '81' }
]);
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('suggestions.title') }}</h2>
        <p>{{ t('suggestions.body') }}</p>
      </div>
      <RouterLink class="primary-button" to="/app/article-suggestions">{{ t('suggestions.openArticle') }}</RouterLink>
    </div>

    <div class="summary-grid compact-grid">
      <article v-for="item in queues" :key="item.label" class="metric-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </div>

    <section class="content-panel">
      <div class="data-table" role="table">
        <div class="data-row data-head" role="row">
          <span>{{ t('articles.article') }}</span>
          <span>{{ t('suggestions.type') }}</span>
          <span>{{ t('suggestions.priority') }}</span>
          <span>{{ t('suggestions.changes') }}</span>
          <span>{{ t('cmsAdapters.status') }}</span>
          <span>{{ t('articles.action') }}</span>
        </div>
        <div v-for="row in suggestionRows" :key="row.article" class="data-row" role="row">
          <strong>{{ row.article }}</strong>
          <span>{{ row.type }}</span>
          <span class="tag-pill">{{ row.priority }}</span>
          <span>{{ row.changes }}</span>
          <span class="status-pill">{{ row.status }}</span>
          <RouterLink class="text-button" to="/app/article-suggestions">{{ t('suggestions.review') }}</RouterLink>
        </div>
      </div>
    </section>
  </section>
</template>
