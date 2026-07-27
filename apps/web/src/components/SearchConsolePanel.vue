<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Alert, Card, Empty, Input, Spin, Statistic, Table, Tag } from 'ant-design-vue';
import { Search, TrendingUp } from 'lucide-vue-next';
import {
  getSearchConsoleKeywords,
  type SearchConsoleKeyword,
  type SearchConsoleKeywordsResult
} from '@/api/appInsights';

const { t } = useI18n();

const props = defineProps<{
  siteUrl?: string;
  compact?: boolean;
}>();

const loading = ref(false);
const error = ref<string | null>(null);
const data = ref<SearchConsoleKeywordsResult | null>(null);
const keywordFilter = ref('');

// ── Filtered keywords ──────────────────────────────────────────────
const filteredKeywords = computed<SearchConsoleKeyword[]>(() => {
  if (!data.value) return [];
  const q = keywordFilter.value.trim().toLowerCase();
  if (!q) return data.value.keywords;
  return data.value.keywords.filter((k) => k.query.toLowerCase().includes(q));
});

// ── Top keywords for bar chart ─────────────────────────────────────
const topKeywords = computed<SearchConsoleKeyword[]>(() => {
  if (!data.value) return [];
  return [...data.value.keywords]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);
});

const maxBarClicks = computed(() => {
  if (topKeywords.value.length === 0) return 1;
  return Math.max(...topKeywords.value.map((k) => k.clicks));
});

// ── Stats (based on filtered data) ─────────────────────────────────
const totalClicks = computed(() =>
  filteredKeywords.value.reduce((sum, k) => sum + k.clicks, 0)
);
const totalImpressions = computed(() =>
  filteredKeywords.value.reduce((sum, k) => sum + k.impressions, 0)
);
const avgCtr = computed(() => {
  if (filteredKeywords.value.length === 0) return 0;
  return filteredKeywords.value.reduce((sum, k) => sum + k.ctr, 0) / filteredKeywords.value.length;
});
const avgPosition = computed(() => {
  if (filteredKeywords.value.length === 0) return 0;
  return filteredKeywords.value.reduce((sum, k) => sum + k.position, 0) / filteredKeywords.value.length;
});

const columns = computed(() => [
  {
    title: t('searchConsole.keyword'),
    dataIndex: 'query',
    key: 'query',
    ellipsis: true
  },
  {
    title: t('searchConsole.clicks'),
    dataIndex: 'clicks',
    key: 'clicks',
    width: 90,
    align: 'right' as const,
    sorter: (a: SearchConsoleKeyword, b: SearchConsoleKeyword) => a.clicks - b.clicks
  },
  {
    title: t('searchConsole.impressions'),
    dataIndex: 'impressions',
    key: 'impressions',
    width: 100,
    align: 'right' as const,
    sorter: (a: SearchConsoleKeyword, b: SearchConsoleKeyword) => a.impressions - b.impressions
  },
  {
    title: t('searchConsole.ctr'),
    dataIndex: 'ctr',
    key: 'ctr',
    width: 90,
    align: 'right' as const,
    sorter: (a: SearchConsoleKeyword, b: SearchConsoleKeyword) => a.ctr - b.ctr,
    customRender: ({ text }: { text: number }) => `${text.toFixed(2)}%`
  },
  {
    title: t('searchConsole.position'),
    dataIndex: 'position',
    key: 'position',
    width: 100,
    align: 'right' as const,
    sorter: (a: SearchConsoleKeyword, b: SearchConsoleKeyword) => a.position - b.position,
    customRender: ({ text }: { text: number }) => text.toFixed(1)
  }
]);

async function fetchData() {
  if (!props.siteUrl) return;
  loading.value = true;
  error.value = null;
  keywordFilter.value = '';
  try {
    data.value = await getSearchConsoleKeywords({ siteUrl: props.siteUrl });
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (props.siteUrl) fetchData();
});

watch(() => props.siteUrl, (newUrl) => {
  if (newUrl) fetchData();
  else {
    data.value = null;
    error.value = null;
  }
});

defineExpose({ refresh: fetchData });
</script>

<template>
  <Card :title="t('searchConsole.title')" :size="compact ? 'small' : 'default'">
    <Spin :spinning="loading">
      <Alert
        v-if="error"
        type="error"
        :message="error"
        closable
        @close="error = null"
      />

      <template v-if="!error">
        <!-- Stats row -->
        <div v-if="data" class="gsc-stats">
          <Statistic :title="t('dashboard.gscTotalClicks')" :value="totalClicks" />
          <Statistic :title="t('dashboard.gscTotalImpr')" :value="totalImpressions" />
          <Statistic
            :title="t('dashboard.gscAvgCtr')"
            :value="avgCtr"
            :precision="2"
            suffix="%"
          />
          <Statistic
            :title="t('dashboard.gscAvgPosition')"
            :value="avgPosition"
            :precision="1"
          />
        </div>

        <!-- Bar chart for top 5 keywords -->
        <div v-if="topKeywords.length > 0" class="gsc-bar-chart-section">
          <h4 class="gsc-bar-title">
            <TrendingUp :size="15" />
            {{ t('keywords.topKeywordsByClicks') || 'Top keywords by clicks' }}
          </h4>
          <div class="gsc-bar-list">
            <div
              v-for="kw in topKeywords"
              :key="kw.query"
              class="gsc-bar-row"
            >
              <span class="gsc-bar-label" :title="kw.query">{{ kw.query }}</span>
              <div class="gsc-bar-track">
                <div
                  class="gsc-bar-fill"
                  :style="{ width: `${(kw.clicks / maxBarClicks) * 100}%` }"
                />
              </div>
              <span class="gsc-bar-value">{{ kw.clicks }}</span>
            </div>
          </div>
        </div>

        <!-- Keyword filter + table -->
        <div v-if="data && data.keywords.length > 0" class="gsc-table-section">
          <div class="gsc-toolbar">
            <Input
              v-model:value="keywordFilter"
              :placeholder="t('keywords.searchPlaceholder') || 'Filter keywords…'"
              allow-clear
              class="gsc-filter-input"
            >
              <template #prefix>
                <Search :size="14" />
              </template>
            </Input>
            <Tag v-if="keywordFilter" color="blue" class="gsc-filter-count">
              {{ filteredKeywords.length }} / {{ data.keywords.length }}
            </Tag>
          </div>

          <Table
            :columns="columns"
            :data-source="filteredKeywords"
            :pagination="{ pageSize: 10, showSizeChanger: false }"
            row-key="query"
            size="small"
          />
        </div>

        <Empty v-else-if="!loading" :description="t('searchConsole.noData')" />
      </template>
    </Spin>
  </Card>
</template>

<style scoped>
.gsc-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.gsc-bar-chart-section {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.gsc-bar-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 10px 0;
  font-size: 13px;
  font-weight: 500;
  color: #595959;
}

.gsc-bar-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gsc-bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gsc-bar-label {
  width: 140px;
  font-size: 12px;
  color: #262626;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.gsc-bar-track {
  flex: 1;
  height: 8px;
  background: #e8e8e8;
  border-radius: 4px;
  overflow: hidden;
}

.gsc-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #1677ff, #4096ff);
  border-radius: 4px;
  transition: width 0.4s ease;
}

.gsc-bar-value {
  width: 36px;
  font-size: 12px;
  color: #8c8c8c;
  text-align: right;
  flex-shrink: 0;
}

.gsc-table-section {
  margin-top: 8px;
}

.gsc-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.gsc-filter-input {
  max-width: 280px;
}

.gsc-filter-count {
  font-size: 12px;
}
</style>
