import { describe, expect, it } from 'vitest';
import type { MonthRow } from '../../src/lib/eoi';
import type { Change } from '../../src/lib/data/types';
import { changeGuid, changeItems } from '../../src/lib/feeds';
import { monthEnd, moveLine, occupationFeedItems } from '../../src/lib/occupation-feed';

// Made-up fixture, not real data.
const rows: MonthRow[] = [
  ['2026-09', '190', 'QLD', 'INVITED', 40],
  ['2026-10', '190', 'QLD', 'INVITED', 100],
  ['2026-09', '190', 'QLD', 'LODGED', '<20'],
  ['2026-10', '190', 'QLD', 'LODGED', 25],
];

describe('occupationFeedItems', () => {
  const items = occupationFeedItems('111111', 'Made-up occupation', rows, ['2026-08', '2026-09', '2026-10'], 'https://example.org/o/');

  it('makes one item per month with a move, newest first, with a stable guid', () => {
    expect(items.map((i) => i.customData)).toEqual(['<guid isPermaLink="false">occ-111111-2026-10</guid>', '<guid isPermaLink="false">occ-111111-2026-09</guid>']);
    expect(items[0].title).toBe('Made-up occupation (111111): changes at the end of October 2026');
  });

  it('words invited as a month-end status, never as invitations issued', () => {
    expect(items[0].description).toContain('EOIs in invited status at month end 40 → 100 (+60)');
    expect(items[0].description).toContain('not invitations issued');
    expect(items[0].description).not.toMatch(/\d+ invitations (were )?issued/);
  });

  it('shows masked cells as masked and not compared', () => {
    expect(items[0].description).toContain('lodged <20 → 25 (masked, not compared)');
  });

  it('dates items at the month-end snapshot', () => {
    expect(items[0].pubDate?.toISOString()).toBe('2026-10-31T13:59:00.000Z');
    expect(monthEnd('2026-02').toISOString()).toBe('2026-02-28T13:59:00.000Z');
  });

  it('names 189 as national', () => {
    expect(moveLine({ visa: '189', scope: 'N/A', invited: { previous: 0, current: 30, delta: 30 }, lodged: { previous: 0, current: 0, delta: 0 } })).toMatch(/^Visa 189 \(national\): /);
  });
});

describe('changeGuid', () => {
  const base: Change = { at: '2026-11-01T23:30:13.952Z', kind: 'eoi-month', source: 'skillselect', title: 'x', url: 'https://example.org/' };
  it('is unique per visa and state for SkillSelect changes that share a link', () => {
    expect(changeGuid({ ...base, visa: '190', state: 'NT' })).toBe('eoi-2026-11-01T23:30:13.952Z-190-NT');
    expect(changeGuid({ ...base, visa: '189', state: null })).toBe('eoi-2026-11-01T23:30:13.952Z-189-national');
  });
  it('falls back to a title hash and goes into the feed item', () => {
    const a = changeGuid({ ...base, title: 'one' });
    expect(a).not.toBe(changeGuid({ ...base, title: 'two' }));
    expect(changeItems([{ ...base, title: 'one' }])[0].customData).toBe(`<guid isPermaLink="false">${a}</guid>`);
  });
});
