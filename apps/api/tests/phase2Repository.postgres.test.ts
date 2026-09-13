import { Pool } from 'pg';
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
});
