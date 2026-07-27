<script setup lang="ts">
/* global Blob, URL */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  Database,
  Download,
  Lightbulb,
  Sparkles,
  SearchCheck,
  TrendingUp,
  Verified
} from 'lucide-vue-next';
import {
  createKeywordSuggestions,
  enrichKeywords,
  type KeywordSuggestion
} from '@/api/appInsights';

const { t, locale: i18nLocale } = useI18n();

// ── State ────────────────────────────────────────────────────────
const seedKeyword = ref('');
const intent = ref<KeywordSuggestion['intent']>('informational');
const suggestions = ref<KeywordSuggestion[]>([]);
const resultSource = ref<'enriched' | 'ai-provider' | 'fallback' | null>(null);
const loading = ref(false);
const errorMsg = ref('');
const enriching = ref(false);
const enrichmentMsg = ref('');
const enrichmentType = ref<'success' | 'info' | 'warning' | 'error'>('info');
const expandedTrace = ref<string | null>(null);
const gscMatchedCount = ref(0);

const locale = computed(() => i18nLocale.value || 'zh-Hant');

// ── Helpers ──────────────────────────────────────────────────────

function formatVolume(v?: number) {
  if (v == null || v === 0) return '—';
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return `${v}`;
}

function formatCpc(c?: number) {
  if (c == null) return '—';
  return `$${c.toFixed(2)}`;
}

function formatCompetition(c?: number) {
  if (c == null) return '—';
  return `${(c * 100).toFixed(0)}%`;
}

function formatScore(s: number) {
  return `${Math.round(s)}`;
}

function formatPosition(pos?: number) {
  if (pos == null) return '—';
  return pos < 10 ? pos.toFixed(1) : `${Math.round(pos)}`;
}

function sourceBadge(source: string) {
  const map: Record<string, string> = {
    dataforseo: t('keywords.sourceDataforseo'),
    ahrefs: t('keywords.sourceAhrefs'),
    semrush: t('keywords.sourceSemrush'),
    gsc: t('keywords.sourceGsc'),
    'ai-provider': t('keywords.sourceAi'),
    fallback: t('keywords.sourceFallback')
  };
  return map[source] ?? source;
}

function sourceColor(source: string) {
  const map: Record<string, string> = {
    dataforseo: '#1677ff',
    ahrefs: '#fa8c16',
    semrush: '#eb2f96',
    gsc: '#52c41a',
    'ai-provider': '#8b5cf6',
    fallback: '#888'
  };
  return map[source] ?? '#888';
}

function isVerified(suggestion: KeywordSuggestion) {
  return suggestion.sourceTrace?.verified;
}

function isEnriched(suggestion: KeywordSuggestion) {
  return isVerified(suggestion) && suggestion.monthlySearchVolume != null;
}

// ── Actions ──────────────────────────────────────────────────────

async function generate() {
  if (!seedKeyword.value.trim()) {
    errorMsg.value = t('keywords.seedRequired');
    return;
  }

  loading.value = true;
  errorMsg.value = '';
  enrichmentMsg.value = '';
  suggestions.value = [];
  resultSource.value = null;

  try {
    const result = await createKeywordSuggestions({
      seedKeyword: seedKeyword.value.trim(),
      locale: locale.value,
      intent: intent.value
    });

    suggestions.value = result.suggestions;
    resultSource.value = result.source;
  } catch (err: unknown) {
    errorMsg.value =
      err instanceof Error ? err.message : t('keywords.loadFailed');
  } finally {
    loading.value = false;
  }
}

