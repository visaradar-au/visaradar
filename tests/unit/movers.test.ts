import { describe, expect, it } from 'vitest';
import type { MonthRow } from '../../src/lib/eoi';
import { computeMovers, monthlyMoves, moveSize, scopeMoves } from '../../src/lib/movers';

// Made-up fixture, not real data.
const rows: MonthRow[] = [
  ['2026-09', '190', 'QLD', 'INVITED', 40],
  ['2026-10', '190', 'QLD', 'INVITED', 100],
  ['2026-09', '190', 'QLD', 'LODGED', 200],
  ['2026-10', '190', 'QLD', 'LODGED', 180],
  // Masked on one side: skipped and counted.
  ['2026-09', '190', 'NSW', 'INVITED', '<20'],
  ['2026-10', '190', 'NSW', 'INVITED', 60],
  // Missing last month means 0.
  ['2026-10', '491', 'SA', 'LODGED', 30],
  // National 189.
  ['2026-09', '189', 'N/A', 'INVITED', 500],
  ['2026-10', '189', 'N/A', 'INVITED', 300],
  ['2026-09', '189', 'N/A', 'LODGED', 25],
  ['2026-10', '189', 'N/A', 'LODGED', 25],
  // Scopes outside the eight states are never compared.
  ['2026-09', '190', 'ANY', 'INVITED', 10],
  ['2026-10', '190', 'ANY', 'INVITED', 900],
  ['2026-09', '190', '-', 'INVITED', 10],
  ['2026-10', '190', '-', 'INVITED', 900],
  // Other statuses are ignored.
  ['2026-09', '190', 'VIC', 'SUBMITTED', 10],
  ['2026-10', '190', 'VIC', 'SUBMITTED', 900],
];

describe('scopeMoves', () => {
  const r = scopeMoves(rows, '2026-09', '2026-10');
  const find = (visa: string, scope: string) => r.moves.find((m) => m.visa === visa && m.scope === scope);

  it('carries INVITED and LODGED together', () => {
    expect(find('190', 'QLD')).toEqual({
      visa: '190',
      scope: 'QLD',
      invited: { previous: 40, current: 100, delta: 60 },
      lodged: { previous: 200, current: 180, delta: -20 },
    });
  });

  it('skips masked comparisons and counts them', () => {
    expect(find('190', 'NSW')).toBeUndefined();
    expect(r.maskedSkipped).toBe(1);
  });

  it('treats a missing row as 0', () => {
    expect(find('491', 'SA')?.lodged).toEqual({ previous: 0, current: 30, delta: 30 });
  });

  it('compares 189 nationally only', () => {
    expect(find('189', 'N/A')?.invited.delta).toBe(-200);
    expect(r.moves.filter((m) => m.visa === '189')).toHaveLength(1);
  });

  it('leaves out ANY, "-" and other statuses', () => {
    expect(r.moves.map((m) => m.scope).sort()).toEqual(['N/A', 'QLD', 'SA']);
  });

  it('keeps a move where one status is masked and the other moved', () => {
    const m = scopeMoves(
      [
        ['2026-09', '491', 'WA', 'INVITED', '<20'],
        ['2026-10', '491', 'WA', 'INVITED', '<20'],
        ['2026-09', '491', 'WA', 'LODGED', 50],
        ['2026-10', '491', 'WA', 'LODGED', 70],
      ],
      '2026-09',
      '2026-10',
    );
    expect(m.moves).toHaveLength(1);
    expect(m.moves[0].invited.delta).toBeNull();
    expect(m.maskedSkipped).toBe(1);
  });
});

describe('moveSize', () => {
  const m = scopeMoves(rows, '2026-09', '2026-10').moves.find((x) => x.scope === 'QLD')!;
  it('ranks by the bigger change, or by one status', () => {
    expect(moveSize(m)).toBe(60);
    expect(moveSize(m, 'LODGED')).toBe(20);
    expect(moveSize(m, 'INVITED')).toBe(60);
  });
});

describe('computeMovers', () => {
  const occ = [
    { code: '111111', name: 'Made-up one', rows },
    { code: '222222', name: 'Made-up two', rows: [['2026-09', '190', 'QLD', 'INVITED', 0], ['2026-10', '190', 'QLD', 'INVITED', 75]] as MonthRow[] },
  ];

  it('compares the last two months, biggest first, and totals masked skips', () => {
    const r = computeMovers(occ, ['2026-08', '2026-09', '2026-10']);
    expect(r.month).toBe('2026-10');
    expect(r.previous).toBe('2026-09');
    expect(r.rows.map((m) => `${m.code} ${m.visa} ${m.scope}`)).toEqual(['111111 189 N/A', '222222 190 QLD', '111111 190 QLD', '111111 491 SA']);
    expect(r.maskedSkipped).toBe(1);
  });

  it('caps rows per visa and scope', () => {
    const r = computeMovers(occ, ['2026-09', '2026-10'], 1);
    expect(r.rows.filter((m) => m.scope === 'QLD').map((m) => m.code)).toEqual(['222222']);
  });

  it('returns nothing without two months', () => {
    expect(computeMovers(occ, ['2026-10']).rows).toEqual([]);
  });
});

describe('monthlyMoves', () => {
  it('lists months newest first and drops months without a move', () => {
    const r = monthlyMoves(rows, ['2026-08', '2026-09', '2026-10']);
    expect(r.map((x) => x.month)).toEqual(['2026-10', '2026-09']);
    expect(r[0].previous).toBe('2026-09');
    expect(monthlyMoves([], ['2026-09', '2026-10'])).toEqual([]);
  });
});
