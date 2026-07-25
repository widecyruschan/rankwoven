<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const guardrails = computed(() => [t('review.riskKeyword'), t('review.riskClaim'), t('review.riskRollback')]);
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('review.title') }}</h2>
        <p>{{ t('review.body') }}</p>
      </div>
      <div class="action-row">
        <button class="secondary-button" type="button">{{ t('review.reject') }}</button>
        <button class="secondary-button" type="button">{{ t('review.save') }}</button>
        <button class="primary-button" type="button">{{ t('review.approve') }}</button>
      </div>
    </div>

    <div class="review-grid">
      <section class="content-panel">
        <div class="panel-heading">
          <h2>{{ t('review.sourceTitle') }}</h2>
          <span>SEO 64</span>
        </div>
        <dl class="field-list">
          <dt>{{ t('review.titleField') }}</dt>
          <dd>WordPress Image SEO Guide</dd>
          <dt>{{ t('review.metaField') }}</dt>
          <dd>Learn how to optimize images for WordPress SEO.</dd>
          <dt>{{ t('review.outlineField') }}</dt>
          <dd>Compression, filenames, alt text, lazy loading.</dd>
        </dl>
      </section>

      <section class="content-panel suggestion-panel">
        <div class="panel-heading">
          <h2>{{ t('review.suggestionTitle') }}</h2>
          <span>SEO 86</span>
        </div>
        <dl class="field-list">
          <dt>{{ t('review.titleField') }}</dt>
          <dd>WordPress Image SEO Guide: Alt Text, Speed, and Rankings</dd>
          <dt>{{ t('review.metaField') }}</dt>
          <dd>Improve WordPress image SEO with better alt text, filenames, compression, and structured review.</dd>
          <dt>{{ t('review.outlineField') }}</dt>
          <dd>Audit, optimize, generate alt text, review changes, publish with rollback.</dd>
        </dl>
      </section>

      <section class="content-panel">
        <div class="panel-heading">
          <h2>{{ t('review.riskTitle') }}</h2>
        </div>
        <ul class="check-list">
          <li v-for="item in guardrails" :key="item">{{ item }}</li>
        </ul>
      </section>
    </div>
  </section>
</template>
