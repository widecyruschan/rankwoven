<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Alert, Button, Card, Collapse, Empty, Input, Spin, Tag } from 'ant-design-vue';
import { Zap } from 'lucide-vue-next';
import {
  getLighthouseAudit,
  type LighthouseAuditResult,
  type LighthouseDiagnostic
} from '@/api/appInsights';

const { t } = useI18n();

const props = defineProps<{
  siteUrl?: string;
  compact?: boolean;
}>();

const loading = ref(false);
const error = ref<string | null>(null);
const data = ref<LighthouseAuditResult | null>(null);
const auditUrl = ref('');
const activeDiagnostics = ref<string[]>([]);

// ── Auto-fill URL when siteUrl prop changes ─────────────────────
watch(
  () => props.siteUrl,
  (newUrl) => {
    if (newUrl && !auditUrl.value) {
      auditUrl.value = newUrl.replace(/\/+$/, '');
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (props.siteUrl && !auditUrl.value) {
    auditUrl.value = props.siteUrl.replace(/\/+$/, '');
  }
});

// ── Score helpers ────────────────────────────────────────────────

function scoreColor(v: number): string {
  if (v >= 90) return '#0cce6b';
  if (v >= 50) return '#ffa400';
  return '#ff4e42';
}

function scoreLabel(v: number): string {
  if (v >= 90) return t('lighthouse.passed');
  if (v >= 50) return t('lighthouse.warning');
  return t('lighthouse.failed');
}

function scoreLabelColor(v: number): string {
  if (v >= 90) return 'green';
  if (v >= 50) return 'gold';
  return 'red';
}

const scoreCards = computed(() => {
  if (!data.value) return [];
  const { scores } = data.value;
  return [
    { key: 'performance', label: t('lighthouse.performance'), value: Math.round(scores.performance * 100) },
    { key: 'accessibility', label: t('lighthouse.accessibility'), value: Math.round(scores.accessibility * 100) },
    { key: 'bestPractices', label: t('lighthouse.bestPractices'), value: Math.round(scores.bestPractices * 100) },
    { key: 'seo', label: t('lighthouse.seo'), value: Math.round(scores.seo * 100) }
  ];
});

// ── Core Web Vitals ──────────────────────────────────────────────

interface VitalsRow {
  key: string;
  label: string;
  desc: string;
  value: string;
  status: 'passed' | 'warning' | 'failed';
  statusTag?: string;
  statusColor?: string;
}

const vitalsRows = computed<VitalsRow[]>(() => {
  if (!data.value) return [];
  const m = data.value.metrics;

  function lcpStatus(v: number): VitalsRow['status'] {
    if (v <= 2500) return 'passed';
    if (v <= 4000) return 'warning';
    return 'failed';
  }

  function clsStatus(v: number): VitalsRow['status'] {
    if (v <= 0.1) return 'passed';
    if (v <= 0.25) return 'warning';
    return 'failed';
  }

  function tbtStatus(v: number): VitalsRow['status'] {
    if (v <= 200) return 'passed';
    if (v <= 600) return 'warning';
    return 'failed';
  }

  function fcpStatus(v: number): VitalsRow['status'] {
    if (v <= 1800) return 'passed';
    if (v <= 3000) return 'warning';
    return 'failed';
  }

  function siStatus(v: number): VitalsRow['status'] {
    if (v <= 3400) return 'passed';
    if (v <= 5800) return 'warning';
    return 'failed';
  }

  function statusTag(s: VitalsRow['status']): string {
    if (s === 'passed') return t('lighthouse.passed');
    if (s === 'warning') return t('lighthouse.needImprovement');
    return t('lighthouse.failed');
  }

  function statusColor(s: VitalsRow['status']): string {
    if (s === 'passed') return 'green';
    if (s === 'warning') return 'gold';
    return 'red';
  }

  const rows: VitalsRow[] = [
    {
      key: 'lcp', label: t('lighthouse.lcp'), desc: t('lighthouse.lcpDesc'),
      value: `${(m.largestContentfulPaint / 1000).toFixed(2)}s`,
      status: lcpStatus(m.largestContentfulPaint)
    },
    {
      key: 'cls', label: t('lighthouse.cls'), desc: t('lighthouse.clsDesc'),
      value: m.cumulativeLayoutShift.toFixed(3),
      status: clsStatus(m.cumulativeLayoutShift)
    },
    {
      key: 'tbt', label: t('lighthouse.tbt'), desc: t('lighthouse.tbtDesc'),
      value: `${Math.round(m.totalBlockingTime)}ms`,
      status: tbtStatus(m.totalBlockingTime)
    },
    {
      key: 'fcp', label: t('lighthouse.fcp'), desc: t('lighthouse.fcpDesc'),
      value: `${(m.firstContentfulPaint / 1000).toFixed(2)}s`,
      status: fcpStatus(m.firstContentfulPaint)
    },
    {
      key: 'si', label: t('lighthouse.si'), desc: t('lighthouse.siDesc'),
      value: `${(m.speedIndex / 1000).toFixed(2)}s`,
      status: siStatus(m.speedIndex)
    }
  ];

  return rows.map((r) => ({
    ...r,
    statusTag: statusTag(r.status),
    statusColor: statusColor(r.status)
  }));
});

// ── Diagnostics ──────────────────────────────────────────────────

const diagnosticsByCategory = computed<Map<string, LighthouseDiagnostic[]>>(() => {
  if (!data.value) return new Map();
  const map = new Map<string, LighthouseDiagnostic[]>();
  for (const d of data.value.diagnostics) {
    const cat = d.category || 'general';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(d);
  }
  return map;
});

const diagnosticEntries = computed(() => Array.from(diagnosticsByCategory.value.entries()));

const diagnosticCategories = computed(() => Array.from(diagnosticsByCategory.value.keys()));

function diagSeverity(score: number): string {
  if (score >= 0.9) return t('lighthouse.severityPass');
  if (score >= 0.5) return t('lighthouse.severityModerate');
  return t('lighthouse.severityCritical');
}

function diagSeverityColor(score: number): string {
  if (score >= 0.9) return 'green';
  if (score >= 0.5) return 'gold';
  return 'red';
}

// ── Actions ──────────────────────────────────────────────────────

async function runAudit() {
  const url = auditUrl.value.trim();
  if (!url) {
    error.value = t('lighthouse.errorNoUrl');
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    data.value = await getLighthouseAudit(url);
  } catch (err) {
    error.value = (err as Error).message || t('lighthouse.loadFailed');
  } finally {
    loading.value = false;
  }
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

// ── SVG ring geometry ────────────────────────────────────────────

const ringRadius = 40;
const ringCircumference = 2 * Math.PI * ringRadius;

function ringOffset(score: number): number {
  return ringCircumference - (score / 100) * ringCircumference;
}
</script>

<template>
  <Card :title="t('lighthouse.title')" class="lighthouse-panel" :class="{ 'lh--compact': compact }">
    <Spin :spinning="loading" :tip="t('lighthouse.running')">
      <!-- URL input bar (aitdk-inspired compact toolbar) -->
      <div class="audit-toolbar">
        <Input
          v-model:value="auditUrl"
          :placeholder="t('lighthouse.urlPlaceholder')"
          class="audit-input"
          @press-enter="runAudit"
        />
        <Button type="primary" :loading="loading" @click="runAudit">
          {{ loading ? t('lighthouse.running') : t('lighthouse.runAudit') }}
        </Button>
        <Button
          v-if="siteUrl && !data && !loading"
          size="small"
          class="quick-audit-btn"
          @click="runAudit"
        >
          <Zap :size="14" />
          {{ compact ? '' : t('lighthouse.quickAudit') }}
        </Button>
      </div>

      <!-- Error -->
      <Alert
        v-if="error"
        type="error"
        :message="error"
        show-icon
        closable
        style="margin-top: 12px;"
        @close="error = null"
      />

      <!-- Empty state -->
      <Empty
        v-if="!data && !error"
        :description="t('lighthouse.noData')"
        style="margin-top: 24px;"
      />

      <!-- Audit data -->
      <template v-if="data">
        <div class="audit-meta">
          <Tag color="blue" class="audit-url-tag">{{ data.url }}</Tag>
          <span class="audit-timestamp">{{ t('lighthouse.lastAudit') }}: {{ formatTimestamp(data.timestamp) }}</span>
        </div>

        <!-- Score ring gauges -->
        <div class="score-gauges">
          <div
            v-for="card in scoreCards"
            :key="card.key"
            class="gauge-card"
          >
            <div class="gauge-ring" :class="{ 'gauge-ring--compact': compact }">
              <svg viewBox="0 0 100 100" class="gauge-svg">
                <circle
                  cx="50" cy="50"
                  :r="ringRadius"
                  fill="none"
                  stroke="#eaecf0"
                  stroke-width="10"
                />
                <circle
                  cx="50" cy="50"
                  :r="ringRadius"
                  fill="none"
                  :stroke="scoreColor(card.value)"
                  stroke-width="10"
                  stroke-linecap="round"
                  :stroke-dasharray="ringCircumference"
                  :stroke-dashoffset="ringOffset(card.value)"
                  transform="rotate(-90 50 50)"
                  class="gauge-arc"
                />
              </svg>
              <span class="gauge-value" :class="{ 'gauge-value--compact': compact }" :style="{ color: scoreColor(card.value) }">
                {{ card.value }}
              </span>
            </div>
            <div class="gauge-label" :class="{ 'gauge-label--compact': compact }">{{ card.label }}</div>
            <Tag v-if="!compact" :color="scoreLabelColor(card.value)" class="gauge-status">
              {{ scoreLabel(card.value) }}
            </Tag>
          </div>
        </div>

        <!-- Core Web Vitals -->
        <div v-if="vitalsRows.length > 0" class="vitals-section">
          <h3 class="section-title">{{ t('lighthouse.coreWebVitals') }}</h3>
          <div class="vitals-grid" :class="{ 'vitals-grid--compact': compact }">
            <div
              v-for="row in vitalsRows"
              :key="row.key"
              class="vital-item"
              :class="{ 'vital-item--compact': compact }"
            >
              <div class="vital-header">
                <span class="vital-name">{{ row.label }}</span>
                <Tag :color="row.statusColor" class="vital-status-tag">
                  {{ row.statusTag }}
                </Tag>
              </div>
              <div
                class="vital-value"
                :class="[
                  { 'vital-value--compact': compact },
                  `vital--${row.status}`
                ]"
              >
                {{ row.value }}
              </div>
              <div v-if="!compact" class="vital-desc">{{ row.desc }}</div>
            </div>
          </div>
        </div>

        <!-- Diagnostics (hidden in compact mode) -->
        <div v-if="!compact && data.diagnostics.length > 0" class="diagnostics-section">
          <h3 class="section-title">{{ t('lighthouse.diagnostics') }}</h3>
          <!-- eslint-disable vue/attribute-hyphenation -->
          <Collapse
            v-model:activeKey="activeDiagnostics"
            :bordered="false"
            class="diagnostics-list"
          >
            <!-- eslint-enable vue/attribute-hyphenation -->
            <Collapse.Panel
              v-for="[category, items] in diagnosticEntries"
              :key="category"
              :header="`${category} (${items.length})`"
            >
              <div
                v-for="(item, idx) in items"
                :key="idx"
                class="diagnostic-item"
              >
                <div class="diagnostic-head">
                  <Tag :color="diagSeverityColor(item.score)" class="diag-severity">
                    {{ diagSeverity(item.score) }}
                  </Tag>
                  <span class="diagnostic-title">{{ item.title }}</span>
                </div>
                <p class="diagnostic-desc">{{ item.description }}</p>
              </div>
            </Collapse.Panel>
          </Collapse>
          <div v-if="diagnosticCategories.length === 0" class="diagnostics-all-passed">
            {{ t('lighthouse.allPassed') }}
          </div>
        </div>
      </template>
    </Spin>
  </Card>
</template>

<style scoped>
.lighthouse-panel {
  margin-bottom: 24px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: var(--shadow-panel);
}

/* ── Toolbar ──────────────────────────────────────────────────── */

.audit-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
}