async function enrichAll() {
  if (suggestions.value.length === 0) return;

  enriching.value = true;
  enrichmentMsg.value = '';
  enrichmentType.value = 'info';
  gscMatchedCount.value = 0;

  try {
    const result = await enrichKeywords({
      keywords: suggestions.value.map((s) => s.keyword),
      locale: locale.value
    });

    let gscCount = 0;

    // Merge enriched metrics back into suggestions
    suggestions.value = suggestions.value.map((s) => {
      const enriched = result.enriched.find(
        (e) => e.keyword.toLowerCase() === s.keyword.toLowerCase()
      );
      if (enriched?.found) {
        // Merge GSC data if available
        if (enriched.gscData) {
          gscCount++;
        }
        return {
          ...s,
          monthlySearchVolume:
            enriched.monthlySearchVolume ?? s.monthlySearchVolume,
          cpcUsd: enriched.cpcUsd ?? s.cpcUsd,
          competition: enriched.competition ?? s.competition,
          source: (enriched.source as KeywordSuggestion['source']) ?? s.source,
          gscData: enriched.gscData ?? s.gscData,
          sourceTrace: {
            ...s.sourceTrace,
            volume: (enriched.source as KeywordSuggestion['sourceTrace']['volume']) ?? s.sourceTrace.volume,
            cpc: (enriched.source as KeywordSuggestion['sourceTrace']['cpc']) ?? s.sourceTrace.cpc,
            competition: (enriched.source as KeywordSuggestion['sourceTrace']['competition']) ?? s.sourceTrace.competition,
            difficulty: (enriched.source as KeywordSuggestion['sourceTrace']['difficulty']) ?? s.sourceTrace.difficulty,
            verified: true
          }
        };
      }
      return s;
    });

    gscMatchedCount.value = gscCount;
    const enrichedCount = result.enriched.filter((e) => e.found).length;

    if (enrichedCount > 0) {
      enrichmentMsg.value = t('keywords.enrichmentSuccess');
      resultSource.value = 'enriched';
      enrichmentType.value = 'success';
    } else {
      enrichmentMsg.value = t('keywords.enrichmentEmpty');
      enrichmentType.value = 'warning';
    }
  } catch (err: unknown) {
    enrichmentMsg.value =
      err instanceof Error ? err.message : t('keywords.enrichmentFailed');
    enrichmentType.value = 'error';
  } finally {
    enriching.value = false;
  }
}

function toggleTrace(keyword: string) {
  expandedTrace.value =
    expandedTrace.value === keyword ? null : keyword;
}

