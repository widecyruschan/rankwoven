<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const filters = computed(() => [t('articles.filterAll'), t('articles.filterNeedsReview'), t('articles.filterQuickWins')]);

const articles = computed(() => [
  {
    title: 'AI SEO Checklist for 2026',
    score: '82',
    issues: [t('articles.issueMeta'), t('articles.issueLinks')],
    opportunity: '+18%',
    owner: 'Cyrus'
  },
  {
    title: 'WordPress Image SEO Guide',
    score: '64',
    issues: [t('articles.issueImages'), t('articles.issueFreshness')],
    opportunity: '+31%',
    owner: 'Mia'
  },
  {
    title: 'OpenCart Product SEO Basics',
    score: '71',
    issues: [t('articles.issueLinks')],
    opportunity: '+12%',
    owner: 'Ken'
  }
]);
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('articles.title') }}</h2>
        <p>{{ t('articles.body') }}</p>
      </div>
      <div class="segmented-control">
        <button v-for="filter in filters" :key="filter" type="button">{{ filter }}</button>
      </div>
    </div>

    <section class="content-panel">
      <div class="data-table" role="table">
        <div class="data-row data-head" role="row">
          <span>{{ t('articles.article') }}</span>
          <span>{{ t('articles.score') }}</span>
          <span>{{ t('articles.issues') }}</span>
          <span>{{ t('articles.opportunity') }}</span>
          <span>{{ t('articles.owner') }}</span>
          <span>{{ t('articles.action') }}</span>
        </div>
        <div v-for="article in articles" :key="article.title" class="data-row" role="row">
          <strong>{{ article.title }}</strong>
          <span class="score-badge">{{ article.score }}</span>
          <span class="tag-group">
            <span v-for="issue in article.issues" :key="issue" class="tag-pill">{{ issue }}</span>
          </span>
          <span>{{ article.opportunity }}</span>
          <span>{{ article.owner }}</span>
          <button class="text-button" type="button">{{ t('articles.action') }}</button>
        </div>
      </div>
    </section>
  </section>
</template>