.audit-input {
  flex: 1;
  max-width: 480px;
}

/* ── Meta ─────────────────────────────────────────────────────── */

.audit-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.audit-url-tag {
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audit-timestamp {
  color: var(--color-muted);
  font-size: 13px;
}

/* ── Score gauges ─────────────────────────────────────────────── */

.score-gauges {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  justify-content: center;
  margin-top: 24px;
  padding: 24px 0;
  border-bottom: 1px solid var(--color-border);
}

.gauge-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 100px;
}

.gauge-ring {
  position: relative;
  width: 96px;
  height: 96px;
}

.gauge-svg {
  width: 100%;
  height: 100%;
}

.gauge-arc {
  transition: stroke-dashoffset 0.8s ease;
}

.gauge-value {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
}

.gauge-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-ink);
  text-align: center;
}

.gauge-status {
  font-size: 11px;
}

/* ── Section titles ───────────────────────────────────────────── */

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: var(--color-ink);
}

/* ── Core Web Vitals ──────────────────────────────────────────── */

.vitals-section {
  margin-top: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--color-border);
}

.vitals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.vital-item {
  background: var(--color-canvas);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vital-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.vital-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-ink);
  letter-spacing: 0.02em;
}

.vital-status-tag {
  font-size: 10px;
  line-height: 1;
}

