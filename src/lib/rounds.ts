import type { RoundCutoff } from './data/types';

const STREAM: Record<string, string> = {
  'canberra-190': 'Canberra 190',
  'canberra-491': 'Canberra 491',
  'overseas-190': 'Overseas 190',
  'overseas-491': 'Overseas 491',
};

/** "Canberra 190: 100 · Overseas 190: 95" or "85", or "" when nothing was published. */
export function cutoffText(c: RoundCutoff): string {
  if (typeof c.points === 'number') return String(c.points);
  const m = c.matrix;
  if (typeof m === 'number') return `${m} (matrix)`;
  if (m && typeof m === 'object') {
    return Object.entries(m)
      .filter(([, v]) => v && typeof v.score === 'number')
      .map(([k, v]) => `${STREAM[k] ?? k}: ${v!.score}`)
      .join(' · ');
  }
  return '';
}

/** Only 6-digit codes have an occupation page. */
export function hasOccupationPage(code: string): boolean {
  return /^\d{6}$/.test(code);
}
