<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const opportunities = computed(() => [
  {
    source: 'AI SEO Checklist for 2026',
    target: 'WordPress Image SEO Guide',
    anchor: 'image SEO checklist',
    reason: t('links.clusterTutorial'),
    confidence: '91%'
  },
  {
    source: 'OpenCart Product SEO Basics',
    target: 'Internal Link Strategy',
    anchor: 'product category links',
    reason: t('links.clusterCommerce'),
    confidence: '84%'
  },
  {
    source: 'Gemini vs DeepSeek for SEO',
    target: 'AI SEO Model Routing',
    anchor: 'model routing',
    reason: t('links.clusterCompare'),
    confidence: '78%'
  }
]);

const clusters = computed(() => [
  { label: t('links.clusterCommerce'), value: '34' },
  { label: t('links.clusterTutorial'), value: '58' },
  { label: t('links.clusterCompare'), value: '21' }
]);
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('links.title') }}</h2>
        <p>{{ t('links.body') }}</p>
      </div>
    </div>

    <div class="summary-grid compact-grid">
      <article v-for="cluster in clusters" :key="cluster.label" class="metric-card">
        <span>{{ cluster.label }}</span>
        <strong>{{ cluster.value }}</strong>
      </article>
    </div>

    <section class="content-panel">
      <div class="data-table" role="table">
        <div class="data-row data-head" role="row">
          <span>{{ t('links.source') }}</span>
          <span>{{ t('links.target') }}</span>
          <span>{{ t('links.anchor') }}</span>
          <span>{{ t('links.reason') }}</span>
          <span>{{ t('links.confidence') }}</span>
          <span>{{ t('links.action') }}</span>
        </div>
        <div v-for="item in opportunities" :key="item.anchor" class="data-row" role="row">
          <strong>{{ item.source }}</strong>
          <span>{{ item.target }}</span>
          <span>{{ item.anchor }}</span>
          <span>{{ item.reason }}</span>
          <span>{{ item.confidence }}</span>
          <button class="text-button" type="button">{{ t('links.action') }}</button>
        </div>
      </div>
    </section>
  </section>
</template>
