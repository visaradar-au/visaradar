// Pure helpers for SkillSelect EOI data. No file access: safe to use in islands and tests.
//
// Rules the helpers enforce:
// - "<20" cells are masked by the department. They are never counted; callers get how many
//   masked cells were left out so the UI can say so.
// - An EOI can name several states, so nothing here adds counts across states or visas.
// - INVITED is a month-end stock, so its change is reported together with LODGED.

export type Cell = number | '<20';
export type Visa = '189' | '190' | '491' | '491F';
export type Status = 'SUBMITTED' | 'INVITED' | 'LODGED' | 'HOLD';
/** [visa, state, status, score, count] */
export type OccRow = [Visa, string, Status, number, Cell];
/** [month, visa, state, status, count] */
export type MonthRow = [string, Visa, string, Status, Cell];

export const STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'] as const;
export type StateCode = (typeof STATES)[number];
/** Visas with occupation, points and state rows: the defaults for every selector. */
export const VISAS: Visa[] = ['189', '190', '491', '491F'];
/** Business visas in SkillSelect. They have no occupation or points rows, only national counts (pathways.json). */
export type BusinessVisa = '132' | '188BI' | '188EV' | '188INV' | '188SIG';
export type PathwayVisa = Visa | BusinessVisa;
export const PATHWAY_VISAS: PathwayVisa[] = [...VISAS, '188BI', '188EV', '188INV', '188SIG', '132'];
/** Visas where the EOI names a state. 189 and 491F are national (state "N/A"). */
export const STATE_VISAS: Visa[] = ['190', '491'];

export const STATE_NAMES: Record<StateCode, string> = {
  ACT: 'Australian Capital Territory',
  NSW: 'New South Wales',
  NT: 'Northern Territory',
  QLD: 'Queensland',
  SA: 'South Australia',
  TAS: 'Tasmania',
  VIC: 'Victoria',
  WA: 'Western Australia',
};

export const VISA_NAMES: Record<Visa, string> = {
  '189': '189 Skilled Independent',
  '190': '190 Skilled Nominated',
  '491': '491 Regional, state nominated',
  '491F': '491 Regional, family sponsored',
};

export const PATHWAY_NAMES: Record<PathwayVisa, string> = {
  ...VISA_NAMES,
  '132': '132 Business Talent, Significant Business History',
  '188BI': '188 Business Innovation',
  '188EV': '188 Entrepreneur',
  '188INV': '188 Investor',
  '188SIG': '188 Significant Investor',
};

export function isMasked(c: Cell | null | undefined): c is '<20' {
  return c === '<20';
}

export function isStateCode(s: string): s is StateCode {
  return (STATES as readonly string[]).includes(s);
}

/** The state value used in the data for a visa: 189 and 491F have no state. */
export function scopesFor(visa: Visa): string[] {
  return visa === '190' || visa === '491' ? [...STATES, 'ANY'] : ['N/A'];
}

export function scopeLabel(scope: string): string {
  if (scope === 'ANY') return 'Any state';
  if (scope === 'N/A') return 'National';
  return isStateCode(scope) ? STATE_NAMES[scope] : scope;
}

export interface PoolCell {
  score: number;
  count: Cell;
}

/** EOI counts by points score for one visa and one state, lowest score first. */
export function poolByPoints(rows: OccRow[], visa: Visa, scope: string, status: Status = 'SUBMITTED'): PoolCell[] {
  return rows
    .filter((r) => r[0] === visa && r[1] === scope && r[2] === status)
    .map((r) => ({ score: r[3], count: r[4] }))
    .sort((a, b) => a.score - b.score);
}

/** Every score that appears for a visa across all scopes, so charts share an x-axis. */
export function scoreAxis(rows: OccRow[], visa: Visa, status: Status = 'SUBMITTED'): number[] {
  const set = new Set<number>();
  for (const r of rows) if (r[0] === visa && r[2] === status) set.add(r[3]);
  if (!set.size) return [];
  const sorted = [...set].sort((a, b) => a - b);
  const out: number[] = [];
  for (let s = sorted[0]; s <= sorted[sorted.length - 1]; s += 5) out.push(s);
  return out;
}

