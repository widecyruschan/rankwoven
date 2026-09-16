<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Modal } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import {
  cancelAutoRenewal,
  confirmSubscriptionUpgrade,
  createCheckoutSession,
  createCustomerPortalSession,
  createUpgradePreview,
  createUsageCsvExport,
  downloadUsageCsv,
  getBillingSubscription,
  resumeAutoRenewal,
  type BillingPlan,
  type BillingSubscriptionState
} from '../api/billing';
import { useAuthStore } from '../stores/auth';

const { t, locale } = useI18n();
const authStore = useAuthStore();
const state = ref<BillingSubscriptionState>();
const loading = ref(false);
const actionLoading = ref(false);
const exporting = ref(false);
const errorMessage = ref('');
const selectedPlan = ref<BillingPlan>();
const preview = ref<{
  previewToken: string;
  immediateAmount?: number;
  nextPeriodAmount?: number;
  currency: string;
  expiresAt: string;
}>();

const canManageBilling = computed(() => authStore.user?.role === 'owner');
const currentPlan = computed(() => state.value?.currentPlan);
const subscription = computed(() => state.value?.subscription);
const upgradePlans = computed(() =>
  (state.value?.plans ?? []).filter((plan) =>
    plan.status === 'active' && plan.sortRank > (currentPlan.value?.sortRank ?? 0)
  )
);

function formatDate(value?: string) {
  if (!value) return t('billing.notAvailable');
  return new Intl.DateTimeFormat(locale.value === 'zh-Hant' ? 'zh-Hant' : 'en', { dateStyle: 'medium' }).format(new Date(value));
}

function formatAmount(amount: number | undefined, currency = 'usd') {
  if (amount === undefined) return t('billing.customPricing');
  return new Intl.NumberFormat(locale.value === 'zh-Hant' ? 'zh-Hant' : 'en', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(amount / 100);
}

function formatFeature(featureKey: string) {
  const key = `billing.features.${featureKey}`;
  const translated = String(t(key));
  return translated === key ? featureKey : translated;
}

function subscriptionStatusColor(status?: string) {
  if (status === 'active' || status === 'trialing') return 'success';
  if (status === 'past_due' || status === 'incomplete') return 'warning';
  return 'default';
}

async function loadBilling() {
  loading.value = true;
  errorMessage.value = '';
  try {
    state.value = await getBillingSubscription();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('billing.loadFailed');
  } finally {
    loading.value = false;
  }
}

async function openUpgradePreview(plan: BillingPlan) {
  if (!canManageBilling.value) return;
  actionLoading.value = true;
  errorMessage.value = '';
  try {
    const result = await createUpgradePreview(plan.planKey);
    selectedPlan.value = plan;
    preview.value = result;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('billing.actionFailed');
  } finally {
    actionLoading.value = false;
  }
}

async function continueUpgrade() {
  if (!selectedPlan.value || !preview.value) return;
  actionLoading.value = true;
  errorMessage.value = '';
  try {
    const result = subscription.value
      ? await confirmSubscriptionUpgrade(selectedPlan.value.planKey, preview.value.previewToken)
      : await createCheckoutSession(selectedPlan.value.planKey);
    window.location.assign(result.checkoutUrl);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('billing.actionFailed');
  } finally {
    actionLoading.value = false;
  }
}

function cancelRenewal() {
  Modal.confirm({
    title: t('billing.cancelTitle'),
    content: subscription.value?.currentPeriodEnd
      ? t('billing.cancelDescription', { date: formatDate(subscription.value.currentPeriodEnd) })
      : t('billing.cancelDescriptionUnknown'),
    okText: t('billing.cancelAutoRenewal'),
    okType: 'danger',
    cancelText: t('common.cancel'),
    onOk: async () => {
      actionLoading.value = true;
      errorMessage.value = '';
      try {
        await cancelAutoRenewal();
        await loadBilling();
      } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : t('billing.actionFailed');
      } finally {
        actionLoading.value = false;
      }
    }
  });
}

