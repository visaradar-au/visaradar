import { describe, expect, it } from 'vitest';
import {
  change,
  invitedLodgedChange,
  lastChange,
  monthSeries,
  poolByPoints,
  poolTotal,
  positionAt,
  scoreAxis,
  stateMetrics,
  type MonthRow,
  type OccRow,
} from '../../src/lib/eoi';

// Made-up fixture, not real data.
const rows: OccRow[] = [
  ['190', 'QLD', 'SUBMITTED', 65, 120],
  ['190', 'QLD', 'SUBMITTED', 75, 80],
  ['190', 'QLD', 'SUBMITTED', 70, '<20'],
  ['190', 'QLD', 'SUBMITTED', 85, '<20'],
  ['190', 'QLD', 'SUBMITTED', 90, 25],
  ['190', 'QLD', 'INVITED', 90, '<20'],
  ['190', 'NSW', 'SUBMITTED', 80, 300],
  ['189', 'N/A', 'SUBMITTED', 95, 40],
];

describe('poolByPoints', () => {
  it('filters one visa, state and status and sorts by score', () => {
    expect(poolByPoints(rows, '190', 'QLD').map((c) => c.score)).toEqual([65, 70, 75, 85, 90]);
  });
  it('is empty when nothing matches', () => {
    expect(poolByPoints(rows, '491', 'QLD')).toEqual([]);
  });
});

describe('scoreAxis', () => {
  it('spans every 5 points across all states for a visa', () => {
    expect(scoreAxis(rows, '190')).toEqual([65, 70, 75, 80, 85, 90]);
  });
  it('is empty with no rows', () => {
    expect(scoreAxis([], '190')).toEqual([]);
  });
});

describe('poolTotal', () => {
  it('sums numeric cells and counts masked cells separately', () => {
    expect(poolTotal(poolByPoints(rows, '190', 'QLD'))).toEqual({ counted: 225, maskedCells: 2, cells: 5 });
  });
  it('handles an all-masked pool', () => {
    expect(poolTotal([{ score: 80, count: '<20' }, { score: 85, count: '<20' }])).toEqual({ counted: 0, maskedCells: 2, cells: 2 });
  });
  it('handles an empty pool', () => {
    expect(poolTotal([])).toEqual({ counted: 0, maskedCells: 0, cells: 0 });
  });
});

describe('positionAt', () => {
  const pool = poolByPoints(rows, '190', 'QLD');
  it('splits above, at and below, excluding masked cells', () => {
    expect(positionAt(pool, 75)).toEqual({
      points: 75, at: 80, above: 25, below: 120, maskedAbove: 1, maskedBelow: 1, maskedExcluded: 2,
    });
  });
  it('reports a masked cell at the score', () => {
    const p = positionAt(pool, 70);
    expect(p.at).toBe('<20');
    expect(p.maskedExcluded).toBe(2);
    expect(p.above).toBe(105);
  });
  it('gives 0 at a score with no cell', () => {
    expect(positionAt(pool, 100)).toMatchObject({ at: 0, above: 0, below: 225 });
  });
  it('handles an all-masked pool', () => {
    expect(positionAt([{ score: 80, count: '<20' }, { score: 90, count: '<20' }], 85)).toEqual({
      points: 85, at: 0, above: 0, below: 0, maskedAbove: 1, maskedBelow: 1, maskedExcluded: 2,
    });
  });
  it('handles an empty pool', () => {
    expect(positionAt([], 80)).toMatchObject({ at: 0, above: 0, below: 0, maskedExcluded: 0 });
  });
});

const months = ['2026-08', '2026-09', '2026-10'];
const history: MonthRow[] = [
  ['2026-08', '190', 'QLD', 'SUBMITTED', 900],
  ['2026-09', '190', 'QLD', 'SUBMITTED', 1000],
  ['2026-10', '190', 'QLD', 'SUBMITTED', 940],
  ['2026-09', '190', 'QLD', 'INVITED', 60],
  ['2026-10', '190', 'QLD', 'INVITED', 35],
  ['2026-09', '190', 'QLD', 'LODGED', '<20'],
  ['2026-10', '190', 'QLD', 'LODGED', 45],
  ['2026-10', '190', 'NSW', 'SUBMITTED', 5000],
];

describe('month-on-month change', () => {
  it('builds a series with 0 for missing months', () => {
    expect(monthSeries(history, months, '190', 'QLD', 'INVITED')).toEqual([0, 60, 35]);
  });
  it('computes the last change', () => {
    expect(lastChange([900, 1000, 940])).toEqual({ current: 940, previous: 1000, delta: -60 });
  });
  it('has no delta when a month is masked', () => {
    expect(change(45, '<20').delta).toBeNull();
    expect(change('<20', 30).delta).toBeNull();
  });
  it('has no delta without a previous month', () => {
    expect(lastChange([12])).toEqual({ current: 12, previous: null, delta: null });
    expect(lastChange([])).toEqual({ current: 0, previous: null, delta: null });
  });
  it('reports INVITED and LODGED together', () => {
    const c = invitedLodgedChange(history, months, '190', 'QLD');
    expect(c.invited).toEqual({ current: 35, previous: 60, delta: -25 });
    expect(c.lodged).toEqual({ current: 45, previous: '<20', delta: null });
  });
});

describe('stateMetrics', () => {
  it('returns one entry per state plus ANY and never a total', () => {
    const m = stateMetrics(history, months, '190');
    expect(Object.keys(m).sort()).toEqual(['ACT', 'ANY', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']);
    expect(m.QLD.submitted).toEqual({ current: 940, previous: 1000, delta: -60 });
    expect(m.NSW.submitted).toEqual({ current: 5000, previous: 0, delta: 5000 });
    expect(m).not.toHaveProperty('ALL');
  });
  it('uses N/A for national visas', () => {
    expect(Object.keys(stateMetrics(history, months, '189'))).toEqual(['N/A']);
  });
});
