<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  ArrowRight,
  CheckCircle2,
  FilePenLine,
  ImagePlus,
  Link2,
  SendToBack,
  Sparkles
} from 'lucide-vue-next';
import { ApiError } from '../api/appInsights';
import {
  createContentOptimization,
  createContentRewrite,
  getContentOptimization,
  type ContentOptimizationDetail,
  type ContentRewriteScope,
  type ContentRewriteSuggestion,
  type ContentSourceKind,
  updateContentRewriteSuggestion
} from '../api/contentOptimization';
import { getSyncedArticles, type SyncedArticle } from '../api/siteConnections';
import { getRoutePath } from '../constants/routeRegistry';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const sourceKind = ref<ContentSourceKind>('inline');
const selectedArticleId = ref('');
const sourceUrl = ref('');
const content = ref('');
const focusKeyword = ref('');
const secondaryKeywords = ref('');
const toneKey = ref('professional');
const audience = ref('');
const locale = ref('zh-Hant');
const targetMarket = ref('HK');
const funnelStageKey = ref('awareness');
const selectedImageDirection = ref('');
const rewriteScope = ref<ContentRewriteScope>('full_document');
const rewriteSelector = ref('');
const articles = ref<SyncedArticle[]>([]);
const result = ref<ContentOptimizationDetail | null>(null);
const suggestionDrafts = ref<Record<string, string>>({});
const isLoadingArticles = ref(false);
const isSubmitting = ref(false);
const isCreatingRewrite = ref(false);
const activeSuggestionId = ref('');
const errorCode = ref('');
const statusMessage = ref('');
let pollingTimer: number | null = null;

const siteId = computed(() => typeof route.params.siteId === 'string' ? route.params.siteId : '');
const sourceOptions = computed(() => [
  { value: 'inline', label: t('contentOptimizer.sourceOptions.inline') },
  { value: 'article', label: t('contentOptimizer.sourceOptions.article') },
  { value: 'public_url', label: t('contentOptimizer.sourceOptions.publicUrl') }
]);
const articleOptions = computed(() => articles.value.map((article) => ({
  value: article.cmsId,
  label: article.title || article.url
})));
const toneOptions = computed(() => ['professional', 'practical', 'authoritative', 'conversational'].map((value) => ({
  value,
  label: t(`contentOptimizer.toneOptions.${value}`)
})));
const localeOptions = computed(() => [
  { value: 'zh-Hant', label: `${t('contentOptimizer.locale')} · ${t('contentOptimizer.localeOptions.traditionalChinese')}` },
  { value: 'en', label: `${t('contentOptimizer.locale')} · ${t('contentOptimizer.localeOptions.english')}` }
]);
const funnelOptions = computed(() => ['awareness', 'consideration', 'conversion', 'retention'].map((value) => ({
  value,
  label: t(`contentOptimizer.funnelOptions.${value}`)
})));
const rewriteScopeOptions = computed(() => [
  'title', 'meta', 'opening', 'paragraph', 'section', 'outline', 'full_document'
].map((value) => ({
  value,
  label: t(`contentOptimizer.rewriteScopeOptions.${rewriteScopeKey(value as ContentRewriteScope)}`)
})));
const imageDirectionOptions = computed(() => ['instructional', 'product', 'proof', 'editorial'].map((value) => ({
  value,
  label: t(`contentOptimizer.imageDirections.${value}`)
})));
const editorSteps = computed(() => [
  { key: 'brief', label: t('contentOptimizer.steps.brief'), icon: FilePenLine },
  { key: 'draft', label: t('contentOptimizer.steps.draft'), icon: Sparkles },
  { key: 'image', label: t('contentOptimizer.steps.image'), icon: ImagePlus },
  { key: 'links', label: t('contentOptimizer.steps.links'), icon: Link2 },
  { key: 'publish', label: t('contentOptimizer.steps.publish'), icon: SendToBack }
]);
const sourceIsReady = computed(() => {
  if (sourceKind.value === 'article') return /^\d+$/.test(selectedArticleId.value);
  if (sourceKind.value === 'public_url') return sourceUrl.value.trim().length > 0;
  return content.value.trim().length > 0;
});
const canAnalyze = computed(() => Boolean(siteId.value && focusKeyword.value.trim() && sourceIsReady.value));
const runIsPending = computed(() => result.value ? ['queued', 'running'].includes(result.value.run.status) : false);
const hasPendingSuggestion = computed(() => result.value?.suggestions.some((suggestion) => suggestion.status === 'queued') ?? false);
const hasPendingWork = computed(() => runIsPending.value || hasPendingSuggestion.value);
const hasBlockedClaims = computed(() => result.value?.claims.some((claim) => claim.verificationStatus === 'source_required') ?? false);
const hasApprovedSuggestion = computed(() => result.value?.suggestions.some((suggestion) => suggestion.status === 'approved') ?? false);
const canCreateRewrite = computed(() => Boolean(result.value && !runIsPending.value && !isCreatingRewrite.value));
const activeStepIndex = computed(() => {
  if (!result.value) return 0;
  if (!hasApprovedSuggestion.value) return 1;
  if (!selectedImageDirection.value) return 2;
  return 3;
});

