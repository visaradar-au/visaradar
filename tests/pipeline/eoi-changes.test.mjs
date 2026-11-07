import { describe, it, expect } from 'vitest';
import { eoiMonthChanges } from '../../pipeline/eoi-changes.mjs';

const meta = { sourceUrl: 'https://example.test/dashboard' };
const summary = {
  months: ['2026-09', '2026-10'],
  rows: [
    ['2026-09', '190', 'QLD', 'INVITED', 0], ['2026-10', '190', 'QLD', 'INVITED', 152],
    ['2026-09', '190', 'QLD', 'LODGED', 1400], ['2026-10', '190', 'QLD', 'LODGED', 1405],
    ['2026-09', '190', 'SA', 'INVITED', 300], ['2026-10', '190', 'SA', 'INVITED', 305],
    ['2026-09', '190', 'SA', 'LODGED', 500], ['2026-10', '190', 'SA', 'LODGED', 510],
    ['2026-09', '491', 'WA', 'INVITED', '<20'], ['2026-10', '491', 'WA', 'INVITED', 400],
    ['2026-09', '491', 'WA', 'LODGED', 50], ['2026-10', '491', 'WA', 'LODGED', 60],
    ['2026-09', '189', 'N/A', 'INVITED', 36], ['2026-10', '189', 'N/A', 'INVITED', 15369],
    ['2026-09', '189', 'N/A', 'LODGED', 6665], ['2026-10', '189', 'N/A', 'LODGED', 9028],
  ],
};

describe('eoiMonthChanges', () => {
  const out = eoiMonthChanges(summary, meta, '2026-11-02T00:00:00Z');
  it('announces the new month', () => {
    expect(out[0].title).toBe('SkillSelect EOI data for October 2026 is out');
  });
  it('reports a real move, worded as month-end status counts', () => {
    const qld = out.find((c) => c.state === 'QLD');
    expect(qld.title).toBe('Queensland, visa 190: EOIs in invited status 0 → 152, lodged 1,400 → 1,405 (October 2026 month end)');
  });
  it('ignores small moves', () => expect(out.find((c) => c.state === 'SA')).toBeUndefined());
  it('says nothing when a masked cell hides the move', () => expect(out.find((c) => c.state === 'WA')).toBeUndefined());
  it('reports 189 nationally', () => expect(out.find((c) => c.visa === '189').title).toMatch(/^Visa 189: EOIs in invited status 36 → 15,369/));
  it('treats a missing row as zero and needs two months', () => {
    expect(eoiMonthChanges({ months: ['2026-10'], rows: [] }, meta)).toEqual([]);
  });
  it('never claims invitations were issued', () => {
    for (const c of out) expect(c.title).not.toMatch(/invitations? (issued|sent)/i);
  });
});