function exportData() {
  if (suggestions.value.length === 0) return;

  const headers = [
    'Keyword',
    'Intent',
    'Difficulty',
    'Opportunity',
    'Volume',
    'CPC',
    'Competition',
    'Source',
    'Verified',
    'Content Angle'
  ];
  const rows = suggestions.value.map((s) =>
    [
      s.keyword,
      s.intent,
      s.difficulty,
      s.opportunityScore,
      s.monthlySearchVolume ?? '-',
      s.cpcUsd ?? '-',
      s.competition ?? '-',
      s.source,
      isVerified(s) ? 'Yes' : 'No',
      s.contentAngle
    ].join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `keyword-suggestions-${seedKeyword.value || 'export'}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Computed ─────────────────────────────────────────────────────

const resultMeta = computed(() => {
  if (!resultSource.value) return '';
  const map: Record<string, string> = {
    enriched: t('keywords.sourceVerified'),
    'ai-provider': t('keywords.sourceUnverified'),
    fallback: t('keywords.sourceUnverified')
  };
  return map[resultSource.value] ?? '';
});
</script>

<template>
  <section class="page-section">
    <!-- Input bar / aitdk-style toolbar -->
    <div class="keyword-controls">
      <div class="control-left">
        <a-input
          v-model:value="seedKeyword"
          class="seed-input"
          size="large"
          :placeholder="t('keywords.seedPlaceholder') || 'Enter seed keyword'"
          @press-enter="generate"
        />
        <a-select
          v-model:value="intent"
          class="intent-select"
          size="large"
          style="min-width: 150px"
        >
          <a-select-option value="informational">
            {{ t('keywords.intentInformational') }}
          </a-select-option>
          <a-select-option value="commercial">
            {{ t('keywords.intentCommercial') }}
          </a-select-option>
          <a-select-option value="transactional">
            {{ t('keywords.intentTransactional') }}
          </a-select-option>
          <a-select-option value="local">
            {{ t('keywords.intentLocal') }}
          </a-select-option>
        </a-select>
        <a-button
          type="primary"
          size="large"
          :loading="loading"
          @click="generate"
        >
          <Sparkles :size="16" />
          {{ t('keywords.generate') }}
        </a-button>
      </div>
      <div class="control-right">
        <a-button
          v-if="suggestions.length > 0"
          size="large"
          :loading="enriching"
          :disabled="loading"
          @click="enrichAll"
        >
          <Database :size="16" />
          {{ enriching ? t('keywords.enriching') : t('keywords.enrichAction') }}
        </a-button>
        <a-button
          v-if="suggestions.length > 0"
          size="large"
          @click="exportData"
        >
          <Download :size="16" />
          {{ t('keywords.exportCsv') || 'Export' }}
        </a-button>
      </div>
    </div>

    <!-- Error -->
    <a-alert
      v-if="errorMsg"
      type="error"
      :message="errorMsg"
      show-icon
      closable
      style="margin-top: 12px"
      @close="errorMsg = ''"
    />

    <!-- Enrichment status -->
    <a-alert
      v-if="enrichmentMsg"
      :type="enrichmentType"
      :message="enrichmentMsg"
      show-icon
      closable
      style="margin-top: 12px"
      @close="enrichmentMsg = ''"
    />

    <!-- GSC enrichment summary -->
    <a-alert
      v-if="gscMatchedCount > 0"
      type="success"
      show-icon
      closable
      style="margin-top: 8px"
      @close="gscMatchedCount = 0"
    >
      <template #message>
        {{ t('keywords.gscAlerts', { matched: gscMatchedCount, total: suggestions.length }) }}
      </template>
    </a-alert>

    <!-- Result header -->
    <div v-if="suggestions.length > 0" class="result-header">
      <h2>{{ t('keywords.resultTitle') }}</h2>
      <div class="result-meta">
        <a-tag :color="isEnriched(suggestions[0]) ? 'success' : 'default'">
          {{ resultMeta }}
        </a-tag>
        <span class="result-count">
          {{ suggestions.length }} {{ t('keywords.keywordCount', { count: suggestions.length }) || 'keywords' }}
        </span>
      </div>
    </div>

    <!-- Suggestions table -->
    <div v-if="suggestions.length > 0" class="suggestions-table-wrap">
      <div class="suggestions-table">
        <!-- Header -->
        <div class="st-row st-header">
          <span class="st-cell st-kw">{{ t('keywords.keyword') }}</span>
          <span class="st-cell st-int">{{ t('keywords.intent') || 'Intent' }}</span>
          <span class="st-cell st-diff">{{ t('keywords.difficulty') || 'Difficulty' }}</span>
          <span class="st-cell st-vol">{{ t('keywords.volume') }}</span>
          <span class="st-cell st-num">{{ t('keywords.cpc') }}</span>
          <span class="st-cell st-num">{{ t('keywords.competition') }}</span>
          <span class="st-cell st-src">{{ t('keywords.source') }}</span>
          <span class="st-cell st-opp">{{ t('keywords.opportunity') }}</span>
          <span class="st-cell st-angle">{{ t('keywords.angle') }}</span>
        </div>

        <!-- Rows -->
        <div
          v-for="s in suggestions"
          :key="s.keyword"
          class="st-row st-body-row"
        >
          <!-- Keyword + GSC overlay -->
          <span class="st-cell st-kw">
            <div class="kw-name-wrap">
              <span class="kw-name">{{ s.keyword }}</span>
              <a-tag
                v-if="s.gscData"
                color="green"
                class="gsc-inline-tag"
                :title="`${t('keywords.gscPerformance')}: ${s.gscData.clicks} ${t('keywords.gscClicks')}, ${s.gscData.impressions} ${t('keywords.gscImpr')}, ${t('keywords.gscPosition')} ${formatPosition(s.gscData.position)}`"
              >
                <TrendingUp :size="11" />
                {{ formatPosition(s.gscData.position) }}
              </a-tag>
            </div>
          </span>

          <!-- Intent -->
          <span class="st-cell st-int">
            <a-tag>{{ s.intent }}</a-tag>
          </span>

          <!-- Difficulty -->
          <span class="st-cell st-diff">
            <a-tag
              :color="s.difficulty === 'low' ? 'success' : s.difficulty === 'medium' ? 'warning' : 'error'"
            >
              {{ t(`keywords.difficulty${s.difficulty.charAt(0).toUpperCase() + s.difficulty.slice(1)}`) }}
            </a-tag>
          </span>

          <!-- Volume (with verification indicator) -->
          <span class="st-cell st-vol">
            <span :class="{ 'metric-estimated': !isVerified(s) }">
              {{ formatVolume(s.monthlySearchVolume) }}
            </span>
            <a-tooltip
              v-if="s.monthlySearchVolume != null"
              :title="isVerified(s) ? t('keywords.traceVerified') : t('keywords.traceUnverified')"
            >
              <Verified
                v-if="isVerified(s)"
                :size="13"
                style="color: #1677ff; margin-left: 4px"
              />
              <SearchCheck
                v-else
                :size="13"
                style="color: #888; margin-left: 4px"
              />
            </a-tooltip>
          </span>

          <!-- CPC -->
          <span class="st-cell st-num">
            <span :class="{ 'metric-estimated': !isVerified(s) }">
              {{ formatCpc(s.cpcUsd) }}
            </span>
          </span>

          <!-- Competition -->
          <span class="st-cell st-num">
            <span :class="{ 'metric-estimated': !isVerified(s) }">
              {{ formatCompetition(s.competition) }}
            </span>
          </span>

          <!-- Source badge with trace toggle -->
          <span class="st-cell st-src">
            <a-tag
              :color="sourceColor(s.source)"
              style="cursor: pointer"
              @click="toggleTrace(s.keyword)"
            >
              <Verified v-if="isVerified(s)" :size="11" style="margin-right: 3px" />
              {{ sourceBadge(s.source) }}
            </a-tag>
          </span>

          <!-- Opportunity score -->
          <span class="st-cell st-opp">
            <a-progress
              type="circle"
              :size="36"
              :percent="s.opportunityScore"
              :stroke-color="{
                '0%': '#1677ff',
                '100%': s.opportunityScore > 70 ? '#52c41a' : '#fa8c16'
              }"
              :width="36"
            >
              <template #format="percent">
                <span style="font-size: 11px; font-weight: 700">
                  {{ formatScore(percent ?? s.opportunityScore) }}
                </span>
              </template>
            </a-progress>
          </span>

          <!-- Content angle -->
          <span class="st-cell st-angle" :title="s.contentAngle">
            <Lightbulb :size="13" style="flex-shrink: 0; color: #fa8c16" />
            <span class="angle-text">{{ s.contentAngle }}</span>
          </span>

          <!-- Source trace expanded detail -->
          <div v-if="expandedTrace === s.keyword" class="st-trace-detail">
            <div class="trace-grid">
              <div class="trace-item">
                <span class="trace-label">{{ t('keywords.traceIdeaSource') }}</span>
                <a-tag>
                  {{ s.sourceTrace.keywordIdea === 'ai-provider' ? t('keywords.traceIdeaAi') + ')' : t('keywords.traceIdeaTemplate') }}
                </a-tag>
              </div>
              <div class="trace-item">
                <span class="trace-label">{{ t('keywords.traceMetricsSource') }}</span>
                <a-tag :color="isVerified(s) ? 'blue' : 'default'">
                  {{ isVerified(s) ? sourceBadge(s.sourceTrace.volume) : t('keywords.traceUnverified') }}
                </a-tag>
              </div>
              <div class="trace-item">
                <span class="trace-label">CPC</span>
                <a-tag :color="isVerified(s) ? 'blue' : 'default'">
                  {{ isVerified(s) ? sourceBadge(s.sourceTrace.cpc) : t('keywords.traceUnverified') }}
                </a-tag>
              </div>
              <div class="trace-item">
                <span class="trace-label">{{ t('keywords.competition') }}</span>
                <a-tag :color="isVerified(s) ? 'blue' : 'default'">
                  {{ isVerified(s) ? sourceBadge(s.sourceTrace.competition) : t('keywords.traceUnverified') }}
                </a-tag>
              </div>
            </div>
            <!-- GSC detail if available -->
            <div v-if="s.gscData" class="gsc-detail">
              <div class="gsc-detail-item">
                <TrendingUp :size="14" />
                <span>{{ t('keywords.gscPerformance') }}</span>
              </div>
              <div class="gsc-metrics">
                <span>{{ s.gscData.clicks }} {{ t('keywords.gscClicks') }}</span>
                <span class="gsc-sep">|</span>
                <span>{{ s.gscData.impressions }} {{ t('keywords.gscImpr') }}</span>
                <span class="gsc-sep">|</span>
                <span>CTR {{ (s.gscData.ctr * 100).toFixed(1) }}%</span>
                <span class="gsc-sep">|</span>
                <span>{{ t('keywords.gscPosition') }} {{ formatPosition(s.gscData.position) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!loading && !errorMsg" class="empty-suggestions">
      <Lightbulb :size="48" color="#d9d9d9" />
      <p>{{ t('keywords.body') }}</p>
      <p class="empty-hint">
        {{ t('keywords.seedRequired') || 'Enter a seed keyword and click Generate' }}
      </p>
    </div>
  </section>
</template>

<style scoped>
/* ── Controls bar ─────────────────────────────────────────────── */
.keyword-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  background: var(--card-bg, #fff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.control-left,
.control-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.control-left {
  flex: 1;
}

.seed-input {
  min-width: 220px;
  max-width: 360px;
  flex: 1;
}

.intent-select {
  min-width: 130px;
  width: auto;
}

/* ── Result header ────────────────────────────────────────────── */
.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
  margin-bottom: 12px;
}

.result-header h2 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: var(--text-color, #1e293b);
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-muted, #64748b);
}

.rest-count {
  font-weight: 600;
}

/* ── Suggestions table ────────────────────────────────────────── */
.suggestions-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
  background: var(--card-bg, #fff);
}

.suggestions-table {
  min-width: 960px;
}

.st-row {
  display: grid;
  grid-template-columns:
    2fr       /* keyword */
    100px     /* intent */
    80px      /* difficulty */
    80px      /* volume */
    70px      /* cpc */
    80px      /* competition */
    120px     /* source */
    60px      /* opportunity */
    2fr;      /* angle */
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-color, #f0f0f0);
  font-size: 13px;
}

.st-header {
  font-weight: 700;
  color: var(--text-muted, #64748b);
  background: var(--bg-secondary, #fafafa);
  border-radius: 12px 12px 0 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.st-body-row {
  display: grid;
  transition: background 0.15s;
  flex-wrap: wrap;
}

.st-body-row:hover {
  background: var(--bg-hover, #f8fafc);
}

.st-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.st-kw {
  font-weight: 600;
  color: var(--text-color, #1e293b);
}

.kw-name-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.kw-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gsc-inline-tag {
  flex-shrink: 0;
  font-size: 11px;
  line-height: 18px;
  padding: 0 4px;
}

.gsc-inline-tag :deep(.anticon) {
  vertical-align: -1px;
}

.st-ang {
  overflow: hidden;
}

.angle-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-secondary, #475569);
  font-size: 12px;
}

.metric-estimated {
  color: var(--text-muted, #94a3b8);
  font-style: italic;
}

/* ── Source trace panel ───────────────────────────────────────── */
.st-trace-detail {
  grid-column: 1 / -1;
  padding: 12px 16px;
  background: var(--bg-secondary, #f5f7fa);
  border-top: 1px dashed var(--border-color, #e5e7eb);
}

.trace-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.trace-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.trace-label {
  color: var(--text-muted, #64748b);
  font-weight: 600;
  white-space: nowrap;
}

.gsc-detail {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color, #e5e7eb);
  font-size: 12px;
}

.gsc-detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #52c41a;
}

.gsc-metrics {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary, #475569);
}

.gsc-sep {
  color: var(--border-color, #d4d4d8);
}

/* ── Empty state ──────────────────────────────────────────────── */
.empty-suggestions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-muted, #94a3b8);
  gap: 8px;
}

.empty-suggestions p {
  margin: 0;
  font-size: 15px;
}

.empty-hint {
  font-size: 13px !important;
  color: var(--text-muted, #b0b7c3);
}

/* ── Responsive ───────────────────────────────────────────────── */
@media (max-width: 768px) {
  .keyword-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .control-left {
    flex-direction: column;
  }

  .seed-input {
    max-width: 100%;
  }

  .control-right {
    justify-content: flex-start;
  }

  .st-row {
    gap: 4px;
    padding: 8px 12px;
    font-size: 12px;
  }
}
</style>
