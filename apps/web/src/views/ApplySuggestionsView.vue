<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const batches = computed(() => [
  { name: t('apply.batchImageTitleMeta'), count: '38', risk: t('apply.riskLow'), status: t('apply.ready') },
  { name: t('apply.batchMedia'), count: '81', risk: t('apply.riskLow'), status: t('apply.ready') },
  { name: t('apply.batchContent'), count: '24', risk: t('apply.riskMedium'), status: t('tasks.statusWaiting') },
  { name: t('apply.batchLinks'), count: '52', risk: t('apply.riskMedium'), status: t('apply.ready') }
]);

const safeguards = computed(() => [t('apply.snapshot'), t('apply.reviewOnly'), t('apply.rollback')]);
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('apply.title') }}</h2>
        <p>{{ t('apply.body') }}</p>
      </div>
      <button class="primary-button" type="button">{{ t('apply.primaryAction') }}</button>
    </div>

    <div class="prototype-grid">
      <section class="content-panel panel-wide">
        <div class="data-table" role="table">
          <div class="data-row data-head" role="row">
            <span>{{ t('apply.batch') }}</span>
            <span>{{ t('apply.count') }}</span>
            <span>{{ t('apply.risk') }}</span>
            <span>{{ t('cmsAdapters.status') }}</span>
            <span>{{ t('articleSync.lastSync') }}</span>
            <span>{{ t('articles.action') }}</span>
          </div>
          <div v-for="batch in batches" :key="batch.name" class="data-row" role="row">
            <strong>{{ batch.name }}</strong>
            <span>{{ batch.count }}</span>
            <span class="tag-pill">{{ batch.risk }}</span>
            <span class="status-pill">{{ batch.status }}</span>
            <span>10:42</span>
            <button class="text-button" type="button">{{ t('apply.applyOne') }}</button>
          </div>
        </div>
      </section>

      <section class="content-panel">
        <div class="panel-heading">
          <h2>{{ t('apply.safeguardsTitle') }}</h2>
        </div>
        <ul class="check-list">
          <li v-for="item in safeguards" :key="item">{{ item }}</li>
        </ul>
      </section>
    </div>
  </section>
</template>
