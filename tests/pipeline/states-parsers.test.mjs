import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import mammoth from 'mammoth';
import * as P from '../../pipeline/states/parse.mjs';

const fx = (f, enc = 'utf8') => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), enc);

describe('WA SNMP invitations', () => {
  const wa = P.parseWaSnmp(fx('states/wa-snmp.html'));
  it('reads all three program-year tables', () => {
    expect(wa.years.map((y) => y.programYear)).toEqual(['2026-27', '2025-26', '2024-25']);
  });
  it('2026-27: totals and per-visa sums match the page', () => {
    const y = wa.years[0];
    expect(y).toMatchObject({ total: 2327, v190: 1620, v491: 707 });
    expect(y.months).toEqual([
      { month: '2026-09', total: 1100, v190: 784, v491: 316 },
      { month: '2026-10', total: 1227, v190: 836, v491: 391 },
    ]);
    for (const m of y.months) expect(m.v190 + m.v491).toBe(m.total);
  });
  it('maps Jan-Jun to the second calendar year', () => {
    expect(wa.years[1].months.find((m) => m.month === '2026-02').total).toBe(2400);
    expect(P.programMonth('2026-27', 'Jun')).toBe('2027-06');
    expect(P.programMonth('2026-27', 'Jul')).toBe('2026-07');
  });
  it('keeps the "issued on" prose', () => {
    expect(wa.issuedOn.join(' ')).toMatch(/issued on 14 October/);
  });
});

describe('ACT', () => {
  it('round page: counts per group, totals, schedule, allocation text', () => {
    const act = P.parseActRoundPage(fx('news/act-round.html'));
    expect(act.rounds).toHaveLength(1);
    const r = act.rounds[0];
    expect(r).toMatchObject({ date: '2026-10-12', invitations: 261, v190: 261, v491: 0 });
    expect(r.groups.map((g) => g.counts[190])).toEqual([54, 18, 126, 63]);
    expect(r.groups[1]).toMatchObject({ section: 'Canberra residents', minScore: { 190: 120, 491: null } });
    expect(act.schedule[0]).toBe('Week starting 12 October 2026 (Subclass 190 only)');
    expect(act.allocationText.join(' ')).toMatch(/2026-27 financial year has not yet been announced/);
  });
  it('library: finds the current rankings DOCX', () => {
    expect(P.findActRankingsDocx(fx('states/act-library.html'), 'https://www.act.gov.au/migration/resources/library-guidelines-and-invitations')).toBe(
      'https://www.act.gov.au/__data/assets/word_doc/0009/3140487/2026-27-Invitation-Round-Rankings.docx',
    );
  });
  it('rankings DOCX: round date and per unit group Matrix cut-offs', async () => {
    const html = (await mammoth.convertToHtml({ buffer: fx('states/act-rankings-2026-10-12.docx', null) })).value;
    const rk = P.parseActRankings(html);
    expect(rk.date).toBe('2026-10-12');
    expect(rk.cutoffs.length).toBeGreaterThan(100);
    expect(rk.cutoffs.find((c) => c.code === '2211')).toEqual({
      occupation: 'Accountants',
      code: '2211',
      matrix: {
        'canberra-491': null,
        'canberra-190': { score: 135, date: '2026-10-01' },
        'overseas-491': null,
        'overseas-190': { score: 110, date: null },
      },
    });
  });
  it('matrix cells', () => {
    expect(P.parseMatrixCell('130 (7/9/2026)')).toEqual({ score: 130, date: '2026-09-07' });
    expect(P.parseMatrixCell('N/A')).toBeNull();
    expect(P.parseMatrixCell('-')).toBeNull();
  });
});

describe('SA invitations', () => {
  it('dated round with year to date', () => {
    expect(P.parseSaInvitations(fx('states/sa-invitations-late-may-2026.html'))).toMatchObject({
      date: '2026-05-21',
      programYear: '2025-26',
      v190: 161,
      v491: 77,
      total: 238,
      ytd: { v190: 1767, v491: 1086, total: 2853 },
      other: null,
    });
  });
  it('month-only round', () => {
    expect(P.parseSaInvitations(fx('states/sa-invitations-april-2026.html'))).toMatchObject({ date: '2026-04', total: 445, ytd: { total: 2131 } });
  });
  it('Dec 2025 layout: round block second, interim block kept as other, no ytd', () => {
    const p = P.parseSaInvitations(fx('states/sa-invitations-dec-2025.html'));
    expect(p).toMatchObject({ date: '2025-12', total: 402, ytd: null, other: { label: 'Interim invitations to 1 November 2025', total: 185 } });
    expect(p.groups.every((g) => g.ytd === null)).toBe(true);
  });
  it('category page lists post URLs', () => {
    const urls = P.findSaInvitationPosts(fx('states/sa-invitations-category.html'), 'https://migration.sa.gov.au/news');
    expect(urls).toHaveLength(7);
    expect(urls[0]).toBe('https://migration.sa.gov.au/news/invitations-issued-late-may-2026');
  });
});

describe('occupation lists', () => {
  it('legislation latest page: compilation and text URL', () => {
    expect(P.parseLegislationLatest(fx('states/lin19051-latest.html'), 'https://www.legislation.gov.au/F2019L00278/latest')).toEqual({
      compilation: 'F2026C00265',
      textUrl: 'https://www.legislation.gov.au/F2019L00278/2026-03-28/2026-03-28/text/original/epub/OEBPS/document_1/document_1.html',
      asAt: '2026-03-28',
    });
  });
  it('LIN 19/051 text: sections 8, 9, 10 only', () => {
    const l = P.parseLin19051(fx('states/lin19051-text.html'));
    expect(Object.keys(l)).toEqual(['MLTSSL', 'STSOL', 'ROL']);
    expect(l.MLTSSL.slice(0, 2)).toEqual(['133111', '133211']);
    expect(l.STSOL[0]).toBe('121212');
    expect(l.ROL[0]).toBe('121111');
    for (const codes of Object.values(l)) expect(codes.every((c) => /^\d{6}$/.test(c))).toBe(true);
  });
  it('QLD onshore: ticks per visa', () => {
    const q = P.parseQldList(fx('states/qld-onshore.html'));
    expect(q.all[0]).toBe('121111');
    expect(q[491]).toContain('121111');
    expect(q[190]).not.toContain('121111');
  });
  it('QLD offshore', () => {
    const q = P.parseQldList(fx('states/qld-offshore.html'));
    expect(q.all.slice(0, 2)).toEqual(['133111', '133112']);
    expect(q[190]).toContain('133111');
    expect(q[190]).not.toContain('133112');
  });
  it('SA: data attributes', () => {
    expect(P.parseSaList(fx('states/sa-list.html'))).toHaveLength(6);
  });
  it('ACT: 491-only rows and as-at month', () => {
    const a = P.parseActList(fx('states/act-list.html'));
    expect(a.asAt).toBe('October 2025');
    expect(a.all).toContain('133112');
    expect(a[491]).toContain('133112');
    expect(a[190]).not.toContain('133112');
    expect(a[190]).toContain('133111');
  });
  it('NSW: 4-digit unit groups', () => {
    const n = P.parseNswList(fx('states/nsw-list.html'));
    expect(n.slice(0, 2)).toEqual(['1213', '1331']);
    expect(n.every((c) => /^\d{4}$/.test(c))).toBe(true);
  });
});
