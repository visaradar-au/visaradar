import { describe, expect, it } from 'vitest';
import { cutoffText, hasOccupationPage } from '../../src/lib/rounds';
import { formatWhen } from '../../src/lib/format';

describe('round helpers', () => {
  it('formats a points cut-off', () => {
    expect(cutoffText({ occupation: 'X', code: '261313', points: 85 })).toBe('85');
  });
  it('formats a per-stream matrix and skips empty streams', () => {
    expect(
      cutoffText({ occupation: 'X', code: '1331', matrix: { 'canberra-491': null, 'canberra-190': { score: 100, date: null }, 'overseas-190': { score: 95, date: null } } }),
    ).toBe('Canberra 190: 100 · Overseas 190: 95');
  });
  it('is empty when nothing was published', () => {
    expect(cutoffText({ occupation: 'X', code: '1331' })).toBe('');
  });
  it('links only 6-digit codes', () => {
    expect(hasOccupationPage('261313')).toBe(true);
    expect(hasOccupationPage('1331')).toBe(false);
  });
  it('formats month-only and full dates', () => {
    expect(formatWhen('2026-10')).toBe('October 2026');
    expect(formatWhen('2026-10-12')).toBe('12 Oct 2026');
    expect(formatWhen(null)).toBe('');
  });
});

import { excerptToShow } from '../../src/lib/news';

describe('excerptToShow', () => {
  it('hides an excerpt that repeats the title', () => {
    expect(excerptToShow('Program open', 'Program open')).toBeNull();
    expect(excerptToShow('Program open', 'Program open for 2026-27 applicants.')).toBeNull();
    expect(excerptToShow('Program open for…', 'Program open')).toBeNull();
  });
  it('keeps a continuation or a different summary', () => {
    expect(excerptToShow('The ACT portal is now open…', '…for RCB support.')).toBe('…for RCB support.');
    expect(excerptToShow('Round results', 'The ACT invited 261 people.')).toBe('The ACT invited 261 people.');
  });
  it('handles a missing excerpt', () => {
    expect(excerptToShow('Title', null)).toBeNull();
  });
});
