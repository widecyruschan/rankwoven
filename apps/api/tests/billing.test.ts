import { describe, expect, it } from 'vitest';
import {
  createInMemoryPhase2Repository
} from '@aieo/ai-providers';
import {
  createInMemoryBillingRepository,
  type BillingPlan,
  type BillingProvider,
  type BillingSubscription,
  type BillingSubscriptionSnapshot,
  type BillingUpgradePreview,
  type BillingWebhookNotification
} from '../src/billing';
import type { AuthRepository, AuthUser } from '../src/auth';
import { createServer } from '../src/server';

const workspaceId = '00000000-0000-4000-8000-000000000001';

class TestBillingProvider implements BillingProvider {
  receivedWebhookBody = '';
  webhookEventId = 'evt_test_1';
  currentSnapshot: BillingSubscriptionSnapshot = {
    externalCustomerId: 'cus_test_1',
    externalSubscriptionId: 'sub_test_1',
    priceRef: 'price_growth',
    status: 'active',
    currentPeriodStart: '2026-09-01T00:00:00.000Z',
    currentPeriodEnd: '2026-10-01T00:00:00.000Z',
    cancelAtPeriodEnd: false,
    providerUpdatedAt: '2026-09-16T00:00:00.000Z'
  };

  isConfigured() {
    return true;
  }

  getPriceRef(planKey: string) {
    return ({ starter: 'price_starter', growth: 'price_growth', agency: 'price_agency' } as Record<string, string | undefined>)[planKey];
  }

  async createCheckout() {
    return { sessionId: 'cs_test_1', url: 'https://billing.example.test/checkout/cs_test_1' };
  }

  async createUpgradePreview(input: { subscription: BillingSubscription; plan: BillingPlan }): Promise<BillingUpgradePreview> {
    return {
      immediateAmount: input.plan.unitAmount,
      nextPeriodAmount: input.plan.unitAmount,
      currency: input.plan.currency,
      expiresAt: '2026-10-01T00:00:00.000Z'
    };
  }

  async createUpgradePortal() {
    return { sessionId: 'bps_test_1', url: 'https://billing.example.test/portal/bps_test_1' };
  }

  async setCancelAtPeriodEnd(input: { subscription: BillingSubscription; cancelAtPeriodEnd: boolean }) {
    this.currentSnapshot = { ...this.currentSnapshot, cancelAtPeriodEnd: input.cancelAtPeriodEnd, providerUpdatedAt: '2026-09-16T01:00:00.000Z' };
    return this.currentSnapshot;
  }

  async createCustomerPortal() {
    return { sessionId: 'bps_test_2', url: 'https://billing.example.test/portal/bps_test_2' };
  }

  verifyWebhook(rawBody: string, signature: string): BillingWebhookNotification {
    if (signature !== 'test-signature') throw new Error('invalid signature');
    this.receivedWebhookBody = rawBody;
    return {
      externalEventId: this.webhookEventId,
      eventType: 'checkout.session.completed',
      providerCreatedAt: '2026-09-16T00:00:00.000Z',
      workspaceId,
      externalSubscriptionId: this.currentSnapshot.externalSubscriptionId,
      payloadHash: 'a'.repeat(64)
    };
  }

  async retrieveSubscription() {
    return this.currentSnapshot;
  }
}

async function login(server: ReturnType<typeof createServer>) {
  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: 'demo@rankwoven.com', password: 'rankwoven' }
  });
  expect(response.statusCode).toBe(200);
  return response.json<{ data: { token: string } }>().data.token;
}

function createBillingServer() {
  const phase2Repository = createInMemoryPhase2Repository();
  const billingRepository = createInMemoryBillingRepository(phase2Repository);
  const provider = new TestBillingProvider();
  return {
    phase2Repository,
    billingRepository,
    provider,
    server: createServer({ phase2Repository, billingRepository, billingProvider: provider })
  };
}

