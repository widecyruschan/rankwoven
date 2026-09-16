export type BillingPlanStatus = 'active' | 'contact_only' | 'archived';
export type BillingSubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired';

export interface BillingPlan {
  planKey: string;
  version: number;
  billingInterval: 'month' | 'year';
  sortRank: number;
  displayName: string;
  description: string;
  currency: string;
  unitAmount?: number;
  status: BillingPlanStatus;
  features: string[];
  limits: Record<string, number>;
  checkoutAvailable: boolean;
}

export interface BillingSubscription {
  planKey: string;
  planVersion: number;
  status: BillingSubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  cancelAt?: string;
}

export interface BillingUsage {
  featureKey: string;
  used: number;
  limit: number;
  remaining: number;
  period: string;
}

export interface BillingUsageSummary {
  reservedUnits: number;
  activeReservedUnits: number;
  finalizedUnits: number;
  releasedUnits: number;
  reservedCost: number;
  finalizedCost: number;
  releasedCost: number;
}

export interface BillingSubscriptionState {
  subscription?: BillingSubscription;
  currentPlan?: BillingPlan;
  plans: BillingPlan[];
  usage: BillingUsage[];
  usageSummary: BillingUsageSummary;
  providerConfigured: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3011';
const authStorageKey = 'rankwoven_auth_session';

function getStoredToken() {
  const rawValue = localStorage.getItem(authStorageKey);
  if (!rawValue) return '';
  try {
    const parsed = JSON.parse(rawValue) as { token?: unknown };
    return typeof parsed.token === 'string' ? parsed.token : '';
  } catch {
    return '';
  }
}

function createIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `rw-billing-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function requestApi<T>(path: string, init?: RequestInit) {
  const token = getStoredToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers
    }
  });
  const body = await response.json() as ApiResponse<T>;
  if (!response.ok || !body.success) throw new Error(body.message || 'API request failed');
  return body.data;
}

export async function getBillingSubscription() {
  return requestApi<BillingSubscriptionState>('/api/v1/billing/subscription');
}

export async function createUpgradePreview(planKey: string) {
  return requestApi<{
    previewToken: string;
    targetPlan: BillingPlan;
    immediateAmount?: number;
    nextPeriodAmount?: number;
    currency: string;
    expiresAt: string;
  }>('/api/v1/billing/upgrade-previews', {
    method: 'POST',
    body: JSON.stringify({ planKey })
  });
}

export async function createCheckoutSession(planKey: string) {
  return requestApi<{ checkoutUrl: string }>('/api/v1/billing/checkout-sessions', {
    method: 'POST',
    headers: { 'Idempotency-Key': createIdempotencyKey() },
    body: JSON.stringify({ planKey })
  });
}

export async function confirmSubscriptionUpgrade(planKey: string, previewToken: string) {
  return requestApi<{ checkoutUrl: string }>('/api/v1/billing/subscription/upgrades', {
    method: 'POST',
    headers: { 'Idempotency-Key': createIdempotencyKey() },
    body: JSON.stringify({ planKey, previewToken })
  });
}

export async function cancelAutoRenewal() {
  return requestApi<{ subscription: BillingSubscription }>('/api/v1/billing/subscription/cancel-renewal', {
    method: 'POST',
    headers: { 'Idempotency-Key': createIdempotencyKey() },
    body: JSON.stringify({})
  });
}

export async function resumeAutoRenewal() {
  return requestApi<{ subscription: BillingSubscription }>('/api/v1/billing/subscription/resume-renewal', {
    method: 'POST',
    headers: { 'Idempotency-Key': createIdempotencyKey() },
    body: JSON.stringify({})
  });
}

export async function createCustomerPortalSession() {
  return requestApi<{ portalUrl: string }>('/api/v1/billing/customer-portal-sessions', {
    method: 'POST',
    headers: { 'Idempotency-Key': createIdempotencyKey() },
    body: JSON.stringify({})
  });
}

export async function createUsageCsvExport() {
  return requestApi<{ report: { id: string }; downloadUrl: string }>('/api/v1/report-exports', {
    method: 'POST',
    body: JSON.stringify({ reportType: 'usage_csv' })
  });
}

export async function downloadUsageCsv(downloadUrl: string) {
  const token = getStoredToken();
  const response = await fetch(`${apiBaseUrl}${downloadUrl}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'API request failed' })) as { message?: string };
    throw new Error(body.message || 'API request failed');
  }
  return response.blob();
}