export interface PoolTotal {
  /** Sum of the numeric cells only. */
  counted: number;
  /** Number of "<20" cells left out of `counted`. */
  maskedCells: number;
  cells: number;
}

export function poolTotal(pool: PoolCell[]): PoolTotal {
  let counted = 0;
  let maskedCells = 0;
  for (const c of pool) {
    if (isMasked(c.count)) maskedCells++;
    else counted += c.count;
  }
  return { counted, maskedCells, cells: pool.length };
}

export interface Position {
  points: number;
  /** EOIs at exactly this score; "<20" when masked; 0 when no cell exists. */
  at: Cell;
  /** Numeric EOIs at higher scores. */
  above: number;
  /** Numeric EOIs at lower scores. */
  below: number;
  maskedAbove: number;
  maskedBelow: number;
  /** All masked cells not counted, including the one at this score. */
  maskedExcluded: number;
}

/** Where a points score sits in a pool. Masked cells are excluded and counted separately. */
export function positionAt(pool: PoolCell[], points: number): Position {
  const pos: Position = { points, at: 0, above: 0, below: 0, maskedAbove: 0, maskedBelow: 0, maskedExcluded: 0 };
  for (const c of pool) {
    const masked = isMasked(c.count);
    if (masked) pos.maskedExcluded++;
    if (c.score === points) pos.at = c.count;
    else if (c.score > points) masked ? pos.maskedAbove++ : (pos.above += c.count as number);
    else masked ? pos.maskedBelow++ : (pos.below += c.count as number);
  }
  return pos;
}

/** One value per month for a visa, scope and status. A missing row means no EOIs: 0. */
export function monthSeries(rows: MonthRow[], months: string[], visa: Visa, scope: string, status: Status): Cell[] {
  const byMonth = new Map<string, Cell>();
  for (const r of rows) if (r[1] === visa && r[2] === scope && r[3] === status) byMonth.set(r[0], r[4]);
  return months.map((m) => byMonth.get(m) ?? 0);
}

export interface Change {
  current: Cell;
  previous: Cell | null;
  /** null when either month is masked or there is no previous month. */
  delta: number | null;
}

export function change(current: Cell, previous: Cell | null): Change {
  const delta = previous === null || isMasked(current) || isMasked(previous) ? null : current - previous;
  return { current, previous, delta };
}

/** Month-on-month change for the last month of a series. */
export function lastChange(series: Cell[]): Change {
  if (!series.length) return { current: 0, previous: null, delta: null };
  return change(series[series.length - 1], series.length > 1 ? series[series.length - 2] : null);
}

/** INVITED and LODGED changes together, because INVITED alone is a stock that falls as people lodge. */
export function invitedLodgedChange(rows: MonthRow[], months: string[], visa: Visa, scope: string) {
  return {
    invited: lastChange(monthSeries(rows, months, visa, scope, 'INVITED')),
    lodged: lastChange(monthSeries(rows, months, visa, scope, 'LODGED')),
  };
}

export interface StateMetric {
  submitted: Change;
  invited: Change;
  lodged: Change;
}

/** Per-state metrics for one visa from the summary rows. One entry per scope, never a total. */
export function stateMetrics(rows: MonthRow[], months: string[], visa: Visa): Record<string, StateMetric> {
  const recent = months.slice(-2);
  const out: Record<string, StateMetric> = {};
  for (const scope of scopesFor(visa)) {
    out[scope] = {
      submitted: lastChange(monthSeries(rows, recent, visa, scope, 'SUBMITTED')),
      invited: lastChange(monthSeries(rows, recent, visa, scope, 'INVITED')),
      lodged: lastChange(monthSeries(rows, recent, visa, scope, 'LODGED')),
    };
  }
  return out;
}

/** Numeric value of a cell for colour scales; masked cells have none. */
export function numeric(c: Cell | null | undefined): number | null {
  return c === null || c === undefined || isMasked(c) ? null : c;
}
