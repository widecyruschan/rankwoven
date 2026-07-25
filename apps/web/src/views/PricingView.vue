<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const plans = computed(() => [
  {
    name: t('pricing.starter.name'),
    price: t('pricing.starter.price'),
    summary: t('pricing.starter.summary'),
    features: [t('pricing.features.siteOne'), t('pricing.features.articlesSmall'), t('pricing.features.review')],
    featured: false
  },
  {
    name: t('pricing.growth.name'),
    price: t('pricing.growth.price'),
    summary: t('pricing.growth.summary'),
    features: [t('pricing.features.siteFive'), t('pricing.features.articlesMedium'), t('pricing.features.images')],
    featured: true
  },
  {
    name: t('pricing.agency.name'),
    price: t('pricing.agency.price'),
    summary: t('pricing.agency.summary'),
    features: [t('pricing.features.siteTwenty'), t('pricing.features.articlesLarge'), t('pricing.features.team')],
    featured: false
  },
  {
    name: t('pricing.enterprise.name'),
    price: t('pricing.enterprise.price'),
    summary: t('pricing.enterprise.summary'),
    features: [t('pricing.features.custom'), t('pricing.features.sla'), t('pricing.features.provider')],
    featured: false
  }
]);
</script>

<template>
  <main class="marketing-section">
    <div class="page-heading pricing-heading">
      <div>
        <p class="eyebrow">{{ t('pricing.eyebrow') }}</p>
        <h1>{{ t('pricing.title') }}</h1>
        <p>{{ t('pricing.body') }}</p>
      </div>
    </div>

    <section class="pricing-grid">
      <article v-for="plan in plans" :key="plan.name" class="pricing-card" :data-featured="plan.featured">
        <div>
          <span v-if="plan.featured" class="recommended-pill">{{ t('pricing.recommended') }}</span>
          <h2>{{ plan.name }}</h2>
          <strong>{{ plan.price }}</strong>
          <p>{{ plan.summary }}</p>
        </div>
        <ul class="plain-list">
          <li v-for="feature in plan.features" :key="feature">{{ feature }}</li>
        </ul>
        <RouterLink :class="plan.featured ? 'primary-button' : 'secondary-button'" to="/login">
          {{ t('pricing.action') }}
        </RouterLink>
      </article>
    </section>
  </main>
</template>
