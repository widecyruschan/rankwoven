import { describe, expect, it } from 'vitest';
import { createHostNameFilter, resolveHostNameCandidates } from '../src/analytics';

describe('resolveHostNameCandidates', () => {
  it('returns empty for blank host', () => {
    expect(resolveHostNameCandidates()).toEqual([]);
    expect(resolveHostNameCandidates('')).toEqual([]);
    expect(resolveHostNameCandidates('   ')).toEqual([]);
  });

  it('normalizes case and trailing dots', () => {
    expect(resolveHostNameCandidates('CyrusChan.COM.')).toEqual([
      'cyruschan.com',
      'www.cyruschan.com'
    ]);
  });

  it('expands apex host with www variant', () => {
    expect(resolveHostNameCandidates('cyruschan.com')).toEqual([
      'cyruschan.com',
      'www.cyruschan.com'
    ]);
  });

  it('expands www host with apex variant', () => {
    expect(resolveHostNameCandidates('www.cyruschan.com')).toEqual([
      'www.cyruschan.com',
      'cyruschan.com'
    ]);
  });
});

describe('createHostNameFilter', () => {
  it('returns undefined when no host', () => {
    expect(createHostNameFilter()).toBeUndefined();
    expect(createHostNameFilter('')).toBeUndefined();
  });

  it('builds an OR group for apex and www', () => {
    expect(createHostNameFilter('cyruschan.com')).toEqual({
      orGroup: {
        expressions: [
          {
            filter: {
              fieldName: 'hostName',
              stringFilter: {
                matchType: 'EXACT',
                value: 'cyruschan.com'
              }
            }
          },
          {
            filter: {
              fieldName: 'hostName',
              stringFilter: {
                matchType: 'EXACT',
                value: 'www.cyruschan.com'
              }
            }
          }
        ]
      }
    });
  });
});
