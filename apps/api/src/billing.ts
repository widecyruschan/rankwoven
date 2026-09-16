import { createHash, randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { Pool, type QueryResultRow } from 'pg';
import Stripe from 'stripe';
import { z } from 'zod';
import type { EntitlementAssignment, Phase2Repository, Phase2UsageSummary } from '@aieo/ai-providers';
import type { AuthService } from './auth';
import { apiConfig } from './config';
import { createRequestContext, getRouteKey, readIdempotency, requireRole, sendIdempotencyError } from './phase2Routes';

export type BillingPlanStatus = 'active' | 'contact_only' | 'archived';
export type BillingSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired';
export type BillingChangeType = 'checkout' | 'upgrade_preview' | 'upgrade' | 'cancel_renewal' | 'resume_renewal' | 'portal';
export type BillingChangeStatus = 'pending' | 'completed' | 'failed' | 'expired';
export type BillingWebhookStatus = 'received' | 'processed' | 'ignored' | 'failed';
export type ReportExportType = 'usage_csv';

export interface BillingPlan {
  id: string;
  planKey: string;
  version: number;
  billingInterval: 'month' | 'year';
  sortRank: number;
  displayName: string;
  description: string;
  currency: string;
  unitAmount?: number;
  provider: 'stripe';
  providerPriceRef?: string;
  status: BillingPlanStatus;
  features: string[];
  limits: Record<string, number>;
  effectiveAt: string;
}

export interface BillingSubscription {
  id: string;
  workspaceId: string;
  provider: 'stripe';
  externalCustomerId: string;
  externalSubscriptionId: string;
  planKey: string;
  planVersion: number;
  status: BillingSubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  cancelAt?: string;
  providerUpdatedAt: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingChangeRequest {
  id: string;
  workspaceId: string;
  subscriptionId?: string;
  actorId: string;
  changeType: BillingChangeType;
  fromPlanKey?: string;
  toPlanKey?: string;
  idempotencyKey: string;
  providerRef?: string;
  previewTokenHash?: string;
  previewAmount?: number;
  currency?: string;
  status: BillingChangeStatus;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingWebhookEvent {
  id: string;
  provider: 'stripe';
  externalEventId: string;
  eventType: string;
  payloadHash: string;
  providerCreatedAt: string;
  status: BillingWebhookStatus;
  errorCode?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportExport {
  id: string;
  workspaceId: string;
  createdBy: string;
  reportType: ReportExportType;
  filters: Record<string, unknown>;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'expired';
  storageRef?: string;
  expiresAt?: string;
  errorCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingSubscriptionSnapshot {
  externalCustomerId: string;
  externalSubscriptionId: string;
  priceRef: string;
  status: BillingSubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  cancelAt?: string;
  providerUpdatedAt: string;
  endedAt?: string;
}

export interface BillingWebhookNotification {
  externalEventId: string;
  eventType: string;
  providerCreatedAt: string;
  workspaceId?: string;
  externalSubscriptionId?: string;
  payloadHash: string;
}

export interface BillingUpgradePreview {
  immediateAmount?: number;
  nextPeriodAmount?: number;
  currency: string;
  expiresAt: string;
}

export interface BillingProvider {
  isConfigured(): boolean;
  getPriceRef(planKey: string): string | undefined;
  createCheckout(input: {
    workspaceId: string;
    email: string;
    plan: BillingPlan;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionId: string; url: string }>;
  createUpgradePreview(input: {
    subscription: BillingSubscription;
    plan: BillingPlan;
  }): Promise<BillingUpgradePreview>;
  createUpgradePortal(input: {
    subscription: BillingSubscription;
    plan: BillingPlan;
    returnUrl: string;
  }): Promise<{ sessionId: string; url: string }>;
  setCancelAtPeriodEnd(input: {
    subscription: BillingSubscription;
    cancelAtPeriodEnd: boolean;
  }): Promise<BillingSubscriptionSnapshot>;
  createCustomerPortal(input: {
    subscription: BillingSubscription;
    returnUrl: string;
  }): Promise<{ sessionId: string; url: string }>;
  verifyWebhook(rawBody: string, signature: string): BillingWebhookNotification;
  retrieveSubscription(externalSubscriptionId: string): Promise<BillingSubscriptionSnapshot>;
}

export interface BillingRepository {
  listPlans(): Promise<BillingPlan[]>;
  findPlan(planKey: string): Promise<BillingPlan | undefined>;
  getSubscription(workspaceId: string): Promise<BillingSubscription | undefined>;
  getSubscriptionByExternalId(externalSubscriptionId: string): Promise<BillingSubscription | undefined>;
  createChangeRequest(input: Omit<BillingChangeRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<BillingChangeRequest>;
  findPreviewRequest(workspaceId: string, previewTokenHash: string): Promise<BillingChangeRequest | undefined>;
  applySubscriptionSnapshot(input: {
    workspaceId: string;
    plan: BillingPlan;
    snapshot: BillingSubscriptionSnapshot;
  }): Promise<{ subscription: BillingSubscription; applied: boolean }>;
  recordWebhookEvent(input: Omit<BillingWebhookEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ event: BillingWebhookEvent; isNew: boolean }>;
  updateWebhookEvent(externalEventId: string, input: Pick<BillingWebhookEvent, 'status' | 'errorCode' | 'processedAt'>): Promise<BillingWebhookEvent | undefined>;
  createReportExport(input: Omit<ReportExport, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportExport>;
  findReportExport(workspaceId: string, exportId: string): Promise<ReportExport | undefined>;
  close?(): Promise<void>;
}

export class BillingProviderError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

const billingPlanKeys = ['starter', 'growth', 'agency', 'enterprise'] as const;
const billingPlanKeySchema = z.enum(billingPlanKeys);
const upgradePreviewSchema = z.object({ planKey: billingPlanKeySchema });
const upgradeSchema = z.object({ planKey: billingPlanKeySchema, previewToken: z.string().trim().min(20).max(200) });
const reportExportSchema = z.object({ reportType: z.literal('usage_csv') });
const reportExportParamsSchema = z.object({ exportId: z.string().uuid() });

function toIso(value: Date | string | number | null | undefined) {
  if (value === null || value === undefined) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function toDate(value: string | undefined) {
  return value ? new Date(value) : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asLimits(value: unknown) {
  const source = asRecord(value) ?? {};
  return Object.fromEntries(
    Object.entries(source).flatMap(([key, item]) => {
      const numeric = Number(item);
      return Number.isFinite(numeric) && numeric >= 0 ? [[key, numeric]] : [];
    })
  );
}

function shouldKeepPlanEntitlements(status: BillingSubscriptionStatus) {
  return status === 'active' || status === 'trialing' || status === 'past_due';
}

function mapPlanRow(row: QueryResultRow): BillingPlan {
  return {
    id: row.id,
    planKey: row.plan_key,
    version: Number(row.version),
    billingInterval: row.billing_interval,
    sortRank: Number(row.sort_rank),
    displayName: row.display_name,
    description: row.description ?? '',
    currency: row.currency,
    unitAmount: row.unit_amount === null || row.unit_amount === undefined ? undefined : Number(row.unit_amount),
    provider: 'stripe',
    providerPriceRef: row.provider_price_ref ?? undefined,
    status: row.status,
    features: asStringArray(row.features),
    limits: asLimits(row.limits),
    effectiveAt: toIso(row.effective_at) ?? ''
  };
}

function mapSubscriptionRow(row: QueryResultRow): BillingSubscription {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    provider: 'stripe',
    externalCustomerId: row.external_customer_id,
    externalSubscriptionId: row.external_subscription_id,
    planKey: row.plan_key,
    planVersion: Number(row.plan_version),
    status: row.status,
    currentPeriodStart: toIso(row.current_period_start),
    currentPeriodEnd: toIso(row.current_period_end),
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    cancelAt: toIso(row.cancel_at),
    providerUpdatedAt: toIso(row.provider_updated_at) ?? '',
    endedAt: toIso(row.ended_at),
    createdAt: toIso(row.created_at) ?? '',
    updatedAt: toIso(row.updated_at) ?? ''
  };
}

function mapChangeRequestRow(row: QueryResultRow): BillingChangeRequest {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    subscriptionId: row.subscription_id ?? undefined,
    actorId: row.actor_id,
    changeType: row.change_type,
    fromPlanKey: row.from_plan_key ?? undefined,
    toPlanKey: row.to_plan_key ?? undefined,
    idempotencyKey: row.idempotency_key,
    providerRef: row.provider_ref ?? undefined,
    previewTokenHash: row.preview_token_hash ?? undefined,
    previewAmount: row.preview_amount === null || row.preview_amount === undefined ? undefined : Number(row.preview_amount),
    currency: row.currency ?? undefined,
    status: row.status,
    expiresAt: toIso(row.expires_at),
    createdAt: toIso(row.created_at) ?? '',
    updatedAt: toIso(row.updated_at) ?? ''
  };
}

function mapWebhookEventRow(row: QueryResultRow): BillingWebhookEvent {
  return {
    id: row.id,
    provider: 'stripe',
    externalEventId: row.external_event_id,
    eventType: row.event_type,
    payloadHash: row.payload_hash,
    providerCreatedAt: toIso(row.provider_created_at) ?? '',
    status: row.status,
    errorCode: row.error_code ?? undefined,
    processedAt: toIso(row.processed_at),
    createdAt: toIso(row.created_at) ?? '',
    updatedAt: toIso(row.updated_at) ?? ''
  };
}

function mapReportExportRow(row: QueryResultRow): ReportExport {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    createdBy: row.created_by,
    reportType: row.report_type,
    filters: asRecord(row.filters) ?? {},
    status: row.status,
    storageRef: row.storage_ref ?? undefined,
    expiresAt: toIso(row.expires_at),
    errorCode: row.error_code ?? undefined,
    createdAt: toIso(row.created_at) ?? '',
    updatedAt: toIso(row.updated_at) ?? ''
  };
}

function defaultPlans(): BillingPlan[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'billing-plan-starter-v1', planKey: 'starter', version: 1, billingInterval: 'month', sortRank: 1,
      displayName: 'Starter', description: 'For one owner validating SEO optimization on a small site.', currency: 'usd', unitAmount: 2900,
      provider: 'stripe', status: 'active', features: ['human_review', 'site_audit'],
      limits: { sites: 1, keyword_research: 200, content_optimization: 200 }, effectiveAt: now
    },
    {
      id: 'billing-plan-growth-v1', planKey: 'growth', version: 1, billingInterval: 'month', sortRank: 2,
      displayName: 'Growth', description: 'For growing content teams that need more audits and image workflows.', currency: 'usd', unitAmount: 7900,
      provider: 'stripe', status: 'active', features: ['human_review', 'site_audit', 'media_optimization'],
      limits: { sites: 5, keyword_research: 2000, content_optimization: 50 }, effectiveAt: now
    },
    {
      id: 'billing-plan-agency-v1', planKey: 'agency', version: 1, billingInterval: 'month', sortRank: 3,
      displayName: 'Agency', description: 'For agencies managing multiple client websites and review queues.', currency: 'usd', unitAmount: 19900,
      provider: 'stripe', status: 'active', features: ['human_review', 'site_audit', 'media_optimization', 'team_access', 'report_exports'],
      limits: { sites: 20, keyword_research: 20000, content_optimization: 500 }, effectiveAt: now
    },
    {
      id: 'billing-plan-enterprise-v1', planKey: 'enterprise', version: 1, billingInterval: 'month', sortRank: 4,
      displayName: 'Enterprise', description: 'For larger teams with provider controls, security, and service commitments.', currency: 'usd',
      provider: 'stripe', status: 'contact_only', features: ['custom_limits', 'priority_support', 'provider_controls'], limits: {}, effectiveAt: now
    }
  ];
}

function getStripePriceRefs() {
  return {
    starter: apiConfig.STRIPE_PRICE_STARTER_MONTHLY,
    growth: apiConfig.STRIPE_PRICE_GROWTH_MONTHLY,
    agency: apiConfig.STRIPE_PRICE_AGENCY_MONTHLY
  } as const;
}

function getPriceRef(planKey: string) {
  const priceRefs = getStripePriceRefs();
  return priceRefs[planKey as keyof typeof priceRefs];
}

function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function getExternalId(value: unknown) {
  if (typeof value === 'string') return value;
  const object = asRecord(value);
  return typeof object?.id === 'string' ? object.id : undefined;
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function toStripeStatus(value: string): BillingSubscriptionStatus {
  const statuses: BillingSubscriptionStatus[] = ['active', 'trialing', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired'];
  return statuses.includes(value as BillingSubscriptionStatus) ? value as BillingSubscriptionStatus : 'incomplete';
}

export class StripeBillingProvider implements BillingProvider {
  private readonly client?: Stripe;

  constructor(private readonly options: {
    secretKey?: string;
    webhookSecret?: string;
    portalConfigurationId?: string;
  }) {
    if (options.secretKey) this.client = new Stripe(options.secretKey);
  }

  isConfigured() {
    return Boolean(this.client && this.options.webhookSecret);
  }

  getPriceRef(planKey: string) {
    return getPriceRef(planKey);
  }

  private getClient() {
    if (!this.client) throw new BillingProviderError('BILLING_PROVIDER_UNAVAILABLE');
    return this.client;
  }

  private getWebhookSecret() {
    if (!this.options.webhookSecret) throw new BillingProviderError('BILLING_PROVIDER_UNAVAILABLE');
    return this.options.webhookSecret;
  }

  private requirePlanPrice(plan: BillingPlan) {
    const priceRef = this.getPriceRef(plan.planKey);
    if (!priceRef) throw new BillingProviderError('BILLING_PROVIDER_UNAVAILABLE');
    return priceRef;
  }

  private toSnapshot(subscription: Stripe.Subscription): BillingSubscriptionSnapshot {
    const item = subscription.items.data[0];
    if (!item?.price.id) throw new BillingProviderError('PLAN_NOT_FOUND');
    return {
      externalCustomerId: getExternalId(subscription.customer) ?? '',
      externalSubscriptionId: subscription.id,
      priceRef: item.price.id,
      status: toStripeStatus(subscription.status),
      currentPeriodStart: toIso(item.current_period_start * 1000),
      currentPeriodEnd: toIso(item.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelAt: subscription.cancel_at ? toIso(subscription.cancel_at * 1000) : undefined,
      providerUpdatedAt: toIso(subscription.created * 1000) ?? new Date().toISOString(),
      endedAt: subscription.ended_at ? toIso(subscription.ended_at * 1000) : undefined
    };
  }

  async createCheckout(input: { workspaceId: string; email: string; plan: BillingPlan; successUrl: string; cancelUrl: string }) {
    const session = await this.getClient().checkout.sessions.create({
      mode: 'subscription',
      customer_email: input.email,
      client_reference_id: input.workspaceId,
      line_items: [{ price: this.requirePlanPrice(input.plan), quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: { workspaceId: input.workspaceId, planKey: input.plan.planKey }
    });
    if (!session.url) throw new BillingProviderError('BILLING_PROVIDER_UNAVAILABLE');
    return { sessionId: session.id, url: session.url };
  }

  async createUpgradePreview(input: { subscription: BillingSubscription; plan: BillingPlan }) {
    const subscription = await this.getClient().subscriptions.retrieve(input.subscription.externalSubscriptionId);
    const item = subscription.items.data[0];
    if (!item) throw new BillingProviderError('SUBSCRIPTION_NOT_ACTIVE');
    const preview = await this.getClient().invoices.createPreview({
      customer: input.subscription.externalCustomerId,
      subscription: subscription.id,
      subscription_details: { items: [{ id: item.id, price: this.requirePlanPrice(input.plan) }] }
    });
    return {
      immediateAmount: preview.amount_due ?? undefined,
      nextPeriodAmount: input.plan.unitAmount,
      currency: preview.currency ?? input.plan.currency,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString()
    };
  }

  async createUpgradePortal(input: { subscription: BillingSubscription; plan: BillingPlan; returnUrl: string }) {
    const subscription = await this.getClient().subscriptions.retrieve(input.subscription.externalSubscriptionId);
    const item = subscription.items.data[0];
    if (!item) throw new BillingProviderError('SUBSCRIPTION_NOT_ACTIVE');
    const session = await this.getClient().billingPortal.sessions.create({
      customer: input.subscription.externalCustomerId,
      return_url: input.returnUrl,
      ...(this.options.portalConfigurationId ? { configuration: this.options.portalConfigurationId } : {}),
      flow_data: {
        type: 'subscription_update_confirm',
        subscription_update_confirm: {
          subscription: subscription.id,
          items: [{ id: item.id, price: this.requirePlanPrice(input.plan), quantity: item.quantity ?? 1 }]
        },
        after_completion: { type: 'redirect', redirect: { return_url: input.returnUrl } }
      }
    });
    return { sessionId: session.id, url: session.url };
  }

  async setCancelAtPeriodEnd(input: { subscription: BillingSubscription; cancelAtPeriodEnd: boolean }) {
    const subscription = await this.getClient().subscriptions.update(
      input.subscription.externalSubscriptionId,
      { cancel_at_period_end: input.cancelAtPeriodEnd }
    );
    return { ...this.toSnapshot(subscription), providerUpdatedAt: new Date().toISOString() };
  }

  async createCustomerPortal(input: { subscription: BillingSubscription; returnUrl: string }) {
    const session = await this.getClient().billingPortal.sessions.create({
      customer: input.subscription.externalCustomerId,
      return_url: input.returnUrl,
      ...(this.options.portalConfigurationId ? { configuration: this.options.portalConfigurationId } : {})
    });
    return { sessionId: session.id, url: session.url };
  }

  verifyWebhook(rawPayload: string, signature: string): BillingWebhookNotification {
    const event = this.getClient().webhooks.constructEvent(rawPayload, signature, this.getWebhookSecret());
    const object = asRecord(event.data.object);
    return {
      externalEventId: event.id,
      eventType: event.type,
      providerCreatedAt: toIso(event.created * 1000) ?? new Date().toISOString(),
      workspaceId: getString(object?.client_reference_id) ?? getString(asRecord(object?.metadata)?.workspaceId),
      externalSubscriptionId: getExternalId(object?.subscription) ?? (event.type.startsWith('customer.subscription.') ? getExternalId(object) : undefined),
      payloadHash: createHash('sha256').update(rawPayload).digest('hex')
    };
  }

  async retrieveSubscription(externalSubscriptionId: string) {
    const subscription = await this.getClient().subscriptions.retrieve(externalSubscriptionId);
    return this.toSnapshot(subscription);
  }
}

export function createStripeBillingProvider() {
  return new StripeBillingProvider({
    secretKey: apiConfig.STRIPE_SECRET_KEY,
    webhookSecret: apiConfig.STRIPE_WEBHOOK_SECRET,
    portalConfigurationId: apiConfig.STRIPE_BILLING_PORTAL_CONFIGURATION_ID
  });
}

class InMemoryBillingRepository implements BillingRepository {
  private readonly plans = defaultPlans();
  private readonly subscriptions = new Map<string, BillingSubscription>();
  private readonly changes = new Map<string, BillingChangeRequest>();
  private readonly webhooks = new Map<string, BillingWebhookEvent>();
  private readonly exports = new Map<string, ReportExport>();
  private readonly managedEntitlements = new Map<string, EntitlementAssignment[]>();

  constructor(private readonly phase2Repository: Phase2Repository) {}

  async listPlans() {
    return this.plans.map((plan) => ({ ...plan, features: [...plan.features], limits: { ...plan.limits } }));
  }

  async findPlan(planKey: string) {
    return this.plans.find((plan) => plan.planKey === planKey && plan.status !== 'archived');
  }

  async getSubscription(workspaceId: string) {
    return this.subscriptions.get(workspaceId);
  }

  async getSubscriptionByExternalId(externalSubscriptionId: string) {
    return [...this.subscriptions.values()].find((subscription) => subscription.externalSubscriptionId === externalSubscriptionId);
  }

  async createChangeRequest(input: Omit<BillingChangeRequest, 'id' | 'createdAt' | 'updatedAt'>) {
    const timestamp = new Date().toISOString();
    const record: BillingChangeRequest = { id: randomUUID(), createdAt: timestamp, updatedAt: timestamp, ...input };
    this.changes.set(record.id, record);
    return record;
  }

  async findPreviewRequest(workspaceId: string, previewTokenHash: string) {
    const now = Date.now();
    return [...this.changes.values()].find((change) =>
      change.workspaceId === workspaceId &&
      change.changeType === 'upgrade_preview' &&
      change.previewTokenHash === previewTokenHash &&
      change.status === 'completed' &&
      (!change.expiresAt || new Date(change.expiresAt).getTime() > now)
    );
  }

  async applySubscriptionSnapshot(input: { workspaceId: string; plan: BillingPlan; snapshot: BillingSubscriptionSnapshot }) {
    const existing = this.subscriptions.get(input.workspaceId);
    if (existing && new Date(existing.providerUpdatedAt) > new Date(input.snapshot.providerUpdatedAt)) {
      return { subscription: existing, applied: false };
    }
    const timestamp = new Date().toISOString();
    const subscription: BillingSubscription = {
      id: existing?.id ?? randomUUID(),
      workspaceId: input.workspaceId,
      provider: 'stripe',
      externalCustomerId: input.snapshot.externalCustomerId,
      externalSubscriptionId: input.snapshot.externalSubscriptionId,
      planKey: input.plan.planKey,
      planVersion: input.plan.version,
      status: input.snapshot.status,
      currentPeriodStart: input.snapshot.currentPeriodStart,
      currentPeriodEnd: input.snapshot.currentPeriodEnd,
      cancelAtPeriodEnd: input.snapshot.cancelAtPeriodEnd,
      cancelAt: input.snapshot.cancelAt,
      providerUpdatedAt: input.snapshot.providerUpdatedAt,
      endedAt: input.snapshot.endedAt,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    };
    this.subscriptions.set(input.workspaceId, subscription);

    const previousEntitlements = this.managedEntitlements.get(input.workspaceId) ?? [];
    await Promise.all(previousEntitlements.map((entitlement) => this.phase2Repository.saveEntitlement({
      ...entitlement,
      expiresAt: timestamp
    })));

    if (shouldKeepPlanEntitlements(subscription.status)) {
      const source = `stripe:${subscription.externalSubscriptionId}:${input.plan.version}`;
      const nextEntitlements = await Promise.all(
        Object.entries(input.plan.limits)
          .filter(([featureKey]) => featureKey === 'keyword_research' || featureKey === 'content_optimization')
          .map(([featureKey, limitValue]) => this.phase2Repository.saveEntitlement({
            id: randomUUID(),
            workspaceId: input.workspaceId,
            featureKey,
            limitValue,
            period: 'monthly',
            source,
            effectiveAt: timestamp,
            expiresAt: subscription.currentPeriodEnd
          }))
      );
      this.managedEntitlements.set(input.workspaceId, nextEntitlements);
    } else {
      this.managedEntitlements.set(input.workspaceId, []);
    }
    return { subscription, applied: true };
  }

  async recordWebhookEvent(input: Omit<BillingWebhookEvent, 'id' | 'createdAt' | 'updatedAt'>) {
    const existing = this.webhooks.get(`${input.provider}:${input.externalEventId}`);
    if (existing) return { event: existing, isNew: false };
    const timestamp = new Date().toISOString();
    const event: BillingWebhookEvent = { id: randomUUID(), createdAt: timestamp, updatedAt: timestamp, ...input };
    this.webhooks.set(`${event.provider}:${event.externalEventId}`, event);
    return { event, isNew: true };
  }

  async updateWebhookEvent(externalEventId: string, input: Pick<BillingWebhookEvent, 'status' | 'errorCode' | 'processedAt'>) {
    const key = `stripe:${externalEventId}`;
    const existing = this.webhooks.get(key);
    if (!existing) return undefined;
    const updated = { ...existing, ...input, updatedAt: new Date().toISOString() };
    this.webhooks.set(key, updated);
    return updated;
  }

  async createReportExport(input: Omit<ReportExport, 'id' | 'createdAt' | 'updatedAt'>) {
    const timestamp = new Date().toISOString();
    const record: ReportExport = { id: randomUUID(), createdAt: timestamp, updatedAt: timestamp, ...input };
    this.exports.set(record.id, record);
    return record;
  }

  async findReportExport(workspaceId: string, exportId: string) {
    const record = this.exports.get(exportId);
    return record?.workspaceId === workspaceId ? record : undefined;
  }
}

class PostgresBillingRepository implements BillingRepository {
  constructor(private readonly pool: Pool) {}

  async listPlans() {
    const result = await this.pool.query(
      `SELECT * FROM billing_plan_catalog WHERE status <> 'archived' ORDER BY sort_rank ASC, effective_at DESC`
    );
    return result.rows.map(mapPlanRow);
  }

  async findPlan(planKey: string) {
    const result = await this.pool.query(
      `SELECT * FROM billing_plan_catalog WHERE plan_key = $1 AND status <> 'archived' ORDER BY version DESC LIMIT 1`,
      [planKey]
    );
    return result.rows[0] ? mapPlanRow(result.rows[0]) : undefined;
  }

  async getSubscription(workspaceId: string) {
    const result = await this.pool.query(`SELECT * FROM subscriptions WHERE workspace_id = $1 AND provider = 'stripe' LIMIT 1`, [workspaceId]);
    return result.rows[0] ? mapSubscriptionRow(result.rows[0]) : undefined;
  }

  async getSubscriptionByExternalId(externalSubscriptionId: string) {
    const result = await this.pool.query(
      `SELECT * FROM subscriptions WHERE provider = 'stripe' AND external_subscription_id = $1 LIMIT 1`,
      [externalSubscriptionId]
    );
    return result.rows[0] ? mapSubscriptionRow(result.rows[0]) : undefined;
  }

  async createChangeRequest(input: Omit<BillingChangeRequest, 'id' | 'createdAt' | 'updatedAt'>) {
    const result = await this.pool.query(
      `INSERT INTO subscription_change_requests (
         id, workspace_id, subscription_id, actor_id, change_type, from_plan_key, to_plan_key,
         idempotency_key, provider_ref, preview_token_hash, preview_amount, currency, status, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        randomUUID(), input.workspaceId, input.subscriptionId ?? null, input.actorId, input.changeType,
        input.fromPlanKey ?? null, input.toPlanKey ?? null, input.idempotencyKey, input.providerRef ?? null,
        input.previewTokenHash ?? null, input.previewAmount ?? null, input.currency ?? null, input.status,
        input.expiresAt ?? null
      ]
    );
    return mapChangeRequestRow(result.rows[0]);
  }

  async findPreviewRequest(workspaceId: string, previewTokenHash: string) {
    const result = await this.pool.query(
      `SELECT * FROM subscription_change_requests
       WHERE workspace_id = $1 AND change_type = 'upgrade_preview' AND preview_token_hash = $2
         AND status = 'completed' AND (expires_at IS NULL OR expires_at > now())
       ORDER BY created_at DESC LIMIT 1`,
      [workspaceId, previewTokenHash]
    );
    return result.rows[0] ? mapChangeRequestRow(result.rows[0]) : undefined;
  }

  async applySubscriptionSnapshot(input: { workspaceId: string; plan: BillingPlan; snapshot: BillingSubscriptionSnapshot }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const existingResult = await client.query(
        `SELECT * FROM subscriptions WHERE workspace_id = $1 AND provider = 'stripe' FOR UPDATE`,
        [input.workspaceId]
      );
      const existing = existingResult.rows[0] ? mapSubscriptionRow(existingResult.rows[0]) : undefined;
      if (existing && new Date(existing.providerUpdatedAt) > new Date(input.snapshot.providerUpdatedAt)) {
        await client.query('COMMIT');
        return { subscription: existing, applied: false };
      }

      const result = await client.query(
        `INSERT INTO subscriptions (
           id, workspace_id, provider, external_customer_id, external_subscription_id, plan_key, plan_version,
           status, current_period_start, current_period_end, cancel_at_period_end, cancel_at, provider_updated_at, ended_at
         ) VALUES ($1, $2, 'stripe', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (workspace_id, provider) DO UPDATE SET
           external_customer_id = EXCLUDED.external_customer_id,
           external_subscription_id = EXCLUDED.external_subscription_id,
           plan_key = EXCLUDED.plan_key,
           plan_version = EXCLUDED.plan_version,
           status = EXCLUDED.status,
           current_period_start = EXCLUDED.current_period_start,
           current_period_end = EXCLUDED.current_period_end,
           cancel_at_period_end = EXCLUDED.cancel_at_period_end,
           cancel_at = EXCLUDED.cancel_at,
           provider_updated_at = EXCLUDED.provider_updated_at,
           ended_at = EXCLUDED.ended_at,
           updated_at = now()
         RETURNING *`,
        [
          existing?.id ?? randomUUID(), input.workspaceId, input.snapshot.externalCustomerId,
          input.snapshot.externalSubscriptionId, input.plan.planKey, input.plan.version, input.snapshot.status,
          toDate(input.snapshot.currentPeriodStart) ?? null, toDate(input.snapshot.currentPeriodEnd) ?? null,
          input.snapshot.cancelAtPeriodEnd, toDate(input.snapshot.cancelAt) ?? null,
          toDate(input.snapshot.providerUpdatedAt) ?? new Date(), toDate(input.snapshot.endedAt) ?? null
        ]
      );
      const subscription = mapSubscriptionRow(result.rows[0]);
      await client.query(
        `UPDATE entitlement_assignments
         SET expires_at = now()
         WHERE workspace_id = $1 AND source LIKE 'stripe:%' AND (expires_at IS NULL OR expires_at > now())`,
        [input.workspaceId]
      );
      if (shouldKeepPlanEntitlements(subscription.status)) {
        const source = `stripe:${subscription.externalSubscriptionId}:${input.plan.version}`;
        for (const [featureKey, limitValue] of Object.entries(input.plan.limits)) {
          if (featureKey !== 'keyword_research' && featureKey !== 'content_optimization') continue;
          await client.query(
            `INSERT INTO entitlement_assignments (
               id, workspace_id, feature_key, limit_value, period, source, effective_at, expires_at
             ) VALUES ($1, $2, $3, $4, 'monthly', $5, now(), $6)`,
            [randomUUID(), input.workspaceId, featureKey, limitValue, source, toDate(subscription.currentPeriodEnd) ?? null]
          );
        }
      }
      await client.query('COMMIT');
      return { subscription, applied: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async recordWebhookEvent(input: Omit<BillingWebhookEvent, 'id' | 'createdAt' | 'updatedAt'>) {
    const inserted = await this.pool.query(
      `INSERT INTO billing_webhook_events (
         id, provider, external_event_id, event_type, payload_hash, provider_created_at, status, error_code, processed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (provider, external_event_id) DO NOTHING
       RETURNING *`,
      [
        randomUUID(), input.provider, input.externalEventId, input.eventType, input.payloadHash,
        toDate(input.providerCreatedAt) ?? new Date(), input.status, input.errorCode ?? null, toDate(input.processedAt) ?? null
      ]
    );
    if (inserted.rows[0]) return { event: mapWebhookEventRow(inserted.rows[0]), isNew: true };
    const existing = await this.pool.query(
      `SELECT * FROM billing_webhook_events WHERE provider = $1 AND external_event_id = $2 LIMIT 1`,
      [input.provider, input.externalEventId]
    );
    if (!existing.rows[0]) throw new BillingProviderError('BILLING_PROVIDER_UNAVAILABLE');
    return { event: mapWebhookEventRow(existing.rows[0]), isNew: false };
  }

  async updateWebhookEvent(externalEventId: string, input: Pick<BillingWebhookEvent, 'status' | 'errorCode' | 'processedAt'>) {
    const result = await this.pool.query(
      `UPDATE billing_webhook_events
       SET status = $2, error_code = $3, processed_at = $4, updated_at = now()
       WHERE provider = 'stripe' AND external_event_id = $1
       RETURNING *`,
      [externalEventId, input.status, input.errorCode ?? null, toDate(input.processedAt) ?? null]
    );
    return result.rows[0] ? mapWebhookEventRow(result.rows[0]) : undefined;
  }

  async createReportExport(input: Omit<ReportExport, 'id' | 'createdAt' | 'updatedAt'>) {
    const result = await this.pool.query(
      `INSERT INTO report_exports (
         id, workspace_id, created_by, report_type, filters, status, storage_ref, expires_at, error_code
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        randomUUID(), input.workspaceId, input.createdBy, input.reportType, JSON.stringify(input.filters), input.status,
        input.storageRef ?? null, toDate(input.expiresAt) ?? null, input.errorCode ?? null
      ]
    );
    return mapReportExportRow(result.rows[0]);
  }

  async findReportExport(workspaceId: string, exportId: string) {
    const result = await this.pool.query(`SELECT * FROM report_exports WHERE id = $1 AND workspace_id = $2 LIMIT 1`, [exportId, workspaceId]);
    return result.rows[0] ? mapReportExportRow(result.rows[0]) : undefined;
  }

  async close() {
    await this.pool.end();
  }
}

export function createInMemoryBillingRepository(phase2Repository: Phase2Repository) {
  return new InMemoryBillingRepository(phase2Repository);
}

export function createDefaultBillingRepository(databaseUrl: string | undefined, phase2Repository: Phase2Repository): BillingRepository {
  return databaseUrl ? new PostgresBillingRepository(new Pool({ connectionString: databaseUrl })) : createInMemoryBillingRepository(phase2Repository);
}

function getCurrentPlan(subscription: BillingSubscription | undefined, plans: BillingPlan[]) {
  if (subscription) return plans.find((plan) => plan.planKey === subscription.planKey && plan.version === subscription.planVersion);
  return plans.find((plan) => plan.planKey === 'starter');
}

function getBillingReturnUrl(pathSuffix = '') {
  const base = new URL(apiConfig.APP_BASE_URL);
  if (base.protocol !== 'https:' && apiConfig.NODE_ENV === 'production') throw new BillingProviderError('BILLING_PROVIDER_UNAVAILABLE');
  return new URL(`/app/billing${pathSuffix}`, base).toString();
}

function getSubscriptionPublicView(input: {
  subscription?: BillingSubscription;
  currentPlan?: BillingPlan;
  plans: BillingPlan[];
  provider: BillingProvider;
  usage: Array<{ featureKey: string; used: number; limit: number; remaining: number; period: string }>;
  usageSummary: Phase2UsageSummary;
}) {
  return {
    subscription: input.subscription ? {
      planKey: input.subscription.planKey,
      planVersion: input.subscription.planVersion,
      status: input.subscription.status,
      currentPeriodStart: input.subscription.currentPeriodStart,
      currentPeriodEnd: input.subscription.currentPeriodEnd,
      cancelAtPeriodEnd: input.subscription.cancelAtPeriodEnd,
      cancelAt: input.subscription.cancelAt
    } : undefined,
    currentPlan: input.currentPlan ? publicPlan(input.currentPlan, input.provider) : undefined,
    plans: input.plans.map((plan) => publicPlan(plan, input.provider)),
    usage: input.usage,
    usageSummary: input.usageSummary,
    providerConfigured: input.provider.isConfigured()
  };
}

function publicPlan(plan: BillingPlan, provider: BillingProvider) {
  return {
    planKey: plan.planKey,
    version: plan.version,
    billingInterval: plan.billingInterval,
    sortRank: plan.sortRank,
    displayName: plan.displayName,
    description: plan.description,
    currency: plan.currency,
    unitAmount: plan.unitAmount,
    status: plan.status,
    features: plan.features,
    limits: plan.limits,
    checkoutAvailable: plan.status === 'active' && Boolean(provider.getPriceRef(plan.planKey)) && provider.isConfigured()
  };
}

async function buildUsageDetails(phase2Repository: Phase2Repository, workspaceId: string, plan: BillingPlan | undefined) {
  const entries = await Promise.all(
    Object.entries(plan?.limits ?? {})
      .filter(([featureKey]) => featureKey === 'keyword_research' || featureKey === 'content_optimization')
      .map(async ([featureKey, planLimit]) => {
        const entitlement = await phase2Repository.findActiveEntitlement(workspaceId, featureKey);
        const limit = entitlement?.limitValue ?? planLimit;
        const period = entitlement?.period ?? 'monthly';
        const used = await phase2Repository.getPeriodUsageUnits(workspaceId, featureKey, period);
        return { featureKey, used, limit, remaining: Math.max(0, limit - used), period };
      })
  );
  return entries;
}

function sendBillingError(reply: FastifyReply, error: unknown) {
  const code = error instanceof BillingProviderError ? error.code : 'BILLING_PROVIDER_UNAVAILABLE';
  const statusCode = code === 'PLAN_NOT_FOUND' ? 404 : code === 'PLAN_NOT_UPGRADE' || code === 'SUBSCRIPTION_NOT_ACTIVE' || code === 'PREVIEW_EXPIRED' ? 409 : 503;
  return reply.status(statusCode).send({
    success: false,
    message: code === 'BILLING_PROVIDER_UNAVAILABLE' ? '付款服務暫未配置或不可用' : '帳單操作無法完成',
    error: { code }
  });
}

function assertUpgradeTarget(currentPlan: BillingPlan | undefined, targetPlan: BillingPlan | undefined): BillingPlan {
  if (!targetPlan || targetPlan.status !== 'active') throw new BillingProviderError('PLAN_NOT_FOUND');
  if (currentPlan && targetPlan.sortRank <= currentPlan.sortRank) throw new BillingProviderError('PLAN_NOT_UPGRADE');
  return targetPlan;
}

function createUsageCsv(workspaceId: string, usageSummary: Phase2UsageSummary) {
  const rows = [
    ['workspace_id', 'reserved_units', 'active_reserved_units', 'finalized_units', 'released_units', 'reserved_cost', 'finalized_cost', 'released_cost'],
    [
      workspaceId,
      usageSummary.reservedUnits,
      usageSummary.activeReservedUnits,
      usageSummary.finalizedUnits,
      usageSummary.releasedUnits,
      usageSummary.reservedCost,
      usageSummary.finalizedCost,
      usageSummary.releasedCost
    ]
  ];
  return rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function registerBillingRoutes(
  app: FastifyInstance,
  repository: BillingRepository,
  phase2Repository: Phase2Repository,
  authService: AuthService,
  provider: BillingProvider = createStripeBillingProvider()
) {
  app.after((error) => {
    if (error) throw error;
    registerBillingRouteHandlers(app, repository, phase2Repository, authService, provider);
  });
}

function registerBillingRouteHandlers(
  app: FastifyInstance,
  repository: BillingRepository,
  phase2Repository: Phase2Repository,
  authService: AuthService,
  provider: BillingProvider
) {
  app.get('/api/v1/billing/plans', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'viewer');
    if (!user) return reply;
    const plans = await repository.listPlans();
    return { success: true, message: '操作成功', data: { plans: plans.map((plan) => publicPlan(plan, provider)), providerConfigured: provider.isConfigured() } };
  });

  app.get('/api/v1/billing/subscription', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'viewer');
    if (!user) return reply;
    const [plans, subscription, usageSummary] = await Promise.all([
      repository.listPlans(), repository.getSubscription(user.workspaceId), phase2Repository.getUsageSummary(user.workspaceId)
    ]);
    const currentPlan = getCurrentPlan(subscription, plans);
    const usage = await buildUsageDetails(phase2Repository, user.workspaceId, currentPlan);
    return { success: true, message: '操作成功', data: getSubscriptionPublicView({ subscription, currentPlan, plans, provider, usage, usageSummary }) };
  });

  app.post('/api/v1/billing/upgrade-previews', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'owner');
    if (!user) return reply;
    const body = upgradePreviewSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, message: '套餐輸入無效', error: { code: 'VALIDATION_ERROR', details: body.error.issues } });
    const [plans, subscription] = await Promise.all([repository.listPlans(), repository.getSubscription(user.workspaceId)]);
    const currentPlan = getCurrentPlan(subscription, plans);
    const targetPlan = plans.find((plan) => plan.planKey === body.data.planKey);
    try {
      const target = assertUpgradeTarget(currentPlan, targetPlan);
      const preview = subscription
        ? await provider.createUpgradePreview({ subscription, plan: target })
        : {
            immediateAmount: target.unitAmount,
            nextPeriodAmount: target.unitAmount,
            currency: target.currency,
            expiresAt: new Date(Date.now() + 15 * 60_000).toISOString()
          };
      const previewToken = randomUUID();
      await repository.createChangeRequest({
        workspaceId: user.workspaceId,
        subscriptionId: subscription?.id,
        actorId: user.id,
        changeType: 'upgrade_preview',
        fromPlanKey: currentPlan?.planKey,
        toPlanKey: target.planKey,
        idempotencyKey: `preview:${previewToken}`,
        previewTokenHash: hashToken(previewToken),
        previewAmount: preview.immediateAmount,
        currency: preview.currency,
        status: 'completed',
        expiresAt: preview.expiresAt
      });
      return { success: true, message: '升級費用已更新', data: { previewToken, targetPlan: publicPlan(target, provider), ...preview } };
    } catch (error) {
      return sendBillingError(reply, error);
    }
  });

  app.post('/api/v1/billing/checkout-sessions', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'owner');
    if (!user) return reply;
    const body = upgradePreviewSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, message: '套餐輸入無效', error: { code: 'VALIDATION_ERROR', details: body.error.issues } });
    const context = createRequestContext(request, user);
    const idempotency = await readIdempotency(phase2Repository, request, context);
    if (sendIdempotencyError(reply, idempotency)) return reply;
    if (idempotency.existing) return reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
    const [plans, subscription] = await Promise.all([repository.listPlans(), repository.getSubscription(user.workspaceId)]);
    const currentPlan = getCurrentPlan(subscription, plans);
    const targetPlan = plans.find((plan) => plan.planKey === body.data.planKey);
    try {
      const target = assertUpgradeTarget(currentPlan, targetPlan);
      if (subscription && shouldKeepPlanEntitlements(subscription.status)) throw new BillingProviderError('SUBSCRIPTION_NOT_ACTIVE');
      const session = await provider.createCheckout({
        workspaceId: user.workspaceId,
        email: user.email,
        plan: target,
        successUrl: getBillingReturnUrl('?checkout=success&session_id={CHECKOUT_SESSION_ID}'),
        cancelUrl: getBillingReturnUrl('?checkout=cancelled')
      });
      await repository.createChangeRequest({
        workspaceId: user.workspaceId,
        actorId: user.id,
        changeType: 'checkout',
        fromPlanKey: currentPlan?.planKey,
        toPlanKey: target.planKey,
        idempotencyKey: idempotency.key,
        providerRef: session.sessionId,
        status: 'pending'
      });
      const response = { success: true, message: '付款頁已建立，正在等待付款確認', data: { checkoutUrl: session.url } };
      await phase2Repository.saveIdempotency({ workspaceId: user.workspaceId, method: request.method, route: getRouteKey(request), key: idempotency.key, requestHash: idempotency.requestHash, statusCode: 201, responseBody: response, createdAt: new Date().toISOString() });
      return reply.status(201).send(response);
    } catch (error) {
      return sendBillingError(reply, error);
    }
  });

  app.post('/api/v1/billing/subscription/upgrades', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'owner');
    if (!user) return reply;
    const body = upgradeSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, message: '升級輸入無效', error: { code: 'VALIDATION_ERROR', details: body.error.issues } });
    const context = createRequestContext(request, user);
    const idempotency = await readIdempotency(phase2Repository, request, context);
    if (sendIdempotencyError(reply, idempotency)) return reply;
    if (idempotency.existing) return reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
    const [plans, subscription, preview] = await Promise.all([
      repository.listPlans(), repository.getSubscription(user.workspaceId), repository.findPreviewRequest(user.workspaceId, hashToken(body.data.previewToken))
    ]);
    const currentPlan = getCurrentPlan(subscription, plans);
    const targetPlan = plans.find((plan) => plan.planKey === body.data.planKey);
    try {
      const target = assertUpgradeTarget(currentPlan, targetPlan);
      if (!subscription || !shouldKeepPlanEntitlements(subscription.status)) throw new BillingProviderError('SUBSCRIPTION_NOT_ACTIVE');
      if (!preview || preview.toPlanKey !== target.planKey) throw new BillingProviderError('PREVIEW_EXPIRED');
      const session = await provider.createUpgradePortal({ subscription, plan: target, returnUrl: getBillingReturnUrl('?upgrade=pending') });
      await repository.createChangeRequest({
        workspaceId: user.workspaceId,
        subscriptionId: subscription.id,
        actorId: user.id,
        changeType: 'upgrade',
        fromPlanKey: currentPlan?.planKey,
        toPlanKey: target.planKey,
        idempotencyKey: idempotency.key,
        providerRef: session.sessionId,
        status: 'pending',
        expiresAt: preview.expiresAt
      });
      const response = { success: true, message: '升級確認頁已建立，正在等待付款確認', data: { checkoutUrl: session.url } };
      await phase2Repository.saveIdempotency({ workspaceId: user.workspaceId, method: request.method, route: getRouteKey(request), key: idempotency.key, requestHash: idempotency.requestHash, statusCode: 201, responseBody: response, createdAt: new Date().toISOString() });
      return reply.status(201).send(response);
    } catch (error) {
      return sendBillingError(reply, error);
    }
  });

  app.post('/api/v1/billing/subscription/cancel-renewal', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'owner');
    if (!user) return reply;
    const context = createRequestContext(request, user);
    const idempotency = await readIdempotency(phase2Repository, request, context);
    if (sendIdempotencyError(reply, idempotency)) return reply;
    if (idempotency.existing) return reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
    const subscription = await repository.getSubscription(user.workspaceId);
    try {
      if (!subscription || !shouldKeepPlanEntitlements(subscription.status)) throw new BillingProviderError('SUBSCRIPTION_NOT_ACTIVE');
      if (subscription.cancelAtPeriodEnd) throw new BillingProviderError('AUTO_RENEW_ALREADY_DISABLED');
      const snapshot = await provider.setCancelAtPeriodEnd({ subscription, cancelAtPeriodEnd: true });
      const plan = await repository.findPlan(subscription.planKey);
      if (!plan) throw new BillingProviderError('PLAN_NOT_FOUND');
      const applied = await repository.applySubscriptionSnapshot({ workspaceId: user.workspaceId, plan, snapshot });
      await repository.createChangeRequest({ workspaceId: user.workspaceId, subscriptionId: subscription.id, actorId: user.id, changeType: 'cancel_renewal', fromPlanKey: plan.planKey, idempotencyKey: idempotency.key, status: 'completed' });
      const response = { success: true, message: '已取消自動續費，當期權益將保留至週期結束', data: { subscription: applied.subscription } };
      await phase2Repository.saveIdempotency({ workspaceId: user.workspaceId, method: request.method, route: getRouteKey(request), key: idempotency.key, requestHash: idempotency.requestHash, statusCode: 200, responseBody: response, createdAt: new Date().toISOString() });
      return response;
    } catch (error) {
      return sendBillingError(reply, error);
    }
  });

  app.post('/api/v1/billing/subscription/resume-renewal', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'owner');
    if (!user) return reply;
    const context = createRequestContext(request, user);
    const idempotency = await readIdempotency(phase2Repository, request, context);
    if (sendIdempotencyError(reply, idempotency)) return reply;
    if (idempotency.existing) return reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
    const subscription = await repository.getSubscription(user.workspaceId);
    try {
      if (!subscription || !shouldKeepPlanEntitlements(subscription.status)) throw new BillingProviderError('SUBSCRIPTION_ALREADY_ENDED');
      if (!subscription.cancelAtPeriodEnd) throw new BillingProviderError('AUTO_RENEW_ALREADY_DISABLED');
      if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) <= new Date()) throw new BillingProviderError('SUBSCRIPTION_ALREADY_ENDED');
      const snapshot = await provider.setCancelAtPeriodEnd({ subscription, cancelAtPeriodEnd: false });
      const plan = await repository.findPlan(subscription.planKey);
      if (!plan) throw new BillingProviderError('PLAN_NOT_FOUND');
      const applied = await repository.applySubscriptionSnapshot({ workspaceId: user.workspaceId, plan, snapshot });
      await repository.createChangeRequest({ workspaceId: user.workspaceId, subscriptionId: subscription.id, actorId: user.id, changeType: 'resume_renewal', fromPlanKey: plan.planKey, idempotencyKey: idempotency.key, status: 'completed' });
      const response = { success: true, message: '已恢復自動續費', data: { subscription: applied.subscription } };
      await phase2Repository.saveIdempotency({ workspaceId: user.workspaceId, method: request.method, route: getRouteKey(request), key: idempotency.key, requestHash: idempotency.requestHash, statusCode: 200, responseBody: response, createdAt: new Date().toISOString() });
      return response;
    } catch (error) {
      return sendBillingError(reply, error);
    }
  });

  app.post('/api/v1/billing/customer-portal-sessions', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'owner');
    if (!user) return reply;
    const context = createRequestContext(request, user);
    const idempotency = await readIdempotency(phase2Repository, request, context);
    if (sendIdempotencyError(reply, idempotency)) return reply;
    if (idempotency.existing) return reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
    const subscription = await repository.getSubscription(user.workspaceId);
    try {
      if (!subscription) throw new BillingProviderError('SUBSCRIPTION_NOT_ACTIVE');
      const session = await provider.createCustomerPortal({ subscription, returnUrl: getBillingReturnUrl() });
      await repository.createChangeRequest({ workspaceId: user.workspaceId, subscriptionId: subscription.id, actorId: user.id, changeType: 'portal', idempotencyKey: idempotency.key, providerRef: session.sessionId, status: 'completed' });
      const response = { success: true, message: '付款管理頁已建立', data: { portalUrl: session.url } };
      await phase2Repository.saveIdempotency({ workspaceId: user.workspaceId, method: request.method, route: getRouteKey(request), key: idempotency.key, requestHash: idempotency.requestHash, statusCode: 201, responseBody: response, createdAt: new Date().toISOString() });
      return reply.status(201).send(response);
    } catch (error) {
      return sendBillingError(reply, error);
    }
  });

  app.post('/api/v1/webhooks/stripe', { config: { rawBody: true } }, async (request, reply) => {
    const signatureHeader = request.headers['stripe-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const payload = typeof request.rawBody === 'string' ? request.rawBody : request.rawBody?.toString('utf8');
    if (!signature || !payload) return reply.status(400).send({ success: false, message: 'Webhook 簽名或內容無效', error: { code: 'WEBHOOK_SIGNATURE_INVALID' } });
    let notification: BillingWebhookNotification;
    try {
      notification = provider.verifyWebhook(payload, signature);
    } catch {
      return reply.status(400).send({ success: false, message: 'Webhook 簽名無效', error: { code: 'WEBHOOK_SIGNATURE_INVALID' } });
    }
    const recorded = await repository.recordWebhookEvent({
      provider: 'stripe', externalEventId: notification.externalEventId, eventType: notification.eventType,
      payloadHash: notification.payloadHash, providerCreatedAt: notification.providerCreatedAt, status: 'received'
    });
    if (!recorded.isNew && recorded.event.status === 'processed') return { success: true, message: 'Webhook 已處理', data: { replayed: true } };
    try {
      if (!notification.externalSubscriptionId) {
        await repository.updateWebhookEvent(notification.externalEventId, { status: 'ignored', processedAt: new Date().toISOString() });
        return { success: true, message: 'Webhook 已忽略', data: { replayed: !recorded.isNew } };
      }
      const snapshot = {
        ...(await provider.retrieveSubscription(notification.externalSubscriptionId)),
        providerUpdatedAt: notification.providerCreatedAt
      };
      const plans = await repository.listPlans();
      const plan = plans.find((item) => provider.getPriceRef(item.planKey) === snapshot.priceRef);
      if (!plan) throw new BillingProviderError('PLAN_NOT_FOUND');
      const existing = await repository.getSubscriptionByExternalId(snapshot.externalSubscriptionId);
      const workspaceId = notification.workspaceId ?? existing?.workspaceId;
      if (!workspaceId) {
        await repository.updateWebhookEvent(notification.externalEventId, { status: 'ignored', processedAt: new Date().toISOString() });
        return { success: true, message: 'Webhook 已忽略', data: { replayed: !recorded.isNew } };
      }
      const applied = await repository.applySubscriptionSnapshot({ workspaceId, plan, snapshot });
      await repository.updateWebhookEvent(notification.externalEventId, { status: applied.applied ? 'processed' : 'ignored', processedAt: new Date().toISOString() });
      return { success: true, message: 'Webhook 已處理', data: { replayed: !recorded.isNew } };
    } catch (error) {
      const errorCode = error instanceof BillingProviderError ? error.code : 'BILLING_PROVIDER_UNAVAILABLE';
      await repository.updateWebhookEvent(notification.externalEventId, { status: 'failed', errorCode });
      return reply.status(500).send({ success: false, message: 'Webhook 處理失敗', error: { code: errorCode } });
    }
  });

  app.post('/api/v1/report-exports', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'editor');
    if (!user) return reply;
    const body = reportExportSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, message: '匯出類型無效', error: { code: 'VALIDATION_ERROR', details: body.error.issues } });
    const report = await repository.createReportExport({
      workspaceId: user.workspaceId,
      createdBy: user.id,
      reportType: body.data.reportType,
      filters: {},
      status: 'completed',
      storageRef: 'inline_usage_csv',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString()
    });
    return reply.status(201).send({ success: true, message: '用量報告已建立', data: { report, downloadUrl: `/api/v1/report-exports/${report.id}/download` } });
  });

  app.get('/api/v1/report-exports/:exportId', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'viewer');
    if (!user) return reply;
    const params = reportExportParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, message: '匯出識別碼無效', error: { code: 'VALIDATION_ERROR', details: params.error.issues } });
    const report = await repository.findReportExport(user.workspaceId, params.data.exportId);
    if (!report) return reply.status(404).send({ success: false, message: '找不到匯出報告', error: { code: 'WORKSPACE_RESOURCE_NOT_FOUND' } });
    return { success: true, message: '操作成功', data: { report, downloadUrl: report.status === 'completed' ? `/api/v1/report-exports/${report.id}/download` : undefined } };
  });

  app.get('/api/v1/report-exports/:exportId/download', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'viewer');
    if (!user) return reply;
    const params = reportExportParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, message: '匯出識別碼無效', error: { code: 'VALIDATION_ERROR', details: params.error.issues } });
    const report = await repository.findReportExport(user.workspaceId, params.data.exportId);
    if (!report) return reply.status(404).send({ success: false, message: '找不到匯出報告', error: { code: 'WORKSPACE_RESOURCE_NOT_FOUND' } });
    if (report.status !== 'completed' || !report.expiresAt || new Date(report.expiresAt) <= new Date()) return reply.status(410).send({ success: false, message: '匯出報告已過期', error: { code: 'REPORT_EXPORT_UNAVAILABLE' } });
    const usage = await phase2Repository.getUsageSummary(user.workspaceId);
    return reply
      .header('Content-Disposition', `attachment; filename="rankwoven-usage-${report.id}.csv"`)
      .type('text/csv; charset=utf-8')
      .send(createUsageCsv(user.workspaceId, usage));
  });
}
