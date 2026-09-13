import { describe, expect, it } from 'vitest';
import {
  assertTaskTransition,
  createInMemoryPhase2Repository,
  createPagination,
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
});