function createViewerAuthRepository(): AuthRepository {
  const viewer: AuthUser = {
    id: '00000000-0000-4000-8000-000000000102',
    workspaceId,
    name: 'RankWoven Viewer',
    email: 'viewer@rankwoven.com',
    role: 'viewer'
  };
  return {
    async login(email) { return email === viewer.email ? viewer : undefined; },
    async findUser(userId) { return userId === viewer.id ? viewer : undefined; },
    async findUserByEmail(email) { return email === viewer.email ? viewer : undefined; },
    async register() { throw new Error('not implemented'); },
    async changePassword() { return false; },
    async storeResetToken() { return false; },
    async resetPassword() { return false; }
  };
}

async function getPlan(repository: Awaited<ReturnType<typeof createBillingServer>>['billingRepository'], planKey: string) {
  const plan = await repository.findPlan(planKey);
  if (!plan) throw new Error(`Missing plan: ${planKey}`);
  return plan;
}

describe('PH2-11 billing routes', () => {
  it('returns a server-side plan catalog and usage state without exposing provider secrets', async () => {
    const { server } = createBillingServer();
    const token = await login(server);
    const response = await server.inject({ method: 'GET', url: '/api/v1/billing/subscription', headers: { authorization: `Bearer ${token}` } });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        currentPlan: { planKey: 'starter' },
        plans: expect.arrayContaining([expect.objectContaining({ planKey: 'starter' }), expect.objectContaining({ planKey: 'growth' })]),
        usage: expect.any(Array),
        providerConfigured: true
      }
    });
    expect(JSON.stringify(response.json())).not.toContain('STRIPE_SECRET_KEY');
    await server.close();
  });

  it('does not open entitlements from checkout creation and replays the same idempotent response', async () => {
    const { server, billingRepository } = createBillingServer();
    const token = await login(server);
    const headers = { authorization: `Bearer ${token}`, 'idempotency-key': 'billing-checkout-growth-1' };
    const first = await server.inject({ method: 'POST', url: '/api/v1/billing/checkout-sessions', headers, payload: { planKey: 'growth' } });
    const second = await server.inject({ method: 'POST', url: '/api/v1/billing/checkout-sessions', headers, payload: { planKey: 'growth' } });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(second.json()).toEqual(first.json());
    expect(first.json().data.checkoutUrl).toContain('billing.example.test');
    expect(await billingRepository.getSubscription(workspaceId)).toBeUndefined();
    await server.close();
  });

  it('allows viewers to read billing but blocks billing mutations', async () => {
    const phase2Repository = createInMemoryPhase2Repository();
    const billingRepository = createInMemoryBillingRepository(phase2Repository);
    const server = createServer({
      phase2Repository,
      billingRepository,
      billingProvider: new TestBillingProvider(),
      authRepository: createViewerAuthRepository()
    });
    const loginResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'viewer@rankwoven.com', password: 'ignored' }
    });
    const token = loginResponse.json<{ data: { token: string } }>().data.token;
    const read = await server.inject({ method: 'GET', url: '/api/v1/billing/subscription', headers: { authorization: `Bearer ${token}` } });
    const mutation = await server.inject({
      method: 'POST',
      url: '/api/v1/billing/checkout-sessions',
      headers: { authorization: `Bearer ${token}`, 'idempotency-key': 'viewer-cannot-checkout-1' },
      payload: { planKey: 'growth' }
    });

    expect(read.statusCode).toBe(200);
    expect(mutation.statusCode).toBe(403);
    expect(mutation.json().error.code).toBe('FORBIDDEN');
    await server.close();
  });

  it('keeps paid entitlements through the current period after canceling auto-renewal and permits resume', async () => {
    const { server, billingRepository, provider, phase2Repository } = createBillingServer();
    const growth = await getPlan(billingRepository, 'growth');
    await billingRepository.applySubscriptionSnapshot({ workspaceId, plan: growth, snapshot: provider.currentSnapshot });
    const token = await login(server);
    const cancel = await server.inject({
      method: 'POST',
      url: '/api/v1/billing/subscription/cancel-renewal',
      headers: { authorization: `Bearer ${token}`, 'idempotency-key': 'billing-cancel-renewal-1' },
      payload: {}
    });
    expect(cancel.statusCode).toBe(200);
    expect(cancel.json().data.subscription.cancelAtPeriodEnd).toBe(true);

    const entitlement = await phase2Repository.findActiveEntitlement(workspaceId, 'keyword_research');
    expect(entitlement).toMatchObject({ limitValue: 2000, expiresAt: '2026-10-01T00:00:00.000Z' });

    const resume = await server.inject({
      method: 'POST',
      url: '/api/v1/billing/subscription/resume-renewal',
      headers: { authorization: `Bearer ${token}`, 'idempotency-key': 'billing-resume-renewal-1' },
      payload: {}
    });
    expect(resume.statusCode).toBe(200);
    expect(resume.json().data.subscription.cancelAtPeriodEnd).toBe(false);
    await server.close();
  });

  it('keeps plan entitlements during a past-due grace state', async () => {
    const { billingRepository, provider, phase2Repository } = createBillingServer();
    const growth = await getPlan(billingRepository, 'growth');
    await billingRepository.applySubscriptionSnapshot({
      workspaceId,
      plan: growth,
      snapshot: { ...provider.currentSnapshot, status: 'past_due' }
    });

    expect(await phase2Repository.findActiveEntitlement(workspaceId, 'keyword_research')).toMatchObject({ limitValue: 2000 });
  });

  it('opens entitlement only after a verified webhook and ignores a duplicate event', async () => {
    const { server, billingRepository, provider } = createBillingServer();
    const payload = JSON.stringify({ id: 'evt_test_1', type: 'checkout.session.completed' });
    const first = await server.inject({
      method: 'POST',
      url: '/api/v1/webhooks/stripe',
      headers: { 'stripe-signature': 'test-signature', 'content-type': 'application/json' },
      payload
    });
    const second = await server.inject({
      method: 'POST',
      url: '/api/v1/webhooks/stripe',
      headers: { 'stripe-signature': 'test-signature', 'content-type': 'application/json' },
      payload
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.json().data.replayed).toBe(true);
    expect(provider.receivedWebhookBody).toBe(payload);
    expect(await billingRepository.getSubscription(workspaceId)).toMatchObject({ planKey: 'growth', status: 'active' });
    await server.close();
  });

  it('rejects an invalid webhook signature without creating a subscription', async () => {
    const { server, billingRepository } = createBillingServer();
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/webhooks/stripe',
      headers: { 'stripe-signature': 'invalid', 'content-type': 'application/json' },
      payload: JSON.stringify({ id: 'evt_invalid' })
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('WEBHOOK_SIGNATURE_INVALID');
    expect(await billingRepository.getSubscription(workspaceId)).toBeUndefined();
    await server.close();
  });

  it('does not let an older webhook snapshot overwrite the current subscription', async () => {
    const { server, billingRepository, provider } = createBillingServer();
    const agency = await getPlan(billingRepository, 'agency');
    await billingRepository.applySubscriptionSnapshot({
      workspaceId,
      plan: agency,
      snapshot: { ...provider.currentSnapshot, priceRef: 'price_agency', providerUpdatedAt: '2026-09-17T00:00:00.000Z' }
    });
    provider.webhookEventId = 'evt_test_old';
    provider.currentSnapshot = { ...provider.currentSnapshot, priceRef: 'price_growth', providerUpdatedAt: '2026-09-16T00:00:00.000Z' };
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/webhooks/stripe',
      headers: { 'stripe-signature': 'test-signature', 'content-type': 'application/json' },
      payload: JSON.stringify({ id: 'evt_test_old' })
    });

    expect(response.statusCode).toBe(200);
    expect(await billingRepository.getSubscription(workspaceId)).toMatchObject({ planKey: 'agency' });
    await server.close();
  });

  it('creates a workspace-scoped usage CSV export', async () => {
    const { server } = createBillingServer();
    const token = await login(server);
    const created = await server.inject({
      method: 'POST',
      url: '/api/v1/report-exports',
      headers: { authorization: `Bearer ${token}` },
      payload: { reportType: 'usage_csv' }
    });
    expect(created.statusCode).toBe(201);
    const exportId = created.json<{ data: { report: { id: string } } }>().data.report.id;
    const downloaded = await server.inject({ method: 'GET', url: `/api/v1/report-exports/${exportId}/download`, headers: { authorization: `Bearer ${token}` } });
    expect(downloaded.statusCode).toBe(200);
    expect(downloaded.headers['content-type']).toContain('text/csv');
    expect(downloaded.body).toContain('workspace_id');
    await server.close();
  });
});
