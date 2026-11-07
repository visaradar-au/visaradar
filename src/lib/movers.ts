// Month-on-month moves in INVITED and LODGED per occupation. Pure: safe in islands and tests.
//
// Rules:
// - A move needs a number on both sides. A "<20" cell on either side skips the move and is counted,
//   so the UI can say how many were left out. A missing row means no EOIs: 0 (as in monthSeries).
// - INVITED is EOIs in invited status at month end (a stock), never "invitations issued", so every
//   move carries the INVITED and the LODGED change together.
// - 190 and 491 are per state (the eight states only); 189 is national. Nothing is summed across states.
import { STATES, change, monthSeries, type Cell, type MonthRow, type Visa } from './eoi';

export const MOVER_VISAS = ['189', '190', '491'] as const;
export type MoverVisa = (typeof MOVER_VISAS)[number];
export type MoverStatus = 'INVITED' | 'LODGED';

/** The scopes a visa is compared in: 189 nationally ("N/A"), 190 and 491 per state. */
export function moverScopes(visa: MoverVisa): string[] {
  return visa === '189' ? ['N/A'] : [...STATES];
}

export interface Move {
  previous: Cell;
  current: Cell;
  /** null when either side is masked. */
  delta: number | null;
}

export interface ScopeMove {
  visa: MoverVisa;
  scope: string;
  invited: Move;
  lodged: Move;
}

export interface ScopeMoves {
  moves: ScopeMove[];
  /** Comparisons (one per visa, scope and status) left out because a side was "<20". */
  maskedSkipped: number;
}

/** Every visa and scope with a numeric, non-zero INVITED or LODGED change from `previous` to `month`. */
export function scopeMoves(rows: MonthRow[], previous: string, month: string): ScopeMoves {
  const moves: ScopeMove[] = [];
  let maskedSkipped = 0;
  for (const visa of MOVER_VISAS) {
    for (const scope of moverScopes(visa)) {
      const pair = (status: MoverStatus): Move => {
        const [p, c] = monthSeries(rows, [previous, month], visa as Visa, scope, status);
        const { delta } = change(c, p);
        if (delta === null) maskedSkipped++;
        return { previous: p, current: c, delta };
      };
      const invited = pair('INVITED');
      const lodged = pair('LODGED');
      if (invited.delta || lodged.delta) moves.push({ visa, scope, invited, lodged });
    }
  }
  return { moves, maskedSkipped };
}

/** Size of the biggest numeric change in a move, for ranking. */
export function moveSize(m: ScopeMove, by: MoverStatus | 'either' = 'either'): number {
  const i = Math.abs(m.invited.delta ?? 0);
  const l = Math.abs(m.lodged.delta ?? 0);
  return by === 'INVITED' ? i : by === 'LODGED' ? l : Math.max(i, l);
}

export interface Mover extends ScopeMove {
  code: string;
  name: string;
}

export interface MoversResult {
  month: string;
  previous: string;
  rows: Mover[];
  maskedSkipped: number;
}

/**
 * The biggest moves across occupations for the last month of `months` against the one before,
 * biggest first. `perScope` keeps at most that many rows per visa and scope.
 */
export function computeMovers(
  occupations: { code: string; name: string; rows: MonthRow[] }[],
  months: string[],
  perScope = Infinity,
): MoversResult {
  const month = months[months.length - 1] ?? '';
  const previous = months[months.length - 2] ?? '';
  if (!month || !previous) return { month, previous, rows: [], maskedSkipped: 0 };
  let maskedSkipped = 0;
  const all: Mover[] = [];
  for (const o of occupations) {
    const r = scopeMoves(o.rows, previous, month);
    maskedSkipped += r.maskedSkipped;
    for (const m of r.moves) all.push({ code: o.code, name: o.name, ...m });
  }
  all.sort((a, b) => moveSize(b) - moveSize(a) || a.code.localeCompare(b.code));
  const kept = new Map<string, number>();
  const rows = all.filter((m) => {
    const k = `${m.visa}|${m.scope}`;
    const n = kept.get(k) ?? 0;
    kept.set(k, n + 1);
    return n < perScope;
  });
  return { month, previous, rows, maskedSkipped };
}

/** One entry per month (newest first) with that month's moves for one occupation. Months without a move are left out. */
export function monthlyMoves(rows: MonthRow[], months: string[]): { month: string; previous: string; moves: ScopeMove[]; maskedSkipped: number }[] {
  const out = [];
  for (let i = months.length - 1; i >= 1; i--) {
    const r = scopeMoves(rows, months[i - 1], months[i]);
    if (r.moves.length) out.push({ month: months[i], previous: months[i - 1], ...r });
  }
  return out;
}
