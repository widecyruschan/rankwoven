<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ApiError } from '../api/appInsights';
import {
  createCompetitorResearchProject,
  expandLongTailKeywords,
  getResearchGaps,
  getResearchKeywords,
  getResearchRun,
  hostnameFromSiteUrl,
  runCompetitorResearch,
  type ExpandedKeyword,
  type KeywordGap,
  type ResearchKeyword
} from '../api/keywordResearch';
import { getSiteConnection, updateSiteCompetitorUrls } from '../api/siteConnections';

const { t } = useI18n();
const route = useRoute();
const competitorUrls = ref(['', '', '']);
const seedInput = ref('');
const siteUrl = ref('');
/** null means the user has not chosen which competitor to analyze yet */
const selectedIndex = ref<number | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);
const isExpanding = ref(false);
const status = ref('');
const errorCode = ref('');
const keywords = ref<ResearchKeyword[]>([]);
const gaps = ref<KeywordGap[]>([]);
const expandedKeywords = ref<ExpandedKeyword[]>([]);
const expandSources = ref<string[]>([]);
let pollTimer: number | null = null;

const knownTaskErrorCodes = new Set([
  'PROVIDER_UNAVAILABLE',
  'KEYWORD_PROVIDER_HTTP_401',
  'KEYWORD_PROVIDER_HTTP_403',
  'KEYWORD_PROVIDER_HTTP_404',
  'KEYWORD_PROVIDER_HTTP_429',
  'KEYWORD_PROVIDER_HTTP_500',
  'KEYWORD_PROVIDER_HTTP_502',
  'KEYWORD_PROVIDER_HTTP_503',
  'KEYWORD_PROVIDER_TIMEOUT',
  'KEYWORD_PROVIDER_RESPONSE_INVALID',
  'KEYWORD_PROVIDER_ACCOUNT_UNVERIFIED',
  'KEYWORD_RESEARCH_INPUT_INVALID',
  'WORKER_TASK_FAILED',
  'ENTITLEMENT_REQUIRED',
  'QUOTA_EXCEEDED',
  'REQUEST_FAILED',
  'RUN_FAILED',
  'SELECT_REQUIRED',
  'SEED_REQUIRED'
]);

function resolveTaskErrorCode(value?: string) {
  if (!value) return 'RUN_FAILED';
  if (knownTaskErrorCodes.has(value)) return value;
  if (/^KEYWORD_PROVIDER_HTTP_[45]\d\d$/.test(value)) return value;
  return 'RUN_FAILED';
}

const siteId = computed(() => typeof route.params.siteId === 'string' ? route.params.siteId : '');
const ownDomain = computed(() => hostnameFromSiteUrl(siteUrl.value));
const selectedCompetitorUrl = computed(() => {
  if (selectedIndex.value === null) return '';
  return competitorUrls.value[selectedIndex.value]?.trim() ?? '';
});
const filledCompetitorCount = computed(() => competitorUrls.value.filter((value) => value.trim()).length);
const seedKeywords = computed(() => seedInput.value
  .split(/[\n,，]/)
  .map((value) => value.replace(/\s+/g, ' ').trim())
  .filter(Boolean)
  .slice(0, 5));
const canAnalyze = computed(() => Boolean(siteId.value && selectedCompetitorUrl.value));
const canExpand = computed(() => Boolean(siteId.value && seedKeywords.value.length > 0));
const longTailKeywords = computed(() => keywords.value.filter((item) => {
  const text = item.displayKeyword.trim();
  return text.split(/\s+/).length >= 3 || [...text].length >= 12;
}));
const contentGaps = computed(() => gaps.value.filter((gap) => gap.displayKeyword || (gap.evidenceRefs?.length ?? 0) > 0));

function stopPolling() {
  if (pollTimer !== null) window.clearInterval(pollTimer);
  pollTimer = null;
}

function selectCompetitor(index: number) {
  if (!competitorUrls.value[index]?.trim()) return;
  selectedIndex.value = index;
}

function onCompetitorUrlChange(index: number) {
  if (!competitorUrls.value[index]?.trim() && selectedIndex.value === index) {
    selectedIndex.value = null;
  }
}

async function loadSiteCompetitors() {
  if (!siteId.value) return;
  try {
    const result = await getSiteConnection(siteId.value);
    siteUrl.value = result.site.siteUrl ?? '';
    const saved = result.site.competitorUrls ?? [];
    competitorUrls.value = [0, 1, 2].map((index) => saved[index] ?? '');
    if (selectedIndex.value !== null && !competitorUrls.value[selectedIndex.value]?.trim()) {
      selectedIndex.value = null;
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
    if (selectedIndex.value !== null && !competitorUrls.value[selectedIndex.value]?.trim()) {
      selectedIndex.value = null;
    }
  } catch (error) {
    errorCode.value = error instanceof ApiError ? resolveTaskErrorCode(error.code) : 'REQUEST_FAILED';
  } finally {
    isSaving.value = false;
  }
}

async function generateLongTail() {
  if (!canExpand.value) {
    errorCode.value = 'SEED_REQUIRED';
    return;
  }
  isExpanding.value = true;
  errorCode.value = '';
  try {
    const result = await expandLongTailKeywords({
      seeds: seedKeywords.value,
      market: 'HK',
      language: 'zh-Hant',
      maxKeywords: 100
    });
    expandedKeywords.value = result.keywords;
    expandSources.value = result.sources;
  } catch (error) {
    errorCode.value = error instanceof ApiError ? resolveTaskErrorCode(error.code) : 'REQUEST_FAILED';
  } finally {
    isExpanding.value = false;
  }
}

async function analyzeCompetitor() {
  if (!siteId.value) return;
  if (selectedIndex.value === null || !selectedCompetitorUrl.value) {
    errorCode.value = 'SELECT_REQUIRED';
    return;
  }
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
    const run = await runCompetitorResearch(project.project.id, selectedCompetitorUrl.value, {
      seedKeywords: seedKeywords.value,
      ownDomain: ownDomain.value || undefined
    });
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
  selectedIndex.value = null;
  expandedKeywords.value = [];
  void loadSiteCompetitors();
});

