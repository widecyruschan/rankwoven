<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const sites = computed(() => [
  {
    name: 'rankwoven.com',
    platform: 'WordPress',
    health: '92',
    articles: '486',
    lastSync: '10:42',
    status: t('sites.statusConnected')
  },
  {
    name: 'docs.rankwoven.com',
    platform: 'Joomla',
    health: '81',
    articles: '312',
    lastSync: '09:18',
    status: t('sites.statusWarning')
  },
  {
    name: 'shop.rankwoven.com',
    platform: 'OpenCart',
    health: '76',
    articles: '486',
    lastSync: '08:55',
    status: t('sites.statusConnected')
  }
]);

const connectionSteps = computed(() => [
  t('sites.connectStepOne'),
  t('sites.connectStepTwo'),
  t('sites.connectStepThree')
]);
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('sites.title') }}</h2>
        <p>{{ t('sites.body') }}</p>
      </div>
      <button class="primary-button" type="button">{{ t('sites.primaryAction') }}</button>
    </div>

    <div class="prototype-grid">
      <section class="content-panel panel-wide">
        <div class="data-table" role="table">
          <div class="data-row data-head" role="row">
            <span>{{ t('sites.name') }}</span>
            <span>{{ t('sites.platform') }}</span>
            <span>{{ t('sites.health') }}</span>
            <span>{{ t('sites.articles') }}</span>
            <span>{{ t('sites.lastSync') }}</span>
            <span>{{ t('cmsAdapters.status') }}</span>
          </div>
          <div v-for="site in sites" :key="site.name" class="data-row" role="row">
            <strong>{{ site.name }}</strong>
            <span>{{ site.platform }}</span>
            <span>{{ site.health }}</span>
            <span>{{ site.articles }}</span>
            <span>{{ site.lastSync }}</span>
            <span class="status-pill">{{ site.status }}</span>
          </div>
        </div>
      </section>

      <section class="content-panel">
        <div class="panel-heading">
          <h2>{{ t('sites.connectTitle') }}</h2>
        </div>
        <ol class="step-list">
          <li v-for="step in connectionSteps" :key="step">{{ step }}</li>
        </ol>
      </section>
    </div>
  </section>
</template>
