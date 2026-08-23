<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

type PublicPageKey = 'features' | 'blog' | 'docs' | 'help' | 'about' | 'contact' | 'privacy' | 'terms';
type ContentItem = { title: string; body: string };
type FaqItem = { question: string; answer: string };

const route = useRoute();
const { t, tm } = useI18n();
const isSubmitted = ref(false);

const pageTitles: Record<PublicPageKey, string> = {
  features: 'publicPages.features.title',
  blog: 'publicPages.blog.title',
  docs: 'publicPages.docs.title',
  help: 'publicPages.help.title',
  about: 'publicPages.about.title',
  contact: 'publicPages.contact.title',
  privacy: 'publicPages.privacy.title',
  terms: 'publicPages.terms.title'
};

const pageKey = computed<PublicPageKey>(() => {
  const value = route.meta.publicPageKey;
  return typeof value === 'string' && value in pageTitles ? (value as PublicPageKey) : 'features';
});

const pageTitle = computed(() => t(pageTitles[pageKey.value]));
const pageEyebrow = computed(() => t(`publicPages.${pageKey.value}.eyebrow`));
const pageBody = computed(() => t(`publicPages.${pageKey.value}.body`));
const featureItems = computed(() => tm('publicPages.features.items') as unknown as ContentItem[]);
const docNavigation = computed(() => tm('publicPages.docs.navigation') as unknown as string[]);
const docSteps = computed(() => tm('publicPages.docs.steps') as unknown as ContentItem[]);
const faqItems = computed(() => tm('publicPages.help.faqs') as unknown as FaqItem[]);
const valueItems = computed(() => tm('publicPages.about.values') as unknown as ContentItem[]);
const legalSections = computed(() => tm(`publicPages.${pageKey.value}.sections`) as unknown as ContentItem[]);

function submitContact() {
  isSubmitted.value = true;
}
</script>

<template>
  <main class="public-content-page">
    <section class="public-content-hero">
      <p class="eyebrow">{{ pageEyebrow }}</p>
      <h1>{{ pageTitle }}</h1>
      <p class="public-content-lead">{{ pageBody }}</p>
    </section>

    <section v-if="pageKey === 'features'" class="public-content-section">
      <div class="public-feature-layout">
        <div class="public-screenshot-placeholder" role="img" :aria-label="t('publicPages.features.screenshotLabel')">
          <span>{{ t('publicPages.features.screenshotLabel') }}</span>
          <strong>SEO 86</strong>
          <div class="public-placeholder-bars" aria-hidden="true"><i /><i /><i /><i /></div>
        </div>
        <div class="public-feature-grid">
          <article v-for="item in featureItems" :key="item.title" class="public-item-card">
            <h2>{{ item.title }}</h2>
            <p>{{ item.body }}</p>
          </article>
        </div>
      </div>
      <RouterLink class="primary-button" to="/login">{{ t('publicPages.features.cta') }}</RouterLink>
    </section>

    <section v-else-if="pageKey === 'docs'" class="public-content-section public-docs-layout">
      <aside class="public-docs-nav" :aria-label="t('publicPages.docs.eyebrow')">
        <a v-for="item in docNavigation" :key="item" href="#docs-content">{{ item }}</a>
      </aside>
      <div id="docs-content" class="public-docs-body">
        <article v-for="(step, index) in docSteps" :key="step.title" class="public-doc-step">
          <span class="public-step-number">{{ index + 1 }}</span>
          <div><h2>{{ step.title }}</h2><p>{{ step.body }}</p></div>
        </article>
        <div class="public-code-block"><span>{{ t('publicPages.docs.codeLabel') }}</span><pre><code>{{ t('publicPages.docs.code') }}</code></pre></div>
        <RouterLink class="primary-button" to="/pricing">{{ t('publicPages.docs.cta') }}</RouterLink>
      </div>
    </section>

    <section v-else-if="pageKey === 'help'" class="public-content-section public-help-layout">
      <div class="public-faq-list">
        <details v-for="(faq, index) in faqItems" :key="faq.question" :open="index === 0">
          <summary>{{ faq.question }}</summary>
          <p>{{ faq.answer }}</p>
        </details>
      </div>
      <RouterLink class="secondary-button" to="/contact">{{ t('publicPages.help.contactCta') }}</RouterLink>
    </section>

    <section v-else-if="pageKey === 'about'" class="public-content-section">
      <div class="public-mission-band"><h2>{{ t('publicPages.about.missionTitle') }}</h2><p>{{ t('publicPages.about.missionBody') }}</p></div>
      <h2 class="public-section-title">{{ t('publicPages.about.valuesTitle') }}</h2>
      <div class="public-blog-grid">
        <article v-for="item in valueItems" :key="item.title" class="public-item-card"><h2>{{ item.title }}</h2><p>{{ item.body }}</p></article>
      </div>
      <RouterLink class="primary-button" to="/features">{{ t('publicPages.about.cta') }}</RouterLink>
    </section>

    <section v-else-if="pageKey === 'contact'" class="public-content-section public-contact-layout">
      <form class="public-contact-form" @submit.prevent="submitContact">
        <label><span>{{ t('publicPages.contact.name') }}</span><input required name="name" autocomplete="name"></label>
        <label><span>{{ t('publicPages.contact.email') }}</span><input required type="email" name="email" autocomplete="email"></label>
        <label><span>{{ t('publicPages.contact.message') }}</span><textarea required name="message" rows="6" /></label>
        <button class="primary-button" type="submit">{{ t('publicPages.contact.submit') }}</button>
        <p v-if="isSubmitted" class="public-form-success" role="status">{{ t('publicPages.contact.submitted') }}</p>
      </form>
      <p class="public-note">{{ t('publicPages.contact.supportNote') }}</p>
    </section>

    <section v-else class="public-content-section public-legal-content">
      <article v-for="section in legalSections" :key="section.title" class="public-legal-section"><h2>{{ section.title }}</h2><p>{{ section.body }}</p></article>
    </section>
  </main>
</template>
