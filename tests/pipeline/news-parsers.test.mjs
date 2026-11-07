import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as qld from '../../pipeline/news/qld.mjs';
import * as sa from '../../pipeline/news/sa.mjs';
import * as nsw from '../../pipeline/news/nsw.mjs';
import * as wa from '../../pipeline/news/wa.mjs';
import * as tas from '../../pipeline/news/tas.mjs';
import * as act from '../../pipeline/news/act.mjs';
import * as homeaffairs from '../../pipeline/news/homeaffairs.mjs';
import * as vic from '../../pipeline/news/vic.mjs';
import * as nt from '../../pipeline/news/nt.mjs';

const fx = (f) => readFileSync(new URL(`./fixtures/news/${f}`, import.meta.url), 'utf8');

function checkShape(items, source) {
  for (const i of items) {
    expect(i.source).toBe(source);
    expect(i.id).toMatch(/^[0-9a-f]{12}$/);
    expect(i.title.length).toBeGreaterThan(2);
    expect(i.url).toMatch(/^https:\/\//);
    if (i.published !== null) expect(i.published).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }
  expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
}

describe('every source module exports the contract', () => {
  it.each([homeaffairs, qld, nsw, vic, sa, wa, tas, act, nt])('$id', (m) => {
    expect(typeof m.id).toBe('string');
    expect(typeof m.name).toBe('string');
    expect(m.urls).toBeTypeOf('object');
    expect(m.fetch).toBeTypeOf('function');
    expect(m.parse).toBeTypeOf('function');
  });
});

describe('qld', () => {
  it('joins news cards to sitemap lastmod and drops sandbox URLs', () => {
    const lm = qld.parseLastmods(fx('qld-sitemap.xml'));
    expect([...lm.keys()].some((u) => /sandbox|agent-portal/.test(u))).toBe(false);
    const items = qld.parse(fx('qld-news.html'), qld.urls.news, lm);
    checkShape(items, 'qld');
    expect(items).toHaveLength(8);
    expect(items[0]).toMatchObject({
      title: '2026-27 SNMP now published',
      url: 'https://migration.qld.gov.au/news/2026-27-queenslands-state-nominated-migration-program-now-published',
      published: '2026-10-31',
      excerpt: null,
    });
  });
  it('leaves published null without a sitemap', () => {
    expect(qld.parse(fx('qld-news.html'), qld.urls.news)[0].published).toBeNull();
  });
});

describe('sa', () => {
  it('reads ordinal dates and titles, ignores non-news h3', () => {
    const items = sa.parse(fx('sa-news.html'), sa.urls.news);
    checkShape(items, 'sa');
    expect(items).toHaveLength(8);
    expect(items[0]).toMatchObject({
      title: 'South Australia’s General Skilled Migration Program Update',
      published: '2026-10-22',
    });
    expect(items.find((i) => i.url.endsWith('invitations-issued-late-may-2026')).published).toBe('2026-05-21');
  });
});

describe('nsw', () => {
  it('reads cards with visible dates and summaries, skipping nav links', () => {
    const items = nsw.parse(fx('nsw-news.html'), nsw.urls.news);
    checkShape(items, 'nsw');
    expect(items).toHaveLength(3);
    expect(items[0].published).toBe('2023-09-27');
    expect(items[0].excerpt).toMatch(/^To better address/);
  });
  it('turns a watched page into a dated "Page updated" item', () => {
    const it = nsw.parsePage(fx('nsw-page-190.html'), nsw.urls.pages[0]);
    expect(it).toMatchObject({ title: 'Page updated: Skilled Nominated visa (subclass 190)', published: '2026-10-15' });
  });
});

describe('wa', () => {
  it('reads DD/MM/YYYY dates as written (no UTC shift)', () => {
    const items = wa.parse(fx('wa-news.html'), wa.urls.news);
    checkShape(items, 'wa');
    expect(items).toHaveLength(5);
    // <time datetime> is 2026-07-03T02:40:04Z; the visible local date is 03/07/2026.
    expect(items[0].published).toBe('2026-07-03');
    expect(items.every((i) => i.excerpt === null)).toBe(true);
  });
});

describe('tas', () => {
  it('reads undated article cards', () => {
    const items = tas.parse(fx('tas-news.html'), tas.urls.news);
    checkShape(items, 'tas');
    expect(items).toHaveLength(6);
    expect(items[1].title).toBe('Program Update - August 2026 - 2026-27 Program Opening');
    expect(items.every((i) => i.published === null)).toBe(true);
  });
});

describe('act', () => {
  it('reads update bullets with distinct ids even when they share a URL', () => {
    const items = act.parse(fx('act-home.html'), act.urls.home);
    checkShape(items, 'act');
    expect(items).toHaveLength(5);
    expect(items[1].url).toBe('https://www.act.gov.au/migration');
    expect(items[1].excerpt).toMatch(/not yet been confirmed/);
  });
  it('reads the dated round heading, not the schedule', () => {
    const items = act.parseRoundPage(fx('act-round.html'), act.urls.round);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: 'Canberra Matrix Invitation Round: 12 October 2026', published: '2026-10-12' });
  });
});

describe('blocked sources (synthetic fixtures, parsers unvalidated)', () => {
  it('homeaffairs: itemId links, deduped, dated', () => {
    const items = homeaffairs.parse(fx('synthetic-homeaffairs-archive.html'), homeaffairs.urls.news);
    checkShape(items, 'homeaffairs');
    expect(items.map((i) => i.published)).toEqual(['2026-09-25', '2026-09-18']);
  });
  it('vic: year/slug article links', () => {
    const items = vic.parse(fx('synthetic-vic-news.html'), vic.urls.news);
    checkShape(items, 'vic');
    expect(items.map((i) => [i.title, i.published])).toEqual([
      ['Example program news', '2026-10-26'],
      ['Example fees news', '2026-10-13'],
    ]);
  });
  it('nt: dated same-host cards only', () => {
    const items = nt.parse(fx('synthetic-nt-home.html'), nt.urls.news);
    expect(items.map((i) => i.title)).toEqual(['Example NT migration update']);
    expect(items[0].published).toBe('2026-08-20');
  });
});
