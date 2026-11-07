// Build-time movers from data/eoi/history. Only import from .astro pages and endpoints.
import { computeMovers, type MoversResult } from '../movers';
import { getHistory, getMeta, getOccupations } from './eoi';

/** Rows kept per visa and state on /movers/, so the page stays light. */
export const MOVERS_PER_SCOPE = 40;

let cached: MoversResult | null = null;
export function getMovers(): MoversResult {
  if (cached) return cached;
  const occupations = getOccupations().map(({ code, name }) => ({ code, name, rows: getHistory(code).rows }));
  cached = computeMovers(occupations, getMeta().months, MOVERS_PER_SCOPE);
  return cached;
}
