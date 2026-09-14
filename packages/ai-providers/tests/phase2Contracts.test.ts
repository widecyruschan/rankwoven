import { describe, expect, it } from 'vitest';
import {
  assertTaskTransition,
  createInMemoryPhase2Repository,
  createPagination,
  createInMemoryTaskGovernance,
  hashRequestBody,
  normalizePagination
} from '../src/index';

describe('phase 2 contracts', () => {
  it('normalizes pagination and calculates total pages', () => {
    expect(normalizePagination({ page: 0, pageSize: 500 })).toEqual({ page: 1, pageSize: 100 });
    expect(createPagination(2, 20, 41)).toEqual({ page: 2, pageSize: 20, total: 41, totalPages: 3 });
  });

  it('rejects illegal task transitions', () => {
    expect(() => assertTaskTransition('completed', 'running')).toThrow('TASK_STATE_INVALID');
    expect(() => assertTaskTransition('failed', 'queued')).not.toThrow();
  });

  it('keeps idempotency hashes deterministic', () => {
    expect(hashRequestBody({ b: 2, a: 1 })).toBe(hashRequestBody({ b: 2, a: 1 }));
    expect(hashRequestBody({ a: 1, b: 2 })).toBe(hashRequestBody({ b: 2, a: 1 }));
  });

  it('finalizes or releases a usage reservation only once', async () => {
    const repository = createInMemoryPhase2Repository();
    const reservation = await repository.reserveUsage({
      workspaceId: 'workspace-1',
      operation: 'keyword_research',
      units: 1,
      costEstimate: 0.25,
      idempotencyKey: 'key-1'
    });

    expect(await repository.finalizeUsage('workspace-1', reservation.reservationId, 0.2)).toMatchObject({
      eventType: 'finalize',
      actualCost: 0.2
    });
    expect(await repository.releaseUsage('workspace-1', reservation.reservationId)).toBeUndefined();
    expect(await repository.getUsageSummary('workspace-1')).toEqual({
      reservedUnits: 1,
      activeReservedUnits: 0,
      finalizedUnits: 1,
      releasedUnits: 0,
      reservedCost: 0.25,
      finalizedCost: 0.2,
      releasedCost: 0
    });
  });

  it('returns the same task for repeated idempotent creation', async () => {
    const repository = createInMemoryPhase2Repository();
    const record = {
      workspaceId: 'workspace-1',
      method: 'POST',
      route: '/api/v1/tasks',
      key: 'task-create-1',
      requestHash: hashRequestBody({ kind: 'keyword_research' }),
      statusCode: 202,
      createdAt: new Date().toISOString()
    };
    const createResponse = (task: { id: string }) => ({
      statusCode: 202,
      responseBody: { success: true, data: { taskId: task.id } }
    });
    const first = await repository.createTaskWithIdempotency(
      { workspaceId: 'workspace-1', kind: 'keyword_research', estimatedCredits: 1, idempotencyKey: record.key, requestHash: record.requestHash },
      record,
      createResponse
    );
    const second = await repository.createTaskWithIdempotency(
      { workspaceId: 'workspace-1', kind: 'keyword_research', estimatedCredits: 1, idempotencyKey: record.key, requestHash: record.requestHash },
      record,
      createResponse
    );
    const replayBody = second.replay?.responseBody as { data: { taskId: string } } | undefined;
    expect(first.task?.id).toBe(replayBody?.data.taskId);
  });

  it('holds quota atomically and releases it when a queued task is cancelled', async () => {
    const repository = createInMemoryPhase2Repository();
    await repository.saveEntitlement({
      id: '00000000-0000-4000-8000-000000000101',
      workspaceId: 'workspace-1',
      featureKey: 'keyword_research',
      limitValue: 1,
      period: 'monthly',
      source: 'test',
      effectiveAt: new Date(Date.now() - 1_000).toISOString()
    });
    const record = {
      workspaceId: 'workspace-1',
      method: 'POST',
      route: '/api/v1/keyword-research/projects/project/runs',
      key: 'costed-task-1',
      requestHash: hashRequestBody({ seed: 'yoga mat' }),
      statusCode: 202,
      createdAt: new Date().toISOString()
    };
    const createResponse = (task: { id: string }) => ({ statusCode: 202, responseBody: { taskId: task.id } });
    const first = await repository.enqueueCostedTask({
      ...record,
      record,
      kind: 'keyword_research',
      estimatedCredits: 1,
      operation: 'keyword_research',
      featureKey: 'keyword_research',
      units: 1,
      costEstimate: 0.25
    }, createResponse);
    const replay = await repository.enqueueCostedTask({
      ...record,
      record,
      kind: 'keyword_research',
      estimatedCredits: 1,
      operation: 'keyword_research',
      featureKey: 'keyword_research',
      units: 1,
      costEstimate: 0.25
    }, createResponse);
    expect(first.task?.id).toBeDefined();
    expect(replay.replay?.responseBody).toEqual({ taskId: first.task?.id });
    await expect(repository.enqueueCostedTask({
      ...record,
      record: { ...record, key: 'costed-task-2', requestHash: hashRequestBody({ seed: 'foam roller' }) },
      kind: 'keyword_research',
      estimatedCredits: 1,
      operation: 'keyword_research',
      featureKey: 'keyword_research',
      units: 1,
      costEstimate: 0.25
    }, createResponse)).rejects.toThrow('QUOTA_EXCEEDED');
    await repository.cancelTask(first.task!.id, 'workspace-1');
    expect(await repository.getPeriodUsageUnits('workspace-1', 'keyword_research', 'monthly')).toBe(0);
  });

  it('keeps dead-letter history immutable when replayed or ignored', async () => {
    const repository = createInMemoryPhase2Repository();
    const task = await repository.createTask({ workspaceId: 'workspace-1', kind: 'keyword_research', estimatedCredits: 1 });
    await repository.transitionTask(task.id, task.workspaceId, 'queued', 'running');
    await repository.transitionTask(task.id, task.workspaceId, 'running', 'failed');
    await repository.transitionTask(task.id, task.workspaceId, 'failed', 'dead_letter');
    const replay = await repository.replayDeadLetterTask(task.id, 'workspace-1', 'actor-1', '修正供應商設定');
    expect(replay?.task.replayOfTaskId).toBe(task.id);
    expect((await repository.listDeadLetterTasks('workspace-1', { page: 1, pageSize: 10 })).items).toHaveLength(1);
    expect(await repository.ignoreDeadLetterTask(task.id, 'workspace-1', 'actor-1', '保留歷史紀錄')).toMatchObject({ action: 'ignore' });
  });

  it('applies a shared token bucket and circuit breaker without storing task payloads', async () => {
    let currentTime = 0;
    const governance = createInMemoryTaskGovernance(() => currentTime);
    const rate = { capacity: 2, refillWindowMs: 1_000 };
    expect((await governance.consume('workspace:actor:keyword', rate)).allowed).toBe(true);
    expect((await governance.consume('workspace:actor:keyword', rate)).allowed).toBe(true);
    expect((await governance.consume('workspace:actor:keyword', rate)).allowed).toBe(false);
    currentTime = 500;
    expect((await governance.consume('workspace:actor:keyword', rate)).allowed).toBe(true);

    const circuit = { failureThreshold: 2, failureWindowMs: 1_000, cooldownMs: 500 };
    await governance.recordProviderOutcome('wenwen', 'catalog', false, circuit);
    await governance.recordProviderOutcome('wenwen', 'catalog', false, circuit);
    expect((await governance.allowProvider('wenwen', 'catalog', circuit)).allowed).toBe(false);
    currentTime += 500;
    expect((await governance.allowProvider('wenwen', 'catalog', circuit)).allowed).toBe(true);
  });
});
