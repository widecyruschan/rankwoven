<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { TableColumnsType } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import {
  getAdminSerpapiUsage,
  type SerpapiUsageStats
} from '../api/siteConnections';

interface ProviderUsageRow {
  provider: string;
  calls: string;
  cost: string;
  status: string;
}

const { t } = useI18n();

const selectedProvider = ref<ProviderUsageRow | null>(null);
const serpapiStats = ref<SerpapiUsageStats | null>(null);

const serpapiRow = computed<ProviderUsageRow | null>(() => {
  const stats = serpapiStats.value;
  if (!stats) return null;

  return {
    provider: t('admin.usage.serpapi'),
    calls: `${stats.totalCreditsUsed} / ${stats.monthlyLimit}`,
    cost: '$0（免費層）',
    status: stats.keyConfigured ? t('admin.status.active') : t('admin.usage.serpapiNoKey')
  };
});

const providerRows = computed<ProviderUsageRow[]>(() => {
  const rows: ProviderUsageRow[] = [
    { provider: 'OpenAI', calls: '186K', cost: '$860', status: t('admin.status.active') },
    { provider: 'Google Gemini', calls: '92K', cost: '$410', status: t('admin.status.active') },
    { provider: 'DeepSeek', calls: '74K', cost: '$188', status: t('admin.status.active') },
    { provider: t('admin.usage.wenwen'), calls: '352K', cost: '$1.46K', status: t('admin.status.active') },
    { provider: t('admin.usage.qiniu'), calls: '1.8 TB', cost: '$176', status: t('admin.status.watch') }
  ];

  if (serpapiRow.value) {
    // Insert SerpApi after Google Gemini
    rows.splice(3, 0, serpapiRow.value);
  }

  return rows;
});

const columns = computed<TableColumnsType<ProviderUsageRow>>(() => [
  {
    title: t('admin.usage.provider'),
    dataIndex: 'provider',
    key: 'provider'
  },
  {
    title: t('admin.usage.calls'),
    dataIndex: 'calls',
    key: 'calls'
  },
  {
    title: t('admin.usage.cost'),
    dataIndex: 'cost',
    key: 'cost'
  },
  {
    title: t('cmsAdapters.status'),
    dataIndex: 'status',
    key: 'status'
  },
  {
    title: t('admin.usage.route'),
    key: 'route'
  },
  {
    title: t('articles.action'),
    key: 'action',
    width: 120
  }
]);

function inspectProvider(provider: ProviderUsageRow) {
  selectedProvider.value = provider;
}

function serpapiUsagePercent(): number {
  const stats = serpapiStats.value;
  if (!stats || stats.monthlyLimit === 0) return 0;
  return Math.min(100, Math.round((stats.totalCreditsUsed / stats.monthlyLimit) * 100));
}

onMounted(async () => {
  try {
    serpapiStats.value = await getAdminSerpapiUsage();
  } catch {
    // silently fail — SerpApi row won't appear
  }
});
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('admin.usage.title') }}</h2>
        <p>{{ t('admin.usage.body') }}</p>
      </div>
    </div>

    <!-- SerpApi Usage Card -->
    <div v-if="serpapiStats" style="margin-bottom: 16px">
      <a-card size="small" :title="t('admin.usage.serpapi')" style="background: #f8f9fb">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-statistic
              :title="t('admin.usage.calls')"
              :value="serpapiStats.totalCreditsUsed"
              :suffix="`/ ${serpapiStats.monthlyLimit}`"
            />
          </a-col>
          <a-col :span="6">
            <a-statistic
              :title="t('admin.usage.serpapiRemaining', { remaining: serpapiStats.remaining })"
              :value="serpapiStats.remaining"
              :value-style="{ color: serpapiStats.remaining < 50 ? '#cf1322' : '#3f8600' }"
            />
          </a-col>
          <a-col :span="6">
            <a-statistic
              :title="t('admin.usage.serpapiAudits', { count: serpapiStats.totalAudits })"
              :value="serpapiStats.totalAudits"
            />
          </a-col>
          <a-col :span="6">
            <a-progress
              :percent="serpapiUsagePercent()"
              :stroke-color="serpapiUsagePercent() > 80 ? '#cf1322' : '#1677ff'"
              :status="serpapiUsagePercent() > 80 ? 'exception' : 'active'"
              size="small"
              style="max-width: 200px"
            />
            <div style="margin-top: 4px; font-size: 12px; color: #888">
              {{ t('admin.usage.serpapiLimit') }}
            </div>
          </a-col>
        </a-row>
      </a-card>
    </div>

    <section class="content-panel">
      <a-tabs default-active-key="providers">
        <a-tab-pane key="providers" :tab="t('admin.usage.providersTab')" />
        <a-tab-pane key="storage" :tab="t('admin.usage.storageTab')" />
      </a-tabs>

      <a-table row-key="provider" :columns="columns" :data-source="providerRows" :pagination="false">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'provider'">
            <strong>{{ record.provider }}</strong>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag
              :color="
                record.status === t('admin.status.watch') || record.status === t('admin.usage.serpapiNoKey')
                  ? 'warning'
                  : 'success'
              "
            >
              {{ record.status }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'route'">
            <span>{{ t('admin.usage.autoRoute') }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" @click="inspectProvider(record)">
              {{ t('admin.usage.inspect') }}
            </a-button>
          </template>
        </template>
      </a-table>
    </section>

    <a-modal
      :open="Boolean(selectedProvider)"
      :title="selectedProvider?.provider"
      :footer="null"
      @cancel="selectedProvider = null"
    >
      <dl v-if="selectedProvider" class="detail-list">
        <dt>{{ t('admin.usage.calls') }}</dt>
        <dd>{{ selectedProvider.calls }}</dd>
        <dt>{{ t('admin.usage.cost') }}</dt>
        <dd>{{ selectedProvider.cost }}</dd>
        <dt>{{ t('admin.usage.route') }}</dt>
        <dd>{{ t('admin.usage.autoRoute') }}</dd>
        <dt>{{ t('cmsAdapters.status') }}</dt>
        <dd>{{ selectedProvider.status }}</dd>
        <!-- SerpApi extra details -->
        <template v-if="selectedProvider.provider === t('admin.usage.serpapi') && serpapiStats">
          <dt>{{ t('admin.usage.serpapiAudits', { count: serpapiStats.totalAudits }) }}</dt>
          <dd>{{ serpapiStats.totalAudits }}</dd>
          <dt>{{ t('admin.usage.serpapiLimit') }}</dt>
          <dd>{{ t('admin.usage.serpapiRemaining', { remaining: serpapiStats.remaining }) }}</dd>
        </template>
      </dl>
    </a-modal>
  </section>
</template>
