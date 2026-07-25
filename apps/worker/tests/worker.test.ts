import { describe, expect, it } from 'vitest';
import { createWordPressAdapter } from '@aieo/cms-adapters';

describe('worker adapter wiring', () => {
  it('can load the WordPress adapter', () => {
    expect(createWordPressAdapter().getCapabilities().platform).toBe('wordpress');
  });
});
