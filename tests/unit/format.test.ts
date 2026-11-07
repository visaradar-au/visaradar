import { describe, expect, it } from 'vitest';
import { formatCell, formatDate, formatDelta, formatMonth, formatNumber } from '../../src/lib/format';
import { parseProfile, roundPoints } from '../../src/lib/profile';

describe('format', () => {
  it('formats months without inventing a day', () => {
    expect(formatMonth('2026-10')).toBe('October 2026');
  });
  it('formats dates in Brisbane time', () => {
    expect(formatDate('2026-11-01T23:30:13.952Z')).toBe('2 Nov 2026');
    expect(formatDate('2026-11-07')).toBe('7 Nov 2026');
    expect(formatDate(null)).toBe('');
    expect(formatDate('not a date')).toBe('');
    expect(formatDate('October 2025')).toBe('');
  });
  it('formats numbers, deltas and masked cells', () => {
    expect(formatNumber(96332)).toBe('96,332');
    expect(formatDelta(-56)).toBe('−56');
    expect(formatDelta(1204)).toBe('+1,204');
    expect(formatDelta(0)).toBe('0');
    expect(formatCell('<20')).toBe('<20');
    expect(formatCell(1500)).toBe('1,500');
  });
});

describe('profile', () => {
  it('accepts a valid profile', () => {
    expect(parseProfile({ code: '261313', name: 'Software Engineer', visa: '190', state: 'QLD', points: 85 })).toEqual({
      code: '261313', name: 'Software Engineer', visa: '190', state: 'QLD', points: 85,
    });
  });
  it('rejects bad input', () => {
    expect(parseProfile(null)).toBeNull();
    expect(parseProfile({ code: '12', visa: '190', points: 80 })).toBeNull();
    expect(parseProfile({ code: '261313', visa: '482', points: 80 })).toBeNull();
    expect(parseProfile({ code: '261313', visa: '190', points: 'lots' })).toBeNull();
  });
  it('rounds points to steps of 5', () => {
    expect(roundPoints(83)).toBe(85);
    expect(roundPoints(82)).toBe(80);
  });
});
