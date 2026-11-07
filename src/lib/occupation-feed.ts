// RSS items for one occupation: its monthly INVITED and LODGED moves. Pure: safe in tests.
import type { RSSFeedItem } from '@astrojs/rss';
import { STATE_NAMES, isStateCode, type MonthRow } from './eoi';
import { formatCell, formatDelta, formatMonth } from './format';
import { monthlyMoves, type Move, type ScopeMove } from './movers';

const where = (m: ScopeMove) => (m.visa === '189' ? 'Visa 189 (national)' : `Visa ${m.visa}, ${isStateCode(m.scope) ? STATE_NAMES[m.scope] : m.scope}`);

const move = (m: Move) =>
  m.delta === null ? `${formatCell(m.previous)} → ${formatCell(m.current)} (masked, not compared)` : `${formatCell(m.previous)} → ${formatCell(m.current)} (${formatDelta(m.delta)})`;

/** One line per visa and scope: invited and lodged together. */
export function moveLine(m: ScopeMove): string {
  return `${where(m)}: EOIs in invited status at month end ${move(m.invited)}, lodged ${move(m.lodged)}`;
}

/** The last day of a "YYYY-MM" month at 23:59 Brisbane time: the snapshot date, not a publication date. */
export function monthEnd(month: string): Date {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0, 13, 59));
}

export function occupationFeedItems(code: string, name: string, rows: MonthRow[], months: string[], link: string): RSSFeedItem[] {
  return monthlyMoves(rows, months).map(({ month, previous, moves }) => ({
    title: `${name} (${code}): changes at the end of ${formatMonth(month)}`,
    link,
    pubDate: monthEnd(month),
    description:
      `SkillSelect month-end snapshot as at the end of ${formatMonth(month)}, compared with ${formatMonth(previous)}. ` +
      `Invited counts EOIs still in invited status at month end, not invitations issued. Counts under 20 are masked and not compared. ` +
      moves.map(moveLine).join('. ') +
      '.',
    customData: `<guid isPermaLink="false">occ-${code}-${month}</guid>`,
  }));
}
