<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Alert, Card, Empty, Spin, Statistic, Table } from 'ant-design-vue';
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

const totalClicks = computed(() =>
  data.value ? data.value.keywords.reduce((sum, k) => sum + k.clicks, 0) : 0
);
const totalImpressions = computed(() =>
  data.value ? data.value.keywords.reduce((sum, k) => sum + k.impressions, 0) : 0
);
const avgPosition = computed(() => {
  if (!data.value || data.value.keywords.length === 0) return 0;
  return data.value.keywords.reduce((sum, k) => sum + k.position, 0) / data.value.keywords.length;
});

async function fetchData() {
  if (!props.siteUrl) return;
  loading.value = true;
  error.value = null;
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
        <div v-if="data" class="gsc-stats">
          <Statistic :title="t('searchConsole.clicks')" :value="totalClicks" />
          <Statistic :title="t('searchConsole.impressions')" :value="totalImpressions" />
          <Statistic :title="t('searchConsole.avgPosition')" :value="avgPosition.toFixed(1)" />
        </div>

        <Table
          v-if="data && data.keywords.length > 0"
          :columns="columns"
          :data-source="data.keywords"
          :pagination="{ pageSize: 10, showSizeChanger: false }"
          row-key="query"
          size="small"
        />

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
</style>