async function resumeRenewal() {
  actionLoading.value = true;
  errorMessage.value = '';
  try {
    await resumeAutoRenewal();
    await loadBilling();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('billing.actionFailed');
  } finally {
    actionLoading.value = false;
  }
}

async function openCustomerPortal() {
  actionLoading.value = true;
  errorMessage.value = '';
  try {
    const result = await createCustomerPortalSession();
    window.location.assign(result.portalUrl);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('billing.actionFailed');
  } finally {
    actionLoading.value = false;
  }
}

async function exportUsage() {
  exporting.value = true;
  errorMessage.value = '';
  try {
    const result = await createUsageCsvExport();
    const blob = await downloadUsageCsv(result.downloadUrl);
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = 'rankwoven-usage.csv';
    anchor.click();
    window.URL.revokeObjectURL(objectUrl);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('billing.exportFailed');
  } finally {
    exporting.value = false;
  }
}

onMounted(() => {
  void loadBilling();
});
</script>

<template>
  <section class="billing-view">
    <header class="page-header">
      <div>
        <h2>{{ t('billing.title') }}</h2>
        <p>{{ t('billing.body') }}</p>
      </div>
      <div class="billing-header-actions">
        <a-button :loading="exporting" @click="exportUsage">{{ t('billing.exportUsage') }}</a-button>
        <a-button :loading="loading" @click="loadBilling">{{ t('billing.refresh') }}</a-button>
      </div>
    </header>

    <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage" />
    <a-alert v-else-if="state && !state.providerConfigured" type="warning" show-icon :message="t('billing.providerUnavailable')" />

    <a-spin v-if="loading && !state" />
    <template v-else-if="state">
      <section class="billing-summary-grid">
        <a-card class="billing-current-plan" size="small">
          <div class="plan-heading">
            <div>
              <span class="section-label">{{ t('billing.currentPlan') }}</span>
              <h3>{{ currentPlan?.displayName ?? t('billing.notAvailable') }}</h3>
            </div>
            <a-tag :color="subscriptionStatusColor(subscription?.status)">
              {{ subscription?.status ?? t('billing.starterAccess') }}
            </a-tag>
          </div>
          <p>{{ currentPlan?.description }}</p>
          <div v-if="subscription" class="subscription-details">
            <span>{{ subscription.cancelAtPeriodEnd ? t('billing.accessEnds') : t('billing.renewsOn') }}</span>
            <strong>{{ formatDate(subscription.currentPeriodEnd) }}</strong>
          </div>
          <a-alert
            v-if="subscription?.cancelAtPeriodEnd"
            class="renewal-alert"
            type="warning"
            show-icon
            :message="t('billing.cancelScheduled', { date: formatDate(subscription.currentPeriodEnd) })"
          />
          <div v-if="canManageBilling && subscription" class="subscription-actions">
            <a-button v-if="subscription.cancelAtPeriodEnd" type="primary" :loading="actionLoading" @click="resumeRenewal">
              {{ t('billing.resumeAutoRenewal') }}
            </a-button>
            <a-button v-else danger :loading="actionLoading" @click="cancelRenewal">
              {{ t('billing.cancelAutoRenewal') }}
            </a-button>
            <a-button :loading="actionLoading" @click="openCustomerPortal">{{ t('billing.managePayment') }}</a-button>
          </div>
          <p v-else-if="!canManageBilling" class="billing-note">{{ t('billing.ownerRequired') }}</p>
        </a-card>

        <a-card :title="t('billing.usageTitle')" size="small">
          <div v-for="item in state.usage" :key="item.featureKey" class="usage-item">
            <div class="usage-label">
              <span>{{ formatFeature(item.featureKey) }}</span>
              <strong>{{ item.used }} / {{ item.limit }}</strong>
            </div>
            <a-progress :percent="item.limit > 0 ? Math.min(100, Math.round((item.used / item.limit) * 100)) : 0" :show-info="false" />
            <small>{{ t('billing.remaining', { count: item.remaining }) }}</small>
          </div>
        </a-card>
      </section>

      <a-card v-if="preview && selectedPlan" class="upgrade-preview" size="small">
        <template #title>{{ t('billing.upgradePreview') }}</template>
        <div>
          <strong>{{ currentPlan?.displayName }} → {{ selectedPlan.displayName }}</strong>
          <p>{{ t('billing.dueNow') }}: {{ formatAmount(preview.immediateAmount, preview.currency) }}</p>
          <p>{{ t('billing.nextCycle') }}: {{ formatAmount(preview.nextPeriodAmount, preview.currency) }}</p>
          <p class="billing-note">{{ t('billing.confirmationNotice') }}</p>
        </div>
        <template #extra>
          <a-button type="primary" :loading="actionLoading" @click="continueUpgrade">{{ t('billing.continueToPayment') }}</a-button>
        </template>
      </a-card>

      <section class="plan-grid">
        <a-card v-for="plan in upgradePlans" :key="plan.planKey" class="billing-plan-card" :data-current="plan.planKey === currentPlan?.planKey" size="small">
          <template #title>{{ plan.displayName }}</template>
          <strong class="plan-price">{{ formatAmount(plan.unitAmount, plan.currency) }}<small>/{{ t('billing.month') }}</small></strong>
          <p>{{ plan.description }}</p>
          <ul class="plain-list">
            <li v-for="feature in plan.features" :key="feature">{{ formatFeature(feature) }}</li>
          </ul>
          <a-button
            v-if="plan.status === 'active'"
            type="primary"
            block
            :disabled="!canManageBilling || !state.providerConfigured"
            :loading="actionLoading && selectedPlan?.planKey === plan.planKey"
            @click="openUpgradePreview(plan)"
          >
            {{ t('billing.previewUpgrade') }}
          </a-button>
          <a-button v-else block disabled>{{ t('billing.contactSales') }}</a-button>
        </a-card>
      </section>
    </template>
  </section>
