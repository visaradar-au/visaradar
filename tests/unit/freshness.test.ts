import { describe, expect, it } from 'vitest';
import type { FetchState } from '../../src/lib/data/types';
import { formatCheck, groupFreshness } from '../../src/lib/freshness';

const ok = (lastOk: string): FetchState => ({ url: '', lastOk, lastError: null, lastErrorAt: null, lastStatus: 200, itemCount: 1 });

describe('formatCheck', () => {
  it('shows 24-hour Brisbane time and the day', () => {
    expect(formatCheck('2026-11-07T11:36:07.795Z')).toBe('21:36, 7 Nov');
    expect(formatCheck('2026-11-07T14:05:00Z')).toBe('00:05, 8 Nov');
  });
  it('returns "" for missing or bad input', () => {
    expect(formatCheck(null)).toBe('');
    expect(formatCheck('soon')).toBe('');
  });
});

describe('groupFreshness', () => {
  const state: Record<string, FetchState> = {
    a: ok('2026-11-07T10:00:00Z'),
    b: ok('2026-11-07T11:00:00Z'),
    never: { url: '', lastOk: null, lastError: 'HTTP 403', lastErrorAt: '2026-11-07T11:00:00Z', lastStatus: 403, itemCount: 0 },
    lapsed: { url: '', lastOk: '2026-11-01T00:00:00Z', lastError: 'timeout', lastErrorAt: '2026-11-07T11:00:00Z', lastStatus: null, itemCount: 2 },
    recovered: { url: '', lastOk: '2026-11-07T09:00:00Z', lastError: 'old', lastErrorAt: '2026-11-06T00:00:00Z', lastStatus: 200, itemCount: 2 },
  };

  it('takes the latest success in the group', () => {
    expect(groupFreshness(state, ['a', 'b', 'never']).checked).toBe('2026-11-07T11:00:00Z');
  });

  it('lists sources whose last attempt failed, with their last success or null', () => {
    expect(groupFreshness(state, ['a', 'never', 'lapsed', 'recovered', 'missing']).unreachable).toEqual([
      { source: 'never', since: null },
      { source: 'lapsed', since: '2026-11-01T00:00:00Z' },
    ]);
  });

  it('has nothing checked when no source has succeeded', () => {
    expect(groupFreshness(state, ['never'])).toEqual({ checked: null, unreachable: [{ source: 'never', since: null }] });
  });
});
