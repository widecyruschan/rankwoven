import { describe, expect, it } from 'vitest';
import {
  getPhase2FailureStatus,
  getPhase2RetryDelayMs,
  validatePhase2Transition
} from '../src/phase2TaskState';

describe('phase 2 worker task state', () => {
  it('uses bounded exponential backoff', () => {
    expect(getPhase2RetryDelayMs(0)).toBe(5_000);
    expect(getPhase2RetryDelayMs(4)).toBe(60_000);
    expect(getPhase2RetryDelayMs(-1)).toBe(5_000);
  });

  it('moves retryable failures back to queued and dead-letters exhausted tasks', () => {
    expect(getPhase2FailureStatus(1, 3)).toBe('queued');
    expect(getPhase2FailureStatus(4, 3)).toBe('dead_letter');
  });

  it('rejects illegal transitions before persistence', () => {
    expect(validatePhase2Transition('failed', 'queued')).toBe(true);
    expect(() => validatePhase2Transition('completed', 'running')).toThrow('TASK_STATE_INVALID');
  });
});
