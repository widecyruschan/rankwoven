<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const features = computed(() => [
  { title: t('marketing.features.auditTitle'), body: t('marketing.features.auditBody') },
  { title: t('marketing.features.contentTitle'), body: t('marketing.features.contentBody') },
  { title: t('marketing.features.imageTitle'), body: t('marketing.features.imageBody') },
  { title: t('marketing.features.linksTitle'), body: t('marketing.features.linksBody') },
  { title: t('marketing.features.cmsTitle'), body: t('marketing.features.cmsBody') },
  { title: t('marketing.features.i18nTitle'), body: t('marketing.features.i18nBody') }
]);

const workflowSteps = computed(() => [
  t('marketing.workflow.connect'),
  t('marketing.workflow.audit'),
  t('marketing.workflow.review'),
  t('marketing.workflow.publish')
]);
</script>

<template>
  <main>
    <section class="marketing-hero">
      <div class="marketing-copy">
        <p class="eyebrow">{{ t('marketing.eyebrow') }}</p>
        <h1>{{ t('marketing.headline') }}</h1>
        <p>{{ t('marketing.subheadline') }}</p>
        <div class="action-row">
          <RouterLink class="primary-button" to="/login">{{ t('marketing.primaryAction') }}</RouterLink>
          <RouterLink class="secondary-button" to="/pricing">{{ t('marketing.secondaryAction') }}</RouterLink>
        </div>
      </div>

      <aside class="product-preview" :aria-label="t('marketing.previewLabel')">
        <div class="preview-header">
          <span>{{ t('marketing.previewSite') }}</span>
          <strong>SEO 86</strong>
        </div>
        <div class="preview-score-row">
          <span>{{ t('marketing.previewAudit') }}</span>
          <span class="progress-track">
            <span class="progress-fill" style="width: 76%" />
          </span>
        </div>
        <div class="preview-table">
          <span>{{ t('articles.issueMeta') }}</span>
          <strong>+18%</strong>
          <span>{{ t('articles.issueImages') }}</span>
          <strong>24</strong>
          <span>{{ t('articles.issueLinks') }}</span>
          <strong>12</strong>
        </div>
      </aside>
    </section>

    <section class="marketing-section">
      <div class="page-heading">
        <div>
          <h2>{{ t('marketing.featuresTitle') }}</h2>
          <p>{{ t('marketing.featuresBody') }}</p>
        </div>
      </div>
      <div class="feature-grid">
        <article v-for="feature in features" :key="feature.title" class="content-panel">
          <h2>{{ feature.title }}</h2>
          <p>{{ feature.body }}</p>
        </article>
      </div>
    </section>

    <section class="marketing-section marketing-band">
      <div class="page-heading">
        <div>
          <h2>{{ t('marketing.workflowTitle') }}</h2>
          <p>{{ t('marketing.workflowBody') }}</p>
        </div>
      </div>
      <ol class="workflow-list">
        <li v-for="(step, index) in workflowSteps" :key="step">
          <strong>{{ index + 1 }}</strong>
          <span>{{ step }}</span>
        </li>
      </ol>
    </section>
  </main>
</template>
