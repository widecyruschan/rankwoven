<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const articleChanges = computed(() => [
  {
    area: t('review.titleField'),
    current: 'WordPress Image SEO Guide',
    suggestion: 'WordPress Image SEO Guide: Alt Text, Speed, and Rankings',
    impact: '+22%'
  },
  {
    area: t('review.metaField'),
    current: 'Learn how to optimize images for WordPress SEO.',
    suggestion: 'Improve WordPress image SEO with better alt text, filenames, compression, and reviewable CMS publishing.',
    impact: '+18%'
  },
  {
    area: t('articleSuggestions.contentBlock'),
    current: 'Compression and lazy loading improve site speed.',
    suggestion: 'Add a short checklist explaining compression, responsive sizes, lazy loading, and how each change affects Core Web Vitals.',
    impact: '+14%'
  },
  {
    area: t('articleSuggestions.mediaBlock'),
    current: 'IMG_2048.jpg / no alt text',
    suggestion: 'wordpress-image-seo-alt-text-dashboard.jpg / WordPress image SEO dashboard showing alt text recommendations',
    impact: '+11%'
  },
  {
    area: t('links.title'),
    current: 'No link to internal link workflow.',
    suggestion: 'Insert anchor “image SEO checklist” linking to AI SEO Checklist for 2026.',
    impact: '+8%'
  }
]);

const reviewNotes = computed(() => [t('articleSuggestions.noteSnapshot'), t('articleSuggestions.noteDiff'), t('articleSuggestions.noteCms')]);
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('articleSuggestions.title') }}</h2>
        <p>{{ t('articleSuggestions.body') }}</p>
      </div>
      <div class="action-row">
        <button class="secondary-button" type="button">{{ t('review.save') }}</button>
        <button class="primary-button" type="button">{{ t('articleSuggestions.applyApproved') }}</button>
      </div>
    </div>

    <div class="prototype-grid">
      <section class="content-panel panel-wide">
        <div class="data-table" role="table">
          <div class="data-row data-head" role="row">
            <span>{{ t('articleSuggestions.area') }}</span>
            <span>{{ t('articleSuggestions.current') }}</span>
            <span>{{ t('articleSuggestions.suggestion') }}</span>
            <span>{{ t('articleSuggestions.impact') }}</span>
            <span>{{ t('cmsAdapters.status') }}</span>
            <span>{{ t('articles.action') }}</span>
          </div>
          <div v-for="change in articleChanges" :key="change.area" class="data-row" role="row">
            <strong>{{ change.area }}</strong>
            <span>{{ change.current }}</span>
            <span>{{ change.suggestion }}</span>
            <span>{{ change.impact }}</span>
            <span class="status-pill">{{ t('tasks.statusWaiting') }}</span>
            <button class="text-button" type="button">{{ t('articleSuggestions.approve') }}</button>
          </div>
        </div>
      </section>

      <section class="content-panel">
        <div class="panel-heading">
          <h2>{{ t('articleSuggestions.reviewTitle') }}</h2>
          <span>SEO 64 → 86</span>
        </div>
        <ul class="check-list">
          <li v-for="note in reviewNotes" :key="note">{{ note }}</li>
        </ul>
      </section>
    </div>
  </section>
</template>
