<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const personaKeys = ['owner', 'agency', 'editor'] as const;

const personas = computed(() =>
  personaKeys.map((key) => ({
    key,
    label: t(`marketing.personas.${key}.label`),
    summary: t(`marketing.personas.${key}.summary`),
    painTitle: t(`marketing.personas.${key}.painTitle`),
    pains: [
      t(`marketing.personas.${key}.pains.0`),
      t(`marketing.personas.${key}.pains.1`),
      t(`marketing.personas.${key}.pains.2`)
    ],
    flowTitle: t(`marketing.personas.${key}.flowTitle`),
    flow: Array.from({ length: key === 'owner' ? 6 : key === 'agency' ? 5 : 5 }, (_, i) =>
      t(`marketing.personas.${key}.flow.${i}`)
    )
  }))
);

const signalItems = computed(() => [
  { label: t('marketing.signal.pages'), value: '1,284' },
  { label: t('marketing.signal.suggestions'), value: '42' },
  { label: t('marketing.signal.links'), value: '312' }
]);
</script>

<template>
  <main>
    <!-- Hero -->
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
        <div class="weave-map" aria-hidden="true">
          <span class="weave-node weave-node-a" />
          <span class="weave-node weave-node-b" />
          <span class="weave-node weave-node-c" />
          <span class="weave-node weave-node-d" />
          <span class="weave-line weave-line-a" />
          <span class="weave-line weave-line-b" />
          <span class="weave-line weave-line-c" />
        </div>
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
        <div class="signal-strip">
          <span v-for="item in signalItems" :key="item.label">
            <strong>{{ item.value }}</strong>
            {{ item.label }}
          </span>
        </div>
      </aside>
    </section>

    <!-- Persona section header -->
    <section class="marketing-section">
      <div class="page-heading">
        <div>
          <h2>{{ t('marketing.personaSectionTitle') }}</h2>
          <p>{{ t('marketing.personaSectionBody') }}</p>
        </div>
      </div>
    </section>

    <!-- Persona cards -->
    <section v-for="persona in personas" :key="persona.key" class="marketing-section persona-section">
      <div class="persona-card">
        <!-- Header with icon -->
        <header class="persona-header">
          <div class="persona-icon" :class="`persona-icon--${persona.key}`" aria-hidden="true">
            <svg v-if="persona.key === 'owner'" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="12" y="20" width="40" height="32" rx="4" stroke="currentColor" stroke-width="2.5" />
              <path d="M12 28h40" stroke="currentColor" stroke-width="2.5" />
              <circle cx="32" cy="14" r="8" stroke="currentColor" stroke-width="2.5" />
              <path d="M24 44h16M24 50h10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
            </svg>
            <svg v-else-if="persona.key === 'agency'" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="20" width="24" height="18" rx="3" stroke="currentColor" stroke-width="2.5" />
              <rect x="34" y="20" width="24" height="18" rx="3" stroke="currentColor" stroke-width="2.5" />
              <rect x="16" y="42" width="14" height="12" rx="3" stroke="currentColor" stroke-width="2.5" />
              <rect x="34" y="42" width="14" height="12" rx="3" stroke="currentColor" stroke-width="2.5" />
              <path d="M18 26h6M38 26h6M18 32h10M38 32h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <circle cx="32" cy="12" r="5" stroke="currentColor" stroke-width="2.5" />
            </svg>
            <svg v-else viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="10" width="48" height="44" rx="4" stroke="currentColor" stroke-width="2.5" />
              <path d="M18 22h28M18 30h22M18 38h16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
              <circle cx="48" cy="48" r="8" fill="var(--color-brand-accent)" stroke="currentColor" stroke-width="2" />
              <path d="M45 48h6M48 45v6" stroke="var(--color-surface)" stroke-width="2" stroke-linecap="round" />
            </svg>
          </div>
          <div class="persona-title-group">
            <h3 class="persona-label">{{ persona.label }}</h3>
            <p class="persona-summary">{{ persona.summary }}</p>
          </div>
        </header>

        <!-- Pain points + flow side by side -->
        <div class="persona-body">
          <!-- Pain points -->
          <div class="persona-pains">
            <h4 class="persona-subtitle">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5" />
                <path d="M10 6v5M10 13.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
              {{ persona.painTitle }}
            </h4>
            <ul class="pain-list">
              <li v-for="(pain, i) in persona.pains" :key="i">
                <span class="pain-marker" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M4 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
                    <path d="M5.5 5.5h3M5.5 8.5h2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
                  </svg>
                </span>
                <span>{{ pain }}</span>
              </li>
            </ul>
          </div>

          <!-- Flow -->
          <div class="persona-flow">
            <h4 class="persona-subtitle">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 4h5l2 3h5a2 2 0 012 2v5a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" stroke-width="1.5" />
                <path d="M7 12h6M7 15h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
              </svg>
              {{ persona.flowTitle }}
            </h4>
            <ol class="flow-list">
              <li v-for="(step, i) in persona.flow" :key="i">
                <span class="flow-number" aria-hidden="true">{{ i + 1 }}</span>
                <span>{{ step }}</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="marketing-section">
      <div class="page-heading">
        <div>
          <h2>{{ t('marketing.featuresTitle') }}</h2>
          <p>{{ t('marketing.featuresBody') }}</p>
        </div>
      </div>
      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-icon feature-icon--audit" aria-hidden="true" />
          <h3>{{ t('marketing.features.auditTitle') }}</h3>
          <p>{{ t('marketing.features.auditBody') }}</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon feature-icon--content" aria-hidden="true" />
          <h3>{{ t('marketing.features.contentTitle') }}</h3>
          <p>{{ t('marketing.features.contentBody') }}</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon feature-icon--image" aria-hidden="true" />
          <h3>{{ t('marketing.features.imageTitle') }}</h3>
          <p>{{ t('marketing.features.imageBody') }}</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon feature-icon--links" aria-hidden="true" />
          <h3>{{ t('marketing.features.linksTitle') }}</h3>
          <p>{{ t('marketing.features.linksBody') }}</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon feature-icon--cms" aria-hidden="true" />
          <h3>{{ t('marketing.features.cmsTitle') }}</h3>
          <p>{{ t('marketing.features.cmsBody') }}</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon feature-icon--i18n" aria-hidden="true" />
          <h3>{{ t('marketing.features.i18nTitle') }}</h3>
          <p>{{ t('marketing.features.i18nBody') }}</p>
        </div>
      </div>
    </section>

    <!-- CTA band -->
    <section class="marketing-section marketing-band persona-cta">
      <div class="persona-cta-inner">
        <h2>{{ t('marketing.headline') }}</h2>
        <RouterLink class="primary-button" to="/login">{{ t('marketing.primaryAction') }}</RouterLink>
      </div>
    </section>
  </main>
</template>
