import { describe, it, expect } from 'vitest';
import { canonicalUrl, makeId, parseAuDate, parseSitemap, clean } from '../../pipeline/news/util.mjs';

describe('canonicalUrl', () => {
  it('normalises scheme, host case, fragment and trailing slash', () => {
    expect(canonicalUrl('http://Migration.SA.gov.au/news/abc/#top')).toBe('https://migration.sa.gov.au/news/abc');
  });
  it('keeps identity query params sorted and drops utm_*', () => {
    expect(canonicalUrl('https://immi.homeaffairs.gov.au/a?utm_source=x&itemId=5&b=1')).toBe(
      'https://immi.homeaffairs.gov.au/a?b=1&itemId=5',
    );
  });
  it('resolves relative URLs and keeps the root slash', () => {
    expect(canonicalUrl('/news/x', 'https://migration.qld.gov.au/news')).toBe('https://migration.qld.gov.au/news/x');
    expect(canonicalUrl('https://theterritory.com.au/')).toBe('https://theterritory.com.au/');
  });
});

describe('makeId', () => {
  it('is 12 hex chars and stable across URL spellings', () => {
    const a = makeId('https://migration.sa.gov.au/news/x');
    expect(a).toMatch(/^[0-9a-f]{12}$/);
    expect(makeId('http://migration.sa.gov.au/news/x/#frag')).toBe(a);
  });
  it('differs when a key is given', () => {
    expect(makeId('https://www.act.gov.au/migration', 'a')).not.toBe(makeId('https://www.act.gov.au/migration', 'b'));
  });
});

describe('parseAuDate', () => {
  it.each([
    ['22nd Oct 2026', '2026-10-22'],
    ['1st Sept 2026', '2026-09-01'],
    ['27 September 2023', '2023-09-27'],
    ['Last published: 4:36 pm, Friday, 30 October 2026', '2026-10-30'],
    ['Fri, 03/07/2026 - 10:40', '2026-07-03'],
    ['130 (7/9/2026)', '2026-09-07'],
    ['Canberra Matrix Invitation Round: 12 October 2026', '2026-10-12'],
  ])('%s -> %s', (s, want) => expect(parseAuDate(s)).toBe(want));

  it('keeps the local date of an ISO timestamp instead of shifting to UTC', () => {
    // 00:30 in Brisbane is the previous day in UTC; we must keep 1 July.
    expect(parseAuDate('2026-07-01T00:30:00+10:00')).toBe('2026-07-01');
  });
  it('returns null for junk', () => {
    expect(parseAuDate('no date here')).toBeNull();
    expect(parseAuDate('31/13/2026')).toBeNull();
    expect(parseAuDate(null)).toBeNull();
  });
});

describe('parseSitemap / clean', () => {
  it('reads loc and lastmod', () => {
    const xml = '<urlset><url><loc>https://x.au/a?b=1&amp;c=2</loc><lastmod>2026-10-23T08:55:10+10:30</lastmod></url><url><loc>https://x.au/b</loc></url></urlset>';
    expect(parseSitemap(xml)).toEqual([
      { loc: 'https://x.au/a?b=1&c=2', lastmod: '2026-10-23' },
      { loc: 'https://x.au/b', lastmod: null },
    ]);
  });
  it('collapses whitespace and nbsp', () => expect(clean(' a \n b ')).toBe('a b'));
});
