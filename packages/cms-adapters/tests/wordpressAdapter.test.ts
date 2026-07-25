import { describe, expect, it } from 'vitest';
import { createWordPressAdapter } from '../src';

describe('createWordPressAdapter', () => {
  it('exposes the MVP adapter capabilities', () => {
    const adapter = createWordPressAdapter();

    expect(adapter.getCapabilities()).toMatchObject({
      platform: 'wordpress',
      canPreviewUpdates: true,
      canRollback: true
    });
  });
});
