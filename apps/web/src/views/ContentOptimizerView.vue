<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ApiError } from '../api/appInsights';
import { createContentOptimization, getContentOptimization, type ContentOptimizationDetail } from '../api/contentOptimization';

const { t } = useI18n();
const route = useRoute();
const content = ref('');
const focusKeyword = ref('');
const isSubmitting = ref(false);
const errorCode = ref('');
const result = ref<ContentOptimizationDetail | null>(null);
const siteId = computed(() => typeof route.params.siteId === 'string' ? route.params.siteId : '');

async function analyzeContent() {
  if (!siteId.value || !content.value.trim() || !focusKeyword.value.trim()) return;
  isSubmitting.value = true;
  errorCode.value = '';
  result.value = null;
  try {
    const task = await createContentOptimization({ siteId: siteId.value, content: content.value, focusKeyword: focusKeyword.value });
    result.value = await getContentOptimization(task.runId);
  } catch (error) {
    errorCode.value = error instanceof ApiError ? error.code ?? 'REQUEST_FAILED' : 'REQUEST_FAILED';
  } finally {
    isSubmitting.value = false;
  }
}

function statusType(status: string) {
  return status === 'pass' ? 'success' : status === 'fail' ? 'error' : status === 'warning' ? 'warning' : 'default';
}
</script>

<template>
  <section class="page-section content-optimizer-workspace">
    <div class="page-heading"><div><h2>{{ t('contentOptimizer.title') }}</h2><p>{{ t('contentOptimizer.body') }}</p></div></div>
    <a-alert v-if="errorCode" type="warning" show-icon :message="t(`contentOptimizer.errors.${errorCode}`)" />
    <section class="content-panel optimizer-input-panel">
      <a-form layout="vertical" @submit.prevent="analyzeContent">
        <a-form-item :label="t('contentOptimizer.focusKeyword')"><a-input v-model:value="focusKeyword" /></a-form-item>
        <a-form-item :label="t('contentOptimizer.content')"><a-textarea v-model:value="content" :rows="12" /></a-form-item>
        <a-button type="primary" html-type="submit" :loading="isSubmitting" :disabled="!siteId || !content.trim() || !focusKeyword.trim()">{{ t('contentOptimizer.analyze') }}</a-button>
      </a-form>
    </section>
    <section v-if="result" class="content-panel optimizer-result-panel">
      <div class="optimizer-score"><strong>{{ result.run.score ?? '—' }}</strong><span>{{ t('contentOptimizer.score') }} · {{ t('contentOptimizer.confidence') }} {{ result.run.confidence ?? '—' }}</span></div>
      <a-table :data-source="result.scoreChecks" :pagination="false" row-key="code" size="small">
        <a-table-column key="dimension" data-index="dimension" :title="t('contentOptimizer.dimension')" />
        <a-table-column key="status" :title="t('contentOptimizer.status')"><template #default="{ record }"><a-tag :color="statusType(record.status)">{{ record.status }}</a-tag></template></a-table-column>
        <a-table-column key="recommendation" data-index="recommendation" :title="t('contentOptimizer.recommendation')" />
      </a-table>
    </section>
  </section>
</template>
