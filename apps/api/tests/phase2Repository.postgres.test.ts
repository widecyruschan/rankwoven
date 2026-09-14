import { Pool } from 'pg';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createDefaultPhase2Repository } from '../src/phase2Repository';
import { createPostgresSiteConnectionRepository } from '../src/siteConnections';

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const describePostgres = process.env.RUN_POSTGRES_TESTS === '1' && databaseUrl ? describe : describe.skip;
const workspaceId = '00000000-0000-4000-8000-000000000001';

describePostgres('PostgreSQL phase 2 repository', () => {
  it('persists an isolated task, idempotency record, usage events, attempt and audit event', async () => {
    const repository = createDefaultPhase2Repository(databaseUrl);
    const pool = new Pool({ connectionString: databaseUrl });
    const taskIdempotencyKey = `phase2-${crypto.randomUUID()}`;
    const requestHash = 'a'.repeat(64);
    let taskId = '';

    try {
      const task = await repository.createTask({
        workspaceId,
        kind: 'keyword_research',
        estimatedCredits: 4,
        idempotencyKey: taskIdempotencyKey,
        requestHash
      });
      taskId = task.id;
      expect(task.status).toBe('queued');
      expect(await repository.findTask(task.id, workspaceId)).toMatchObject({ id: task.id });
      expect(await repository.findTask(task.id, '00000000-0000-4000-8000-000000000002')).toBeUndefined();

      await repository.saveIdempotency({
        workspaceId,
        method: 'POST',
        route: '/api/v1/test',
        key: taskIdempotencyKey,
        requestHash,
        statusCode: 202,
        responseBody: { taskId: task.id },
        createdAt: new Date().toISOString()
      });
      expect(await repository.findIdempotency({
        workspaceId,
        method: 'POST',
        route: '/api/v1/test',
        key: taskIdempotencyKey
      })).toMatchObject({ requestHash, statusCode: 202 });

      const running = await repository.transitionTask(task.id, workspaceId, 'queued', 'running', { progress: 25 });
      expect(running).toMatchObject({ status: 'running', progress: 25 });
      const usageBefore = await repository.getUsageSummary(workspaceId);
      const reservation = await repository.reserveUsage({
        workspaceId,
        operation: 'keyword_research',
        units: 1,
        costEstimate: 0.4
      });
      expect(await repository.finalizeUsage(workspaceId, reservation.reservationId, 0.35)).toMatchObject({ eventType: 'finalize' });
      expect(await repository.finalizeUsage(workspaceId, reservation.reservationId, 0.35)).toBeUndefined();
      const usageAfter = await repository.getUsageSummary(workspaceId);
      expect(usageAfter.finalizedCost - usageBefore.finalizedCost).toBeCloseTo(0.35);

      await repository.recordAttempt({
        taskId: task.id,
        workspaceId,
        attemptNo: 1,
        status: 'completed',
        startedAt: new Date().toISOString(),
        cost: 0.35
      });
      await repository.recordAudit({
        workspaceId,
        actorType: 'system',
        action: 'test.phase2',
        resourceType: 'phase2_task',
        resourceId: task.id
      });
    } finally {
      await pool.query('DELETE FROM phase2_tasks WHERE id = $1', [taskId]);
      // usage_ledger is append-only by design; test rows are retained as audit evidence.
      await pool.query('DELETE FROM idempotency_keys WHERE workspace_id = $1 AND idempotency_key = $2', [workspaceId, taskIdempotencyKey]);
      await pool.query("DELETE FROM audit_events WHERE action = 'test.phase2' AND resource_id = $1", [taskId]);
      await pool.end();
      await repository.close?.();
    }
  });

  it('persists a research project only when its site belongs to the workspace', async () => {
    const repository = createDefaultPhase2Repository(databaseUrl);
    const siteRepository = createPostgresSiteConnectionRepository(databaseUrl as string);
    const pool = new Pool({ connectionString: databaseUrl });
    let siteId = '';
    let projectId = '';

    try {
      const site = await siteRepository.create({
        platform: 'wordpress',
        name: `Phase 2 Research ${crypto.randomUUID()}`,
        siteUrl: `https://phase2-research-${crypto.randomUUID()}.example.test`
      });
      siteId = site.site.id;
      const project = await repository.createKeywordResearchProject({
        workspaceId,
        siteId,
        name: 'Keyword Research Contract',
        market: 'US',
        language: 'en'
      });
      projectId = project.id;
      expect(project.workspaceId).toBe(workspaceId);
      expect(await repository.findKeywordResearchProject(project.id, workspaceId)).toMatchObject({ id: project.id });
      await expect(repository.createKeywordResearchProject({
        workspaceId: '00000000-0000-4000-8000-000000000002',
        siteId,
        name: 'Cross Workspace Attempt',
        market: 'US',
        language: 'en'
      })).rejects.toThrow('WORKSPACE_RESOURCE_NOT_FOUND');
    } finally {
      if (projectId) await pool.query('DELETE FROM keyword_research_projects WHERE id = $1', [projectId]);
      if (siteId) await pool.query('DELETE FROM site_connections WHERE id = $1', [siteId]);
      await pool.end();
      await repository.close?.();
      await siteRepository.close?.();
    }
  });

  it('serializes concurrent quota reservations and releases a cancelled queued task', async () => {
    const repository = createDefaultPhase2Repository(databaseUrl);
    const pool = new Pool({ connectionString: databaseUrl });
    const featureKey = `postgres-governance-${crypto.randomUUID()}`;
    const entitlementId = crypto.randomUUID();
    const record = (key: string) => ({
      workspaceId,
      method: 'POST',
      route: '/api/v1/test/costed-task',
      key,
      requestHash: createHash('sha256').update(key).digest('hex'),
      statusCode: 202,
      createdAt: new Date().toISOString()
    });

    try {
      await repository.saveEntitlement({
        id: entitlementId,
        workspaceId,
        featureKey,
        limitValue: 1,
        period: 'monthly',
        source: 'test',
        effectiveAt: new Date(Date.now() - 1_000).toISOString()
      });
      const create = (input: ReturnType<typeof record>) => repository.enqueueCostedTask({
        ...input,
        record: input,
        kind: 'keyword_research',
        estimatedCredits: 1,
        operation: featureKey,
        featureKey,
        units: 1,
        costEstimate: 0.25
      }, (task) => ({ statusCode: 202, responseBody: { taskId: task.id } }));

      const results = await Promise.allSettled([create(record(`quota-a-${crypto.randomUUID()}`)), create(record(`quota-b-${crypto.randomUUID()}`))]);
      const fulfilled = results.filter((result): result is PromiseFulfilledResult<{ task?: { id: string } }> => result.status === 'fulfilled');
      const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toMatchObject({ message: 'QUOTA_EXCEEDED' });

      const taskId = fulfilled[0].value.task?.id;
      expect(taskId).toBeTruthy();
      await repository.cancelTask(taskId as string, workspaceId);
      expect(await repository.getPeriodUsageUnits(workspaceId, featureKey, 'monthly')).toBe(0);
    } finally {
      await pool.query('DELETE FROM phase2_tasks WHERE workspace_id = $1 AND idempotency_key LIKE $2', [workspaceId, 'quota-%']);
      await pool.query('DELETE FROM entitlement_assignments WHERE id = $1', [entitlementId]);
      await pool.end();
      await repository.close?.();
    }
  });

  it('persists keyword metrics, observations, gap snapshots and briefs with workspace scope', async () => {
    const repository = createDefaultPhase2Repository(databaseUrl);
    const siteRepository = createPostgresSiteConnectionRepository(databaseUrl as string);
    const pool = new Pool({ connectionString: databaseUrl });
    let siteId = '';
    let projectId = '';
    let runId = '';
    let candidateId: string;
    let competitorId = '';
    try {
      const site = await siteRepository.create({ platform: 'wordpress', name: `Keyword Facts ${crypto.randomUUID()}`, siteUrl: `https://keyword-facts-${crypto.randomUUID()}.example.test` });
      siteId = site.site.id;
      const project = await repository.createKeywordResearchProject({ workspaceId, siteId, name: 'Keyword Facts', market: 'US', language: 'en' });
      projectId = project.id;
      const run = await repository.createKeywordResearchRun({
        workspaceId,
        projectId,
        inputHash: 'b'.repeat(64),
        requestContextHash: 'c'.repeat(64),
        provider: 'dataforseo',
        providerMethodologyVersion: 'fixture-v1',
        status: 'queued',
        costEstimate: 0.1,
        seedKeywords: ['yoga mat'],
        locale: 'en-US'
      });
      runId = run.id;
      const candidate = await repository.saveKeywordCandidate({ workspaceId, projectId, normalizedKeyword: 'yoga mat', displayKeyword: 'yoga mat', locale: 'en-US', intent: 'commercial', sourceType: 'provider_estimated' });
      candidateId = candidate.id;
      await repository.saveKeywordMetric({ workspaceId, runId, candidateId, metricName: 'volume', numericValue: 1_000, provider: 'dataforseo', sourceType: 'provider_estimated', providerSnapshotId: 'fixture-snapshot', location: 'US', language: 'en', device: 'desktop', confidence: 1 });
      competitorId = crypto.randomUUID();
      await pool.query(`INSERT INTO competitor_domains (id, workspace_id, project_id, normalized_domain) VALUES ($1, $2, $3, $4)`, [competitorId, workspaceId, projectId, 'competitor.example']);
      await repository.saveKeywordObservation({ workspaceId, runId, candidateId, domainType: 'competitor', competitorId, domain: 'competitor.example', rank: 7, provider: 'dataforseo', providerSnapshotId: 'fixture-snapshot', sourceType: 'provider_estimated', serpFeatures: [] });
      await repository.saveKeywordGapSnapshot({ workspaceId, runId, candidateId, classification: 'missing', competitorBestRank: 7, competitorIds: [competitorId], evidenceRefs: ['fixture-snapshot'], provider: 'dataforseo', providerSnapshotId: 'fixture-snapshot' });
      const keywords = await repository.listKeywordCandidates(projectId, workspaceId, { page: 1, pageSize: 20, minVolume: 500 });
      const gaps = await repository.listKeywordGaps(projectId, workspaceId, { page: 1, pageSize: 20, classification: 'missing' });
      const brief = await repository.createContentBrief({ workspaceId, projectId, primaryKeywordId: candidateId, locale: 'en-US' });
      expect(keywords.items).toHaveLength(1);
      expect(gaps.items).toHaveLength(1);
      expect(brief.primaryKeywordId).toBe(candidateId);
      expect(await repository.listKeywordCandidates(projectId, '00000000-0000-4000-8000-000000000002', { page: 1, pageSize: 20 })).toMatchObject({ items: [], pagination: { total: 0 } });
    } finally {
      if (runId) await pool.query('DELETE FROM keyword_research_runs WHERE id = $1', [runId]);
      if (competitorId) await pool.query('DELETE FROM competitor_domains WHERE id = $1', [competitorId]);
      if (projectId) await pool.query('DELETE FROM keyword_research_projects WHERE id = $1', [projectId]);
      if (siteId) await pool.query('DELETE FROM site_connections WHERE id = $1', [siteId]);
      await pool.end();
      await repository.close?.();
      await siteRepository.close?.();
    }
  });
});
