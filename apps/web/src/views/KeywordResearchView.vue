<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ApiError } from '../api/appInsights';
import { createCompetitorResearchProject, getResearchGaps, getResearchKeywords, getResearchRun, runCompetitorResearch, type KeywordGap, type ResearchKeyword } from '../api/keywordResearch';

const { t } = useI18n();
const route = useRoute();
const competitorUrl = ref('');
const isLoading = ref(false);
const status = ref('');
const errorCode = ref('');
const keywords = ref<ResearchKeyword[]>([]);
const gaps = ref<KeywordGap[]>([]);
let pollTimer: number | null = null;

const taskErrorCodes = new Set([
  'PROVIDER_UNAVAILABLE',
  'KEYWORD_PROVIDER_HTTP_401',
  'KEYWORD_PROVIDER_HTTP_429',
  'KEYWORD_PROVIDER_TIMEOUT',
  'KEYWORD_PROVIDER_RESPONSE_INVALID'
]);

function resolveTaskErrorCode(value?: string) {
  return value && taskErrorCodes.has(value) ? value : 'RUN_FAILED';
}

const siteId = computed(() => typeof route.params.siteId === 'string' ? route.params.siteId : '');
const longTailKeywords = computed(() => keywords.value.filter((item) => item.displayKeyword.trim().split(/\s+/).length >= 3 || [...item.displayKeyword].length >= 12));

function stopPolling() {
  if (pollTimer !== null) window.clearInterval(pollTimer);
  pollTimer = null;
}

async function loadResults(projectId: string) {
  const [keywordResult, gapResult] = await Promise.all([getResearchKeywords(projectId), getResearchGaps(projectId)]);
  keywords.value = keywordResult.items;
  gaps.value = gapResult.items;
}

async function analyzeCompetitor() {
  if (!siteId.value || !competitorUrl.value.trim()) return;
  stopPolling();
  isLoading.value = true;
  errorCode.value = '';
  keywords.value = [];
  gaps.value = [];
  try {
    const project = await createCompetitorResearchProject(siteId.value, competitorUrl.value.trim());
    const run = await runCompetitorResearch(project.project.id, competitorUrl.value.trim());
    status.value = run.status;
    pollTimer = window.setInterval(async () => {
      try {
        const current = await getResearchRun(run.runId);
        status.value = current.status;
        if (['completed', 'partial'].includes(current.status)) {
          stopPolling();
          await loadResults(project.project.id);
          isLoading.value = false;
        } else if (['failed', 'cancelled', 'dead_letter'].includes(current.status)) {
          stopPolling();
          isLoading.value = false;
          errorCode.value = resolveTaskErrorCode(current.errorCode);
        }
      } catch {
        stopPolling();
        isLoading.value = false;
        errorCode.value = 'REQUEST_FAILED';
      }
    }, 2500);
  } catch (error) {
    errorCode.value = error instanceof ApiError ? resolveTaskErrorCode(error.code) : 'REQUEST_FAILED';
    isLoading.value = false;
  }
}

onUnmounted(stopPolling);
</script>

<template>
  <section class="page-section keyword-research-workspace">
    <div class="page-heading"><div><h2>{{ t('keywordResearch.title') }}</h2><p>{{ t('keywordResearch.body') }}</p></div></div>
    <a-alert v-if="errorCode" type="warning" show-icon :message="t(`keywordResearch.errors.${errorCode}`)" />
    <section class="content-panel">
      <a-form layout="vertical" @submit.prevent="analyzeCompetitor">
        <a-form-item :label="t('keywordResearch.competitorUrl')"><a-input v-model:value="competitorUrl" placeholder="https://example.com" /></a-form-item>
        <a-button type="primary" html-type="submit" :loading="isLoading" :disabled="!siteId || !competitorUrl.trim()">{{ t('keywordResearch.analyze') }}</a-button>
        <span v-if="status" class="panel-note">{{ t('keywordResearch.status') }}: {{ status }}</span>
      </a-form>
    </section>
    <section v-if="keywords.length" class="content-panel">
      <h3>{{ t('keywordResearch.competitorKeywords') }}</h3>
      <a-table :data-source="keywords" row-key="id" :pagination="false" size="small">
        <a-table-column key="displayKeyword" data-index="displayKeyword" :title="t('keywordResearch.keyword')" />
        <a-table-column key="intent" data-index="intent" :title="t('keywordResearch.intent')" />
        <a-table-column key="opportunityScore" data-index="opportunityScore" :title="t('keywordResearch.opportunity')" />
      </a-table>
    </section>
    <section v-if="longTailKeywords.length" class="content-panel">
      <h3>{{ t('keywordResearch.longTailKeywords') }}</h3>
      <a-tag v-for="keyword in longTailKeywords" :key="keyword.id">{{ keyword.displayKeyword }}</a-tag>
    </section>
    <section v-if="gaps.length" class="content-panel">
      <h3>{{ t('keywordResearch.gaps') }}</h3>
      <a-tag v-for="gap in gaps" :key="gap.id" color="blue">{{ gap.classification }}</a-tag>
    </section>
  </section>
</template>