function rewriteScopeKey(scope: ContentRewriteScope) {
  return scope === 'full_document' ? 'fullDocument' : scope;
}

function splitSecondaryKeywords() {
  return [...new Set(
    secondaryKeywords.value
      .split(/[，,\n]/)
      .map((keyword) => keyword.trim())
      .filter(Boolean)
  )].slice(0, 20);
}

function statusLabel(status: string, kind: 'run' | 'suggestion' | 'check' | 'claim') {
  const group = {
    run: 'runStatuses',
    suggestion: 'suggestionStatuses',
    check: 'checkStatuses',
    claim: 'claimStatuses'
  }[kind];
  const key = `contentOptimizer.${group}.${status}`;
  const translated = String(t(key));
  return translated === key ? status : translated;
}

function statusColor(status: string) {
  if (['completed', 'approved'].includes(status)) return 'success';
  if (['failed', 'dead_letter', 'blocked'].includes(status)) return 'error';
  if (['partial', 'draft', 'queued', 'running'].includes(status)) return 'warning';
  return 'default';
}

function stepState(index: number) {
  if (index < activeStepIndex.value) return 'complete';
  if (index === activeStepIndex.value) return 'active';
  return 'pending';
}

function canApproveSuggestion(suggestion: ContentRewriteSuggestion) {
  return suggestion.status === 'draft' && !suggestion.riskFlags.includes('SOURCE_REQUIRED') && !hasBlockedClaims.value;
}

function getErrorCode(error: unknown) {
  return error instanceof ApiError ? error.code ?? 'REQUEST_FAILED' : 'REQUEST_FAILED';
}

function syncSuggestionDrafts(details: ContentOptimizationDetail) {
  for (const suggestion of details.suggestions) {
    if (suggestionDrafts.value[suggestion.id] === undefined) {
      suggestionDrafts.value[suggestion.id] = suggestion.suggestedText ?? '';
    }
  }
}