onMounted(() => {
  void loadSiteCompetitors();
});

onUnmounted(stopPolling);
</script>

<template>
  <section class="page-section keyword-research-workspace">
    <div class="page-heading">
      <div>
        <h2>{{ t('keywordResearch.title') }}</h2>
        <p>{{ t('keywordResearch.body') }}</p>
      </div>
    </div>
    <a-alert v-if="errorCode" type="warning" show-icon :message="t(`keywordResearch.errors.${errorCode}`)" />

    <section class="content-panel">
      <h3>{{ t('keywordResearch.longTailTitle') }}</h3>
      <p class="panel-note">{{ t('keywordResearch.longTailHint') }}</p>
      <a-form layout="vertical" @submit.prevent="generateLongTail">
        <a-form-item :label="t('keywordResearch.seedKeywords')">
          <a-textarea
            v-model:value="seedInput"
            :rows="3"
            :placeholder="t('keywordResearch.seedPlaceholder')"
          />
        </a-form-item>
        <div class="action-row">
          <a-button type="primary" html-type="submit" :loading="isExpanding" :disabled="!canExpand">
            {{ t('keywordResearch.expandLongTail') }}
          </a-button>
          <span v-if="expandSources.length" class="panel-note">
            {{ t('keywordResearch.expandSources') }}: {{ expandSources.join(', ') }}
          </span>
        </div>
      </a-form>
      <div v-if="expandedKeywords.length" class="expanded-tags">
        <a-tag v-for="item in expandedKeywords" :key="`${item.source}-${item.keyword}`" :color="item.source === 'google_autocomplete' ? 'blue' : undefined">
          {{ item.keyword }}
          <span v-if="item.intent" class="tag-meta">· {{ item.intent }}</span>
        </a-tag>
      </div>
    </section>

    <section class="content-panel">
      <h3>{{ t('keywordResearch.competitorTitle') }}</h3>
      <a-form layout="vertical" @submit.prevent="analyzeCompetitor">
        <p class="panel-note">{{ t('keywordResearch.slotHint', { count: filledCompetitorCount }) }}</p>
        <p class="panel-note select-hint">{{ t('keywordResearch.selectHint') }}</p>
        <a-radio-group v-model:value="selectedIndex" class="competitor-radio-group">
          <a-form-item
            v-for="(_, index) in competitorUrls"
            :key="index"
            :label="t('keywordResearch.competitorSlot', { index: index + 1 })"
          >
            <div class="competitor-row" :class="{ selected: selectedIndex === index }">
              <a-radio
                :value="index"
                :disabled="!competitorUrls[index]?.trim()"
                @click="selectCompetitor(index)"
              >
                {{ t('keywordResearch.selectThis') }}
              </a-radio>
              <a-input
                v-model:value="competitorUrls[index]"
                placeholder="https://example.com"
                @update:value="onCompetitorUrlChange(index)"
              />
            </div>
          </a-form-item>
        </a-radio-group>
        <div class="action-row">
          <a-button :loading="isSaving" :disabled="!siteId" @click="saveCompetitors">{{ t('keywordResearch.save') }}</a-button>
          <a-button type="primary" html-type="submit" :loading="isLoading" :disabled="!canAnalyze">{{ t('keywordResearch.analyze') }}</a-button>
          <span v-if="selectedCompetitorUrl" class="panel-note">{{ t('keywordResearch.analyzing') }}: {{ selectedCompetitorUrl }}</span>
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

    <section v-if="contentGaps.length" class="content-panel">
      <h3>{{ t('keywordResearch.contentGaps') }}</h3>
      <p class="panel-note">{{ t('keywordResearch.contentGapsHint') }}</p>
      <a-table :data-source="contentGaps" row-key="id" :pagination="false" size="small">
        <a-table-column key="displayKeyword" data-index="displayKeyword" :title="t('keywordResearch.keyword')" />
        <a-table-column key="classification" data-index="classification" :title="t('keywordResearch.gapType')" />
        <a-table-column key="score" data-index="score" :title="t('keywordResearch.opportunity')" />
      </a-table>
    </section>
  </section>
</template>

<style scoped>
.competitor-radio-group {
  display: block;
  width: 100%;
}

.select-hint {
  margin-bottom: 12px;
  font-weight: 600;
}

.competitor-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.competitor-row.selected {
  border-color: var(--ant-color-primary, #1677ff);
  background: color-mix(in srgb, var(--ant-color-primary, #1677ff) 8%, transparent);
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

.expanded-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.tag-meta {
  opacity: 0.7;
  font-size: 12px;
}
</style>