.vital-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.vital--passed .vital-value,
.vital--passed {
  color: #0cce6b;
}

.vital--warning .vital-value,
.vital--warning {
  color: #ffa400;
}

.vital--failed .vital-value,
.vital--failed {
  color: #ff4e42;
}

.vital-desc {
  font-size: 12px;
  color: var(--color-muted);
  line-height: 1.5;
}

/* ── Diagnostics ──────────────────────────────────────────────── */

.diagnostics-section {
  margin-top: 24px;
}

.diagnostics-list {
  background: transparent;
}

.diagnostics-list :deep(.ant-collapse-item) {
  border: 1px solid var(--color-border);
  border-radius: 10px !important;
  margin-bottom: 8px;
  overflow: hidden;
}

.diagnostics-list :deep(.ant-collapse-header) {
  font-weight: 600;
  font-size: 14px;
}

.diagnostic-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}

.diagnostic-item:last-child {
  border-bottom: none;
}

.diagnostic-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.diag-severity {
  font-size: 11px;
  flex-shrink: 0;
}

.diagnostic-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-ink);
}

.diagnostic-desc {
  margin: 6px 0 0 0;
  font-size: 13px;
  color: var(--color-muted);
  line-height: 1.6;
  padding-left: 8px;
  border-left: 3px solid var(--color-border);
}