function stopPolling() {
  if (pollingTimer !== null) {
    window.clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

function updatePolling() {
  if (!hasPendingWork.value) {
    stopPolling();
    return;
  }

  if (pollingTimer === null) {
    pollingTimer = window.setInterval(() => {
      void refreshResult(true);
    }, 2_500);
  }
}

async function refreshResult(silent = false) {
  if (!result.value) return;

  try {
    const details = await getContentOptimization(result.value.run.id);
    result.value = details;
    syncSuggestionDrafts(details);
    updatePolling();
  } catch (error) {
    if (!silent) errorCode.value = getErrorCode(error);
  }
}

async function loadArticles() {
  if (!siteId.value || articles.value.length > 0) return;

  isLoadingArticles.value = true;
  try {
    const response = await getSyncedArticles(siteId.value, { page: 1, pageSize: 100 });
    articles.value = response.articles;
  } catch (error) {
    errorCode.value = getErrorCode(error);
  } finally {
    isLoadingArticles.value = false;
  }
}

async function analyzeContent() {
  if (!canAnalyze.value) return;

  isSubmitting.value = true;
  errorCode.value = '';
  statusMessage.value = '';
  stopPolling();

  try {
    const input = {
      siteId: siteId.value,
      focusKeyword: focusKeyword.value.trim(),
      secondaryKeywords: splitSecondaryKeywords(),
      locale: locale.value,
      targetMarket: targetMarket.value.trim() || undefined,
      tone: String(t(`contentOptimizer.toneOptions.${toneKey.value}`)),
      audience: audience.value.trim() || undefined,
      funnelStage: String(t(`contentOptimizer.funnelOptions.${funnelStageKey.value}`))
    };
    const task = sourceKind.value === 'article'
      ? await createContentOptimization({ ...input, articleId: Number(selectedArticleId.value) })
      : sourceKind.value === 'public_url'
        ? await createContentOptimization({ ...input, sourceUrl: sourceUrl.value.trim() })
        : await createContentOptimization({ ...input, content: content.value.trim() });

    result.value = await getContentOptimization(task.runId);
    syncSuggestionDrafts(result.value);
    statusMessage.value = t('contentOptimizer.analysisQueued');
    updatePolling();
  } catch (error) {
    errorCode.value = getErrorCode(error);
  } finally {
    isSubmitting.value = false;
  }
}

async function generateRewrite() {
  if (!result.value || !canCreateRewrite.value) return;

  isCreatingRewrite.value = true;
  errorCode.value = '';
  statusMessage.value = '';

  try {
    await createContentRewrite(result.value.run.id, {
      scope: rewriteScope.value,
      selector: rewriteSelector.value.trim() || undefined
    });
    await refreshResult();
    statusMessage.value = t('contentOptimizer.rewriteQueued');
    updatePolling();
  } catch (error) {
    errorCode.value = getErrorCode(error);
  } finally {
    isCreatingRewrite.value = false;
  }
}

async function reviewSuggestion(suggestion: ContentRewriteSuggestion, status: 'approved' | 'rejected') {
  if (!result.value) return;

  activeSuggestionId.value = suggestion.id;
  errorCode.value = '';
  statusMessage.value = '';

  try {
    await updateContentRewriteSuggestion(result.value.run.id, suggestion.id, {
      status,
      suggestedText: suggestionDrafts.value[suggestion.id]?.trim() || undefined
    });
    await refreshResult();
  } catch (error) {
    errorCode.value = getErrorCode(error);
  } finally {
    activeSuggestionId.value = '';
  }
}

function openMediaWorkspace() {
  void router.push(getRoutePath('app-site-media-scoped', { siteId: siteId.value }));
}

function openLinksWorkspace() {
  void router.push(getRoutePath('app-site-links-scoped', { siteId: siteId.value }));
}

watch(sourceKind, (nextSourceKind) => {
  if (nextSourceKind === 'article') void loadArticles();
});

onMounted(() => {
  if (sourceKind.value === 'article') void loadArticles();
});

onUnmounted(stopPolling);
</script>

<template>
  <section class="page-section content-optimizer-workspace">
    <div class="page-heading content-editor-heading">
      <div>
        <span class="hero-eyebrow">{{ t('contentOptimizer.flowTitle') }}</span>
        <h2>{{ t('contentOptimizer.title') }}</h2>
        <p>{{ t('contentOptimizer.body') }}</p>
      </div>
      <a-tag v-if="result" :color="statusColor(result.run.status)">
        {{ statusLabel(result.run.status, 'run') }}
      </a-tag>
    </div>

    <ol class="content-editor-steps" :aria-label="t('contentOptimizer.flowTitle')">
      <li v-for="(step, index) in editorSteps" :key="step.key" :data-state="stepState(index)">
        <span class="content-editor-step-icon">
          <CheckCircle2 v-if="stepState(index) === 'complete'" :size="18" aria-hidden="true" />
          <component :is="step.icon" v-else :size="18" aria-hidden="true" />
        </span>
        <span>{{ step.label }}</span>
      </li>
    </ol>

    <a-alert v-if="errorCode" type="warning" show-icon :message="t(`contentOptimizer.errors.${errorCode}`)" />
    <a-alert v-else-if="statusMessage" type="info" show-icon :message="statusMessage" />

    <section class="content-panel content-editor-stage">
      <div class="panel-heading">
        <div>
          <h2>{{ t('contentOptimizer.sourceTitle') }}</h2>
          <span>{{ t('contentOptimizer.sourceHint') }}</span>
        </div>
        <FilePenLine :size="20" aria-hidden="true" />
      </div>

      <a-form layout="vertical" @submit.prevent="analyzeContent">
        <div class="editor-brief-grid">
          <a-form-item :label="t('contentOptimizer.source')"><a-select v-model:value="sourceKind" :options="sourceOptions" /></a-form-item>
          <a-form-item :label="t('contentOptimizer.focusKeyword')"><a-input v-model:value="focusKeyword" /></a-form-item>
          <a-form-item :label="t('contentOptimizer.secondaryKeywords')"><a-input v-model:value="secondaryKeywords" :placeholder="t('contentOptimizer.secondaryKeywordsHint')" /></a-form-item>
          <a-form-item :label="t('contentOptimizer.tone')"><a-select v-model:value="toneKey" :options="toneOptions" /></a-form-item>
          <a-form-item :label="t('contentOptimizer.audience')"><a-input v-model:value="audience" /></a-form-item>
          <a-form-item :label="t('contentOptimizer.locale')"><a-select v-model:value="locale" :options="localeOptions" /></a-form-item>
          <a-form-item :label="t('contentOptimizer.targetMarket')"><a-input v-model:value="targetMarket" /></a-form-item>
          <a-form-item :label="t('contentOptimizer.funnelStage')"><a-select v-model:value="funnelStageKey" :options="funnelOptions" /></a-form-item>
        </div>

        <a-form-item v-if="sourceKind === 'article'" :label="t('contentOptimizer.selectArticle')">
          <a-select v-model:value="selectedArticleId" :loading="isLoadingArticles" :options="articleOptions" />
        </a-form-item>
        <a-form-item v-else-if="sourceKind === 'public_url'" :label="t('contentOptimizer.sourceUrl')"><a-input v-model:value="sourceUrl" type="url" /></a-form-item>
        <a-form-item v-else :label="t('contentOptimizer.content')"><a-textarea v-model:value="content" :rows="12" /></a-form-item>

        <a-button type="primary" html-type="button" :loading="isSubmitting" :disabled="!canAnalyze" @click="analyzeContent">
          <template #icon><Sparkles :size="16" aria-hidden="true" /></template>
          {{ t('contentOptimizer.analyze') }}
        </a-button>
      </a-form>
    </section>

    <template v-if="result">
      <section class="content-panel content-editor-stage">
        <div class="panel-heading">
          <div>
            <h2>{{ t('contentOptimizer.analysisTitle') }}</h2>
            <span>{{ t('contentOptimizer.analysisHint') }}</span>
          </div>
          <div class="optimizer-score">
            <strong>{{ result.run.score ?? '—' }}</strong>
            <span>{{ t('contentOptimizer.score') }} · {{ t('contentOptimizer.confidence') }} {{ result.run.confidence ?? '—' }}</span>
          </div>
        </div>

        <a-table :data-source="result.scoreChecks" :pagination="false" row-key="code" size="small">
          <a-table-column key="dimension" data-index="dimension" :title="t('contentOptimizer.dimension')" />
          <a-table-column key="status" :title="t('contentOptimizer.status')"><template #default="{ record }"><a-tag :color="statusColor(record.status)">{{ statusLabel(record.status, 'check') }}</a-tag></template></a-table-column>
          <a-table-column key="recommendation" data-index="recommendation" :title="t('contentOptimizer.recommendation')" />
        </a-table>

        <div class="editor-rewrite-toolbar">
          <a-select v-model:value="rewriteScope" :options="rewriteScopeOptions" />
          <a-input v-model:value="rewriteSelector" :placeholder="t('contentOptimizer.selector')" />
          <a-button type="primary" :loading="isCreatingRewrite" :disabled="!canCreateRewrite" @click="generateRewrite">
            <template #icon><Sparkles :size="16" aria-hidden="true" /></template>
            {{ t('contentOptimizer.createRewrite') }}
          </a-button>
        </div>

        <div v-if="result.suggestions.length" class="editor-suggestion-list">
          <section v-for="suggestion in result.suggestions" :key="suggestion.id" class="editor-suggestion">
            <div class="editor-suggestion-heading">
              <strong>{{ t(`contentOptimizer.rewriteScopeOptions.${rewriteScopeKey(suggestion.scope)}`) }}</strong>
              <a-tag :color="statusColor(suggestion.status)">{{ statusLabel(suggestion.status, 'suggestion') }}</a-tag>
            </div>
            <div class="editor-diff-grid">
              <div><span>{{ t('contentOptimizer.original') }}</span><pre>{{ suggestion.beforeText }}</pre></div>
              <div>
                <span>{{ t('contentOptimizer.suggestion') }}</span>
                <a-textarea v-model:value="suggestionDrafts[suggestion.id]" :disabled="suggestion.status !== 'draft'" :rows="8" />
              </div>
            </div>
            <div class="action-row">
              <a-tag v-if="suggestion.riskFlags.includes('SOURCE_REQUIRED')" color="error">{{ t('contentOptimizer.sourceRequired') }}</a-tag>
              <a-button v-if="canApproveSuggestion(suggestion)" type="primary" :loading="activeSuggestionId === suggestion.id" @click="reviewSuggestion(suggestion, 'approved')">{{ t('contentOptimizer.approve') }}</a-button>
              <a-button v-if="suggestion.status === 'draft' || suggestion.status === 'blocked'" :loading="activeSuggestionId === suggestion.id" @click="reviewSuggestion(suggestion, 'rejected')">{{ t('contentOptimizer.reject') }}</a-button>
            </div>
          </section>
        </div>
      </section>

      <section class="content-panel content-editor-stage">
        <div class="panel-heading"><div><h2>{{ t('contentOptimizer.claimsTitle') }}</h2><span>{{ t('contentOptimizer.claimsHint') }}</span></div></div>
        <ul v-if="result.claims.length" class="editor-claim-list">
          <li v-for="claim in result.claims" :key="claim.id">
            <div>
              <strong>{{ claim.claimText }}</strong>
              <a v-if="claim.sourceUrl" :href="claim.sourceUrl" target="_blank" rel="noreferrer">{{ claim.sourceUrl }}</a>
              <span v-else>{{ t('contentOptimizer.noSource') }}</span>
            </div>
            <a-tag :color="claim.verificationStatus === 'source_required' ? 'error' : 'default'">{{ statusLabel(claim.verificationStatus, 'claim') }}</a-tag>
          </li>
        </ul>
        <p v-else class="panel-note">{{ t('contentOptimizer.noClaims') }}</p>
      </section>

      <section class="content-panel content-editor-stage editor-handoff-stage">
        <div><h2>{{ t('contentOptimizer.imageTitle') }}</h2><p>{{ t('contentOptimizer.imageBody') }}</p></div>
        <div class="editor-handoff-actions">
          <a-select v-model:value="selectedImageDirection" :options="imageDirectionOptions" :placeholder="t('contentOptimizer.imageDirection')" />
          <a-button @click="openMediaWorkspace"><template #icon><ImagePlus :size="16" aria-hidden="true" /></template>{{ t('contentOptimizer.openMedia') }}</a-button>
        </div>
      </section>

      <section class="content-panel content-editor-stage editor-handoff-stage">
        <div><h2>{{ t('contentOptimizer.linkTitle') }}</h2><p>{{ t('contentOptimizer.linkBody') }}</p></div>
        <a-button @click="openLinksWorkspace">
          <template #icon><Link2 :size="16" aria-hidden="true" /></template>
          {{ t('contentOptimizer.openLinks') }}
          <ArrowRight :size="16" aria-hidden="true" />
        </a-button>
      </section>

      <section class="content-panel content-editor-stage editor-handoff-stage editor-publish-stage">
        <div><h2>{{ t('contentOptimizer.publishTitle') }}</h2><p>{{ hasApprovedSuggestion ? t('contentOptimizer.publishReady') : t('contentOptimizer.publishBody') }}</p></div>
        <a-button type="primary" disabled><template #icon><SendToBack :size="16" aria-hidden="true" /></template>{{ t('contentOptimizer.publishDisabled') }}</a-button>
      </section>
    </template>
  </section>
</template>

<style scoped>
.content-editor-heading { align-items: center; }
.content-editor-heading h2 { margin: 10px 0 0; }
.content-editor-stage h2, .editor-handoff-stage p { margin: 0; }
.content-editor-steps { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin: 0; padding: 0; list-style: none; }
.content-editor-steps li { display: flex; align-items: center; gap: 9px; min-height: 58px; border-top: 3px solid var(--color-border); color: var(--color-ink-muted); font-size: 13px; font-weight: 750; padding: 10px 4px; }
.content-editor-steps li[data-state='active'] { border-color: var(--color-brand-primary); color: var(--color-brand-primary-dark); }
.content-editor-steps li[data-state='complete'] { border-color: var(--color-brand-accent); color: var(--color-ink); }
.content-editor-step-icon { display: grid; flex: 0 0 32px; width: 32px; height: 32px; place-items: center; border: 1px solid currentcolor; border-radius: 7px; }
.content-editor-stage { display: grid; gap: 20px; }
.content-editor-stage > .panel-heading > div { display: grid; gap: 5px; }
.editor-brief-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0 16px; }
.optimizer-score { display: grid; justify-items: end; gap: 3px; }
.optimizer-score strong { font-family: ui-monospace, 'SFMono-Regular', 'SF Mono', monospace; font-size: 34px; }
.optimizer-score span { color: var(--color-muted); font-size: 12px; }
.editor-rewrite-toolbar, .editor-handoff-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; border-top: 1px solid var(--color-border); padding-top: 18px; }
.editor-rewrite-toolbar .ant-select, .editor-handoff-actions .ant-select { min-width: 190px; }
.editor-rewrite-toolbar .ant-input { flex: 1 1 240px; }
.editor-suggestion-list { display: grid; border-top: 1px solid var(--color-border); }
.editor-suggestion { display: grid; gap: 16px; border-bottom: 1px solid var(--color-border); padding: 20px 0; }
.editor-suggestion-heading, .editor-claim-list li, .editor-handoff-stage { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.editor-diff-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.editor-diff-grid > div { display: grid; gap: 8px; min-width: 0; }
.editor-diff-grid > div > span { color: var(--color-ink-muted); font-size: 12px; font-weight: 800; }
.editor-diff-grid pre { min-height: 176px; max-height: 300px; overflow: auto; border: 1px solid var(--color-border); background: var(--color-surface-soft); color: var(--color-ink); font: inherit; line-height: 1.6; margin: 0; padding: 12px; white-space: pre-wrap; }
.editor-claim-list { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
.editor-claim-list li { align-items: flex-start; border-bottom: 1px solid var(--color-border); padding-bottom: 12px; }
.editor-claim-list li > div { display: grid; gap: 5px; min-width: 0; }
.editor-claim-list a, .editor-claim-list span { color: var(--color-muted); font-size: 12px; overflow-wrap: anywhere; }
.editor-handoff-stage > div { display: grid; gap: 7px; max-width: 780px; }
.editor-handoff-stage p { color: var(--color-muted); line-height: 1.65; }
.editor-publish-stage { border-color: color-mix(in srgb, var(--color-brand-accent) 52%, var(--color-border)); }
@media (max-width: 1080px) { .editor-brief-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .content-editor-steps { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 760px) { .content-editor-heading, .editor-handoff-stage, .editor-suggestion-heading { align-items: flex-start; flex-direction: column; } .content-editor-steps, .editor-brief-grid, .editor-diff-grid { grid-template-columns: 1fr; } .optimizer-score { justify-items: start; } .editor-handoff-actions, .editor-handoff-actions .ant-select, .editor-handoff-actions .ant-btn { width: 100%; } }
</style>
