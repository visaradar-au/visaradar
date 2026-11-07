import { readData } from './read';
import type { EoiMeta, EoiSummary, OccupationDetail, OccupationHistory, OccupationSummary } from './types';
import { STATES, poolByPoints, poolTotal, stateMetrics, type StateMetric, type Visa } from '../eoi';

export function getMeta(): EoiMeta {
  return readData<EoiMeta>('eoi/meta.json', {
    source: 'SkillSelect EOI data',
    sourceUrl: '',
    lastReload: '',
    latestMonth: '',
    months: [],
    fetchedAt: '',
    notes: [],
  });
}

export function getOccupations(): OccupationSummary[] {
  return readData<OccupationSummary[]>('eoi/occupations.json', []);
}

export function getOccupation(code: string): OccupationDetail | null {
  return readData<OccupationDetail | null>(`eoi/occ/${code}.json`, null);
}

export function getHistory(code: string): OccupationHistory {
  return readData<OccupationHistory>(`eoi/history/${code}.json`, { code, rows: [] });
}

export function getSummary(): EoiSummary {
  return readData<EoiSummary>('eoi/summary.json', { months: [], rows: [] });
}

export type MapMetrics = Record<'190' | '491', Record<string, StateMetric>>;

export function getMapMetrics(): MapMetrics {
  const { months, rows } = getSummary();
  return { '190': stateMetrics(rows, months, '190'), '491': stateMetrics(rows, months, '491') };
}

export interface OccupationStat {
  code: string;
  name: string;
  /** 189 pool: numeric SUBMITTED cells only. */
  pool189: number;
  /** Largest single-state 190 pool and which state. Never a sum across states. */
  pool190: { state: string; counted: number } | null;
  pool491: { state: string; counted: number } | null;
}

function largestStatePool(rows: OccupationDetail['rows'], visa: Visa) {
  let best: { state: string; counted: number } | null = null;
  for (const s of STATES) {
    const { counted } = poolTotal(poolByPoints(rows, visa, s));
    if (counted > 0 && (!best || counted > best.counted)) best = { state: s, counted };
  }
  return best;
}

let stats: OccupationStat[] | null = null;
export function getOccupationStats(): OccupationStat[] {
  if (stats) return stats;
  stats = getOccupations().map(({ code, name }) => {
    const rows = getOccupation(code)?.rows ?? [];
    return {
      code,
      name,
      pool189: poolTotal(poolByPoints(rows, '189', 'N/A')).counted,
      pool190: largestStatePool(rows, '190'),
      pool491: largestStatePool(rows, '491'),
    };
  });
  return stats;
}

/** Occupations with the most numeric SUBMITTED EOIs naming one state for one visa. */
export function topOccupationsForState(state: string, visa: Visa, limit = 10) {
  return getOccupations()
    .map(({ code, name }) => {
      const t = poolTotal(poolByPoints(getOccupation(code)?.rows ?? [], visa, state));
      return { code, name, counted: t.counted, maskedCells: t.maskedCells };
    })
    .filter((o) => o.counted > 0)
    .sort((a, b) => b.counted - a.counted)
    .slice(0, limit);
}
