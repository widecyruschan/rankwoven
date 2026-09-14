import { describe, expect, it } from 'vitest';
import { hasRequiredRole } from '../src/utils/roles';

describe('route role hierarchy', () => {
  it('allows owners to use admin routes while keeping lower roles out', () => {
    expect(hasRequiredRole('owner', 'admin')).toBe(true);
    expect(hasRequiredRole('admin', 'admin')).toBe(true);
    expect(hasRequiredRole('editor', 'admin')).toBe(false);
    expect(hasRequiredRole('viewer', 'admin')).toBe(false);
  });
});