</template>

<style scoped>
.billing-view {
  display: grid;
  gap: 24px;
}

.page-header,
.billing-header-actions,
.plan-heading,
.subscription-actions,
.usage-label {
  display: flex;
  align-items: center;
}

.page-header {
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-header h2,
.plan-heading h3 {
  margin: 0;
}

.page-header p,
.billing-current-plan p,
.billing-note {
  color: var(--color-muted);
}

.page-header p {
  margin: 8px 0 0;
}

.billing-header-actions,
.subscription-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.billing-summary-grid,
.plan-grid {
  display: grid;
  gap: 16px;
}

.billing-summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.plan-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.billing-current-plan,
.billing-plan-card,
.upgrade-preview {
  border-radius: 8px;
}

.plan-heading,
.usage-label {
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-label,
.usage-item small,
.subscription-details span {
  color: var(--color-muted);
}

.billing-current-plan p {
  margin: 12px 0;
}

.subscription-details {
  display: grid;
  gap: 4px;
}

.renewal-alert {
  margin-top: 14px;
}

.subscription-actions {
  margin-top: 16px;
  justify-content: flex-start;
}

.usage-item + .usage-item {
  margin-top: 18px;
}

.usage-label {
  align-items: baseline;
  margin-bottom: 6px;
}

.usage-item small {
  display: block;
  margin-top: 5px;
}

.upgrade-preview :deep(.ant-card-head) {
  min-height: 50px;
}

.upgrade-preview p {
  margin: 6px 0;
}

.plan-price {
  display: block;
  font-size: 24px;
  color: var(--color-ink);
}

.plan-price small {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-muted);
}

.billing-plan-card p {
  min-height: 44px;
  color: var(--color-muted);
}

.billing-plan-card .plain-list {
  min-height: 92px;
}

@media (max-width: 860px) {
  .billing-summary-grid,
  .plan-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .page-header {
    display: grid;
  }

  .billing-header-actions {
    justify-content: flex-start;
  }
}
</style>
