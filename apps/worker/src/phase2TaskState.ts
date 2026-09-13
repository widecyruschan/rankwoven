import {
  assertTaskTransition,
  type Phase2TaskStatus
} from '@aieo/ai-providers';

export function getPhase2RetryDelayMs(retryCount: number, baseDelayMs = 5_000, maxDelayMs = 60_000) {
  const normalizedRetryCount = Math.max(0, Math.floor(retryCount));
  return Math.min(maxDelayMs, 2 ** normalizedRetryCount * baseDelayMs);
}

export function getPhase2FailureStatus(retryCount: number, maxRetries: number): Phase2TaskStatus {
  return retryCount > maxRetries ? 'dead_letter' : 'queued';
}

export function validatePhase2Transition(from: Phase2TaskStatus, to: Phase2TaskStatus) {
  assertTaskTransition(from, to);
  return true;
}
