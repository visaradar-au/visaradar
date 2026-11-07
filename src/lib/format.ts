// Shared formatters. Dates show in Brisbane time, where the project is run from.
const TZ = 'Australia/Brisbane';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "2026-10" -> "October 2026" */
export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return `${MONTHS[m - 1]} ${y}`;
}

/** "2026-10" -> "Oct 2026" */
export function formatMonthShort(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return `${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

/** ISO date or datetime -> "2 Nov 2026" (Brisbane time). Returns "" for null or invalid input. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00+10:00` : iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ })
    .format(d)
    .replace(/\./g, '');
}

const nf = new Intl.NumberFormat('en-AU');
export function formatNumber(n: number): string {
  return nf.format(n);
}

/** Signed change with a true minus sign: "+1,204", "−56", "0". */
export function formatDelta(n: number): string {
  if (n === 0) return '0';
  return `${n > 0 ? '+' : '−'}${nf.format(Math.abs(n))}`;
}

/** A SkillSelect cell: a number or the masked "<20". */
export function formatCell(c: number | '<20' | null | undefined): string {
  if (c === '<20') return '<20';
  if (c === null || c === undefined) return '0';
  return nf.format(c);
}
