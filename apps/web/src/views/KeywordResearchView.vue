<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ApiError } from '../api/appInsights';
import {
  createCompetitorResearchProject,
  getResearchGaps,
  getResearchKeywords,
  getResearchRun,
  runCompetitorResearch,
  type KeywordGap,
  type ResearchKeyword
} from '../api/keywordResearch';
import { getSiteConnection, updateSiteCompetitorUrls } from '../api/siteConnections';

const { t } = useI18n();
const route = useRoute();
const competitorUrls = ref(['', '', '']);
const selectedIndex = ref(0);
const isLoading = ref(false);
const isSaving = ref(false);
const status = ref('');
const errorCode = ref('');
const keywords = ref<ResearchKeyword[]>([]);
const gaps = ref<KeywordGap[]>([]);
let pollTimer: number | null = null;

const knownTaskErrorCodes = new Set([
  'PROVIDER_UNAVAILABLE',
  'KEYWORD_PROVIDER_HTTP_401',
  'KEYWORD_PROVIDER_HTTP_404',
  'KEYWORD_PROVIDER_HTTP_429',
  'KEYWORD_PROVIDER_HTTP_500',
  'KEYWORD_PROVIDER_HTTP_502',
  'KEYWORD_PROVIDER_HTTP_503',
  'KEYWORD_PROVIDER_TIMEOUT',
  'KEYWORD_PROVIDER_RESPONSE_INVALID',
  'KEYWORD_RESEARCH_INPUT_INVALID',
  'WORKER_TASK_FAILED',
  'QUOTA_EXCEEDED',
  'REQUEST_FAILED',
  'RUN_FAILED'
]);

function resolveTaskErrorCode(value?: string) {
  if (!value) return 'RUN_FAILED';
  if (knownTaskErrorCodes.has(value)) return value;
  if (/^KEYWORD_PROVIDER_HTTP_[45]\d\d$/.test(value)) return value;
  return 'RUN_FAILED';
}

const siteId = computed(() => typeof route.params.siteId === 'string' ? route.params.siteId : '');
const selectedCompetitorUrl = computed(() => competitorUrls.value[selectedIndex.value]?.trim() ?? '');
const filledCompetitorCount = computed(() => competitorUrls.value.filter((value) => value.trim()).length);
const longTailKeywords = computed(() => keywords.value.filter((item) => item.displayKeyword.trim().split(/\s+/).length >= 3 || [...item.displayKeyword].length >= 12));

function stopPolling() {
  if (pollTimer !== null) window.clearInterval(pollTimer);
  pollTimer = null;
}

async function loadSiteCompetitors() {
  if (!siteId.value) return;
  try {
    const result = await getSiteConnection(siteId.value);
    const saved = result.site.competitorUrls ?? [];
    competitorUrls.value = [0, 1, 2].map((index) => saved[index] ?? '');
    if (!selectedCompetitorUrl.value) {
      const firstFilled = competitorUrls.value.findIndex((value) => value.trim());
      selectedIndex.value = firstFilled >= 0 ? firstFilled : 0;
    }
  } catch {
    // Keep empty slots when site details cannot be loaded.
  }
}

async function loadResults(projectId: string) {
  const [keywordResult, gapResult] = await Promise.all([getResearchKeywords(projectId), getResearchGaps(projectId)]);
  keywords.value = keywordResult.items;
  gaps.value = gapResult.items;
}

async function saveCompetitors() {
  if (!siteId.value) return;
  isSaving.value = true;
  errorCode.value = '';
  try {
    const result = await updateSiteCompetitorUrls(
      siteId.value,
      competitorUrls.value.map((value) => value.trim()).filter(Boolean)
    );
    const saved = result.site.competitorUrls ?? [];
    competitorUrls.value = [0, 1, 2].map((index) => saved[index] ?? '');
  } catch (error) {
    errorCode.value = error instanceof ApiError ? resolveTaskErrorCode(error.code) : 'REQUEST_FAILED';
  } finally {
    isSaving.value = false;
  }
}

async function analyzeCompetitor() {
  if (!siteId.value || !selectedCompetitorUrl.value) return;
  stopPolling();
  isLoading.value = true;
  errorCode.value = '';
  keywords.value = [];
  gaps.value = [];
  try {
    await updateSiteCompetitorUrls(
      siteId.value,
      competitorUrls.value.map((value) => value.trim()).filter(Boolean)
    );
    const project = await createCompetitorResearchProject(siteId.value, selectedCompetitorUrl.value);
    const run = await runCompetitorResearch(project.project.id, selectedCompetitorUrl.value);
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

watch(siteId, () => {
  stopPolling();
  void loadSiteCompetitors();
});

onMounted(() => {
  void loadSiteCompetitors();
});

onUnmounted(stopPolling);
</script>

<template>
  <section class="page-section keyword-research-workspace">
    <div class="page-heading"><div><h2>{{ t('keywordResearch.title') }}</h2><p>{{ t('keywordResearch.body') }}</p></div></div>
    <a-alert v-if="errorCode" type="warning" show-icon :message="t(`keywordResearch.errors.${errorCode}`)" />
    <section class="content-panel">
      <a-form layout="vertical" @submit.prevent="analyzeCompetitor">
        <p class="panel-note">{{ t('keywordResearch.slotHint', { count: filledCompetitorCount }) }}</p>
        <a-form-item
          v-for="(_, index) in competitorUrls"
          :key="index"
          :label="t('keywordResearch.competitorSlot', { index: index + 1 })"
        >
          <div class="competitor-row">
            <a-radio :checked="selectedIndex === index" @change="selectedIndex = index" />
            <a-input
              v-model:value="competitorUrls[index]"
              placeholder="https://example.com"
              @focus="selectedIndex = index"
            />
          </div>
        </a-form-item>
        <div class="action-row">
          <a-button :loading="isSaving" :disabled="!siteId" @click="saveCompetitors">{{ t('keywordResearch.save') }}</a-button>
          <a-button type="primary" html-type="submit" :loading="isLoading" :disabled="!siteId || !selectedCompetitorUrl">{{ t('keywordResearch.analyze') }}</a-button>
          <span v-if="status" class="panel-note">{{ t('keywordResearch.status') }}: {{ status }}</span>
        </div>
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

<style scoped>
.competitor-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.competitor-row :deep(.ant-input) {
  flex: 1;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
</style>