.diagnostics-all-passed {
  text-align: center;
  padding: 24px;
  color: #0cce6b;
  font-weight: 600;
  font-size: 14px;
}

/* ── Responsive ───────────────────────────────────────────────── */

@media (max-width: 640px) {
  .audit-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .audit-input {
    max-width: none;
  }

  .score-gauges {
    gap: 16px;
  }

  .gauge-ring {
    width: 72px;
    height: 72px;
  }

  .gauge-value {
    font-size: 22px;
  }

  .vitals-grid {
    grid-template-columns: 1fr;
  }
}

/* ── Quick audit button ───────────────────────────────────────── */

.quick-audit-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #1677ff;
  border-color: #1677ff20;
  background: #1677ff08;
}

/* ── Compact mode ─────────────────────────────────────────────── */

.lh--compact .score-gauges {
  gap: 12px;
  padding: 16px 0;
  margin-top: 12px;
}

.gauge-ring--compact {
  width: 60px;
  height: 60px;
}

.gauge-value--compact {
  font-size: 18px;
}

.gauge-label--compact {
  font-size: 11px;
}

.vitals-grid--compact {
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.vital-item--compact {
  padding: 10px 12px;
  gap: 4px;
}

.vital-value--compact {
  font-size: 18px;
}

.lh--compact .vitals-section {
  margin-top: 16px;
  padding-bottom: 0;
  border-bottom: none;
}
</style>
