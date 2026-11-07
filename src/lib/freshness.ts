// "Data checked" line: when each source was last read. Pure: no file access.
import type { FetchState } from './data/types';

const TZ = 'Australia/Brisbane';

export const NEWS_GROUP = ['homeaffairs', 'legislation', 'pm'];
export const STATE_GROUP = ['act', 'nsw', 'nt', 'qld', 'sa', 'tas', 'vic', 'wa'];

/** ISO datetime -> "21:36, 7 Nov" in Brisbane time. "" for null or invalid input. */
export function formatCheck(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const time = new Intl.DateTimeFormat('en-AU', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TZ }).format(d);
  const day = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', timeZone: TZ }).format(d).replace(/\./g, '');
  return `${time}, ${day}`;
}

export interface Unreachable {
  source: string;
  /** Last successful read, or null when it has never been reached. */
  since: string | null;
}

export interface GroupFreshness {
  /** Latest successful read across the group's sources. */
  checked: string | null;
  unreachable: Unreachable[];
}

/** A source is unreachable when its latest attempt failed (after its last success, if any). */
export function groupFreshness(state: Record<string, FetchState>, sources: string[]): GroupFreshness {
  let checked: string | null = null;
  const unreachable: Unreachable[] = [];
  for (const s of sources) {
    const f = state[s];
    if (!f) continue;
    if (f.lastOk && (!checked || f.lastOk > checked)) checked = f.lastOk;
    const failedLast = !!f.lastError && (!f.lastOk || !f.lastErrorAt || f.lastErrorAt > f.lastOk);
    if (failedLast) unreachable.push({ source: s, since: f.lastOk });
  }
  return { checked, unreachable };
}
