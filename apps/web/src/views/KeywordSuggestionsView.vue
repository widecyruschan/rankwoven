<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ColumnsType } from 'ant-design-vue/es/table';
import { createKeywordSuggestions, type KeywordSuggestion } from '../api/appInsights';

const { t, locale } = useI18n();

const seedKeyword = ref('AI SEO');
const intent = ref<KeywordSuggestion['intent']>('informational');
const isLoading = ref(false);
const loadError = ref('');
const suggestions = ref<KeywordSuggestion[]>([]);
const resultSource = ref<KeywordSuggestion['source'] | ''>('');

const intentOptions = computed(() => [
  { label: t('keywords.intentInformational'), value: 'informational' },
  { label: t('keywords.intentCommercial'), value: 'commercial' },
  { label: t('keywords.intentTransactional'), value: 'transactional' },
  { label: t('keywords.intentLocal'), value: 'local' }
]);

const columns = computed<ColumnsType<KeywordSuggestion>>(() => [
  { title: t('keywords.keyword'), dataIndex: 'keyword', key: 'keyword' },
  { title: t('keywords.intent'), dataIndex: 'intent', key: 'intent' },
  { title: t('keywords.difficulty'), dataIndex: 'difficulty', key: 'difficulty' },
  { title: t('keywords.volume'), dataIndex: 'monthlySearchVolume', key: 'monthlySearchVolume', width: 120 },
  { title: t('keywords.cpc'), dataIndex: 'cpcUsd', key: 'cpcUsd', width: 110 },
  { title: t('keywords.source'), dataIndex: 'source', key: 'source', width: 150 },
  { title: t('keywords.opportunity'), dataIndex: 'opportunityScore', key: 'opportunityScore' },
  { title: t('keywords.angle'), dataIndex: 'contentAngle', key: 'contentAngle' }
]);
const difficultyLabelKeys: Record<KeywordSuggestion['difficulty'], string> = {
  low: 'keywords.difficultyLow',
  medium: 'keywords.difficultyMedium',
  high: 'keywords.difficultyHigh'
};
const intentLabelKeys: Record<KeywordSuggestion['intent'], string> = {
  informational: 'keywords.intentInformational',
  commercial: 'keywords.intentCommercial',
  transactional: 'keywords.intentTransactional',
  local: 'keywords.intentLocal'
};

function getDifficultyLabel(difficulty: KeywordSuggestion['difficulty']) {
  return t(difficultyLabelKeys[difficulty]);
}

function getDifficultyColor(difficulty: KeywordSuggestion['difficulty']) {
  const colors: Record<KeywordSuggestion['difficulty'], string> = {
    low: 'green',
    medium: 'gold',
    high: 'red'
  };

  return colors[difficulty];
}

function getIntentLabel(nextIntent: KeywordSuggestion['intent']) {
  return t(intentLabelKeys[nextIntent]);
}

function getSourceLabel(source: KeywordSuggestion['source'] | '') {
  if (source === 'third-party-volume') {
    return t('keywords.sourceThirdParty');
  }

  if (source === 'ai-provider') {
    return t('keywords.sourceAi');
  }

  if (source === 'fallback') {
    return t('keywords.sourceFallback');
  }

  return '';
}

async function generateSuggestions() {
  if (!seedKeyword.value.trim()) {
    loadError.value = t('keywords.seedRequired');
    return;
  }

  isLoading.value = true;
  loadError.value = '';

  try {
    const result = await createKeywordSuggestions({
      seedKeyword: seedKeyword.value,
      locale: locale.value,
      intent: intent.value
    });
    suggestions.value = result.suggestions;
    resultSource.value = result.source;
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('keywords.loadFailed');
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('keywords.title') }}</h2>
        <p>{{ t('keywords.body') }}</p>
      </div>
    </div>

    <a-card>
      <a-form layout="vertical" @submit.prevent="generateSuggestions">
        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :lg="12">
            <a-form-item :label="t('keywords.seedKeyword')">
              <a-input v-model:value="seedKeyword" :placeholder="t('keywords.seedPlaceholder')" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :lg="8">
            <a-form-item :label="t('keywords.intent')">
              <a-select v-model:value="intent" :options="intentOptions" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :lg="4" class="keyword-action-col">
            <a-button type="primary" html-type="submit" :loading="isLoading" block>
              {{ t('keywords.generate') }}
            </a-button>
          </a-col>
        </a-row>
      </a-form>
      <a-alert v-if="loadError" type="error" show-icon :message="loadError" />
    </a-card>

    <a-card class="section-card" :title="t('keywords.resultTitle')">
      <template #extra>
        <a-tag v-if="resultSource">{{ getSourceLabel(resultSource) }}</a-tag>
      </template>
      <a-table :columns="columns" :data-source="suggestions" :loading="isLoading" row-key="keyword">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'opportunityScore'">
            <a-progress :percent="(record as KeywordSuggestion).opportunityScore" size="small" />
          </template>
          <template v-else-if="column.key === 'difficulty'">
            <a-tag :color="getDifficultyColor((record as KeywordSuggestion).difficulty)">
              {{ getDifficultyLabel((record as KeywordSuggestion).difficulty) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'intent'">
            {{ getIntentLabel((record as KeywordSuggestion).intent) }}
          </template>
          <template v-else-if="column.key === 'monthlySearchVolume'">
            {{ (record as KeywordSuggestion).monthlySearchVolume ?? '--' }}
          </template>
          <template v-else-if="column.key === 'cpcUsd'">
            {{ (record as KeywordSuggestion).cpcUsd === undefined ? '--' : `$${(record as KeywordSuggestion).cpcUsd}` }}
          </template>
          <template v-else-if="column.key === 'source'">
            <a-tag>{{ getSourceLabel((record as KeywordSuggestion).source) }}</a-tag>
          </template>
        </template>
      </a-table>
    </a-card>
  </section>
</template>
