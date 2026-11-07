// Offline tests for the newer official sources: Federal Register of Legislation, PM media
// RSS and the data.gov.au Home Affairs datasets. Fixtures are real responses saved 2026-11-07.
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as legislation from '../../pipeline/news/legislation.mjs';
import * as pm from '../../pipeline/news/pm.mjs';
import * as sa from '../../pipeline/news/sa.mjs';
import { run as runNews, mergeTags } from '../../pipeline/news.mjs';
import { run as runDatasets, parse as parseDatasets, datasetChanges, summary, API_URL } from '../../pipeline/datasets.mjs';
import { CRAWL_DELAY } from '../../pipeline/news/http.mjs';

const fx = (f) => readFileSync(new URL(`./fixtures/live/${f}`, import.meta.url), 'utf8');
const fxNews = (f) => readFileSync(new URL(`./fixtures/news/${f}`, import.meta.url), 'utf8');
const read = (dir, f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));

function fakeGet(routes) {
  const calls = [];
  const get = async (url, opts = {}) => {
    calls.push({ url, opts });
    const r = routes[url] ?? { status: 403 };
    const ok = r.status >= 200 && r.status < 300;
    return { ok, status: r.status, notModified: r.status === 304, body: ok ? r.body : null, etag: null, lastModified: null, error: ok || r.status === 304 ? null : `HTTP ${r.status}`, url };
  };
  get.calls = calls;
  return get;
}

const NOW = new Date('2026-11-07T10:00:00Z');

let dir;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'vr-live-'));
  mkdirSync(join(dir, 'news'));
  writeFileSync(join(dir, 'news', 'items.json'), '[]');
  writeFileSync(join(dir, 'news', 'fetch-state.json'), '{}');
  writeFileSync(join(dir, 'changes.json'), '[]');
});

describe('legislation', () => {
  it('parses titles into register "as made" links dated by registration', () => {
    const items = legislation.parse(fx('legislation-titles.json'));
    expect(items).toHaveLength(20);
    expect(items[0]).toMatchObject({
      source: 'legislation',
      title: 'Migration Amendment (Referred Stay (Permanent) (Class DH) Visa) Regulations 2026',
      url: 'https://www.legislation.gov.au/F2026L01466/asmade',
      published: '2026-11-02',
      excerpt: null,
    });
    expect(items.every((i) => /^https:\/\/www\.legislation\.gov\.au\/F\d{4}L\d{5}\/asmade$/.test(i.url))).toBe(true);
    expect(new Set(items.map((i) => i.id)).size).toBe(20);
  });

  it('keeps the register date as written, with no timezone shift', () => {
    const [i] = legislation.parse({ value: [{ id: 'F2026L00001', name: 'Migration X', asMadeRegisteredAt: '2026-11-01T00:30:00.1' }] });
    expect(i.published).toBe('2026-11-01');
  });

  it('skips rows without an id or a name', () => {
    expect(legislation.parse({ value: [{ id: '', name: 'x' }, { id: 'F1', name: '' }] })).toEqual([]);
  });

  it('tags occupation instruments as occupation-list, everything else as policy', () => {
    expect(legislation.tags({ title: 'Migration (Specification of Occupations—Subclass 482 Visa) Instrument 2024' })).toEqual(['occupation-list']);
    expect(legislation.tags({ title: 'Migration Amendment (2026 Measures No. 1) Regulations 2026' })).toEqual(['policy']);
  });

  it('asks for at most 20 Migration titles, newest registration first, with a 10 s crawl delay', () => {
    const u = new URL(legislation.urls.api);
    expect(u.searchParams.get('$filter')).toBe("startswith(name,'Migration')");
    expect(u.searchParams.get('$orderby')).toBe('asMadeRegisteredAt desc');
    expect(u.searchParams.get('$top')).toBe('20');
    expect(CRAWL_DELAY[u.host]).toBe(10);
  });

  it('carries the attribution wording the terms of use require', () => {
    expect(legislation.attribution('7 November 2026')).toBe(
      'Sourced from the Federal Register of Legislation at 7 November 2026. For the latest information on Australian Government law please go to https://www.legislation.gov.au.',
    );
  });
});

describe('pm', () => {
  it('keeps no items from a feed with nothing about migration', () => {
    expect(pm.parse(fx('pm-rss.xml'))).toEqual([]);
  });

  it('keeps migration items, matching on title or description, and dates them', () => {
    const extra = `<item>
  <title>Stronger skilled migration system</title>
  <link>https://www.pm.gov.au/media/stronger-skilled-migration-system</link>
  <description>Today we announce changes.</description>
  <pubDate>Thursday 5 November 2026</pubDate>
</item>
<item>
  <title>Joint media release</title>
  <link>https://www.pm.gov.au/media/joint-media-release-education</link>
  <description>Caps on international students &amp;amp; new settings.</description>
  <pubDate>Wednesday 4 November 2026</pubDate>
</item>
<item>
  <title>Revisited: a visit to Perth</title>
  <link>https://www.pm.gov.au/media/visit-perth</link>
  <description>Visiting the visitor centre.</description>
  <pubDate>Tuesday 3 November 2026</pubDate>
</item>`;
    const xml = fx('pm-rss.xml').replace('<item>', `${extra}\n<item>`);
    const items = pm.parse(xml);
    expect(items.map((i) => i.title)).toEqual(['Stronger skilled migration system', 'Joint media release']);
    expect(items[0]).toMatchObject({ source: 'pm', url: 'https://www.pm.gov.au/media/stronger-skilled-migration-system', published: '2026-11-05', excerpt: null });
    expect(items[1].published).toBe('2026-11-04');
  });

  it.each([
    ['Net overseas migration falls', true],
    ['Visa changes for workers', true],
    ['Minister for Home Affairs statement', true],
    ['Immigration detention update', true],
    ['Skilled visas for regional Australia', true],
    ['Skilled trades and TAFE', false],
    ['Visiting Papua New Guinea', false],
    ['Advisory board appointments', false],
  ])('keyword rules: %s -> %s', (text, kept) => {
    expect(pm.isMigrationRelated(text)).toBe(kept);
  });
});

describe('news orchestrator with the new sources', () => {
  it("merges a source's own tags with keyword tags, dropping 'other'", () => {
    expect(mergeTags(['policy'], ['other'])).toEqual(['policy']);
    expect(mergeTags(['occupation-list'], ['fees'])).toEqual(['occupation-list', 'fees']);
    expect(mergeTags([], ['other'])).toEqual(['other']);
  });

  it("bootstraps a new source's changes even when other sources already have items", async () => {
    await runNews({ dataDir: dir, sources: [sa], get: fakeGet({ [sa.urls.news]: { status: 200, body: fxNews('sa-news.html') } }), now: NOW });
    const before = read(dir, 'changes.json').length;
    const later = new Date('2026-11-07T10:30:00Z');
    await runNews({ dataDir: dir, sources: [legislation], get: fakeGet({ [legislation.urls.api]: { status: 200, body: fx('legislation-titles.json') } }), now: later });

    const items = read(dir, 'news/items.json').filter((i) => i.source === 'legislation');
    expect(items).toHaveLength(20);
    expect(items.every((i) => i.tags.includes('policy') && !i.tags.includes('other'))).toBe(true);

    // Only legislation registered since 8 Oct 2026 (30 days) reaches the change feed, dated by registration.
    const added = read(dir, 'changes.json').filter((c) => c.source === 'legislation');
    expect(read(dir, 'changes.json').length - before).toBe(added.length);
    expect(added.map((c) => c.at)).toEqual(['2026-11-02', '2026-10-31', '2026-10-30']);
    expect(added[0]).toMatchObject({ kind: 'news', url: 'https://www.legislation.gov.au/F2026L01466/asmade' });

    // A later new title is dated by when we first saw it.
    const j = JSON.parse(fx('legislation-titles.json'));
    j.value.unshift({ id: 'F2026L01500', name: 'Migration (Specification of Occupations) Instrument 2026', collection: 'LegislativeInstrument', asMadeRegisteredAt: '2026-11-07T09:00:00.0' });
    const later2 = new Date('2026-11-07T11:00:00Z');
    await runNews({ dataDir: dir, sources: [legislation], get: fakeGet({ [legislation.urls.api]: { status: 200, body: JSON.stringify(j) } }), now: later2 });
    const c = read(dir, 'changes.json')[0];
    expect(c).toMatchObject({ source: 'legislation', at: later2.toISOString(), url: 'https://www.legislation.gov.au/F2026L01500/asmade' });
    expect(read(dir, 'news/items.json').find((i) => i.url === c.url).tags).toEqual(['occupation-list']);
  });
});

describe('datasets', () => {
  const ckan = fx('ckan-immi.json');

  it('parses every Home Affairs dataset with licence, resources and page link', () => {
    const ds = parseDatasets(ckan);
    expect(ds).toHaveLength(12);
    expect(ds[0]).toMatchObject({
      name: 'visitor-visas-granted-pivot-table',
      title: 'Visitor visa program',
      metadataModified: '2026-10-20T23:57:36.199772Z',
      licence: { id: 'cc-by-2.5', title: 'Creative Commons Attribution 2.5 Australia', url: 'http://creativecommons.org/licenses/by/2.5/au/' },
      url: 'https://data.gov.au/data/dataset/visitor-visas-granted-pivot-table',
    });
    expect(ds[0].resources[0]).toMatchObject({ format: 'XLSX', lastModified: '2026-10-20T23:57:36.099664Z' });
    expect(ds[0].resources[0].url).toMatch(/^https:\/\/data\.gov\.au\//);
    expect(ds.every((d) => d.summary.length > 0 && d.summary.length <= 201 && !d.summary.includes('\n'))).toBe(true);
    expect(ds.map((d) => d.metadataModified)).toEqual([...ds.map((d) => d.metadataModified)].sort().reverse());
  });

  it('summarises notes to one plain line', () => {
    expect(summary('**Bold** [link](https://x)\r\n\r\nSecond para')).toBe('Bold link');
    expect(summary('word '.repeat(80)).endsWith('…')).toBe(true);
    expect(summary(null)).toBe('');
  });

  it('rejects a failed CKAN response', () => {
    expect(() => parseDatasets({ success: false })).toThrow();
  });

  it('reports only recent datasets on the first run, dated by metadata_modified', () => {
    const ds = parseDatasets(ckan);
    const ch = datasetChanges(null, ds, NOW.toISOString());
    expect(ch).toHaveLength(7); // the seven updated on 20 Oct 2026 UTC, 21 Oct in Brisbane
    expect(ch[0]).toEqual({ at: '2026-10-21', kind: 'dataset', source: 'datagov', title: 'Visitor visa program: updated 2026-10-21', url: 'https://data.gov.au/data/dataset/visitor-visas-granted-pivot-table' });
  });

  it('reports new datasets, metadata updates and resource-list changes', () => {
    const prev = parseDatasets(ckan);
    const next = structuredClone(prev);
    next[0].metadataModified = '2027-01-20T03:00:00.0Z';
    next[1].resources.push({ name: 'New file', format: 'CSV', lastModified: null, url: 'https://data.gov.au/x.csv' });
    next.push({ ...structuredClone(prev[2]), name: 'brand-new', title: 'Brand new', url: 'https://data.gov.au/data/dataset/brand-new' });
    const at = '2027-01-21T00:00:00.000Z';
    const ch = datasetChanges(prev, next, at);
    expect(ch.map((c) => c.title)).toEqual([
      'Visitor visa program: updated 2027-01-20',
      `${prev[1].title}: files changed 2027-01-21`,
      'New dataset: Brand new',
    ]);
    expect(ch.every((c) => c.at === at && c.kind === 'dataset')).toBe(true);
    expect(datasetChanges(prev, structuredClone(prev), at)).toEqual([]);
  });

  it('writes datasets.json and changes, then leaves files untouched when nothing changed', async () => {
    const get = fakeGet({ [API_URL]: { status: 200, body: ckan } });
    const r1 = await runDatasets({ dataDir: dir, get, now: NOW });
    expect(r1).toMatchObject({ ok: true, written: true });
    const out = read(dir, 'datasets.json');
    expect(out).toMatchObject({ sourceUrl: 'https://data.gov.au/data/organization/immi', lastModified: '2026-10-20T23:57:36.199772Z' });
    expect(out.datasets).toHaveLength(12);
    expect(JSON.stringify(out)).not.toMatch(/fetchedAt/);
    expect(read(dir, 'changes.json').filter((c) => c.kind === 'dataset')).toHaveLength(7);

    const mtime = statSync(join(dir, 'datasets.json')).mtimeMs;
    const r2 = await runDatasets({ dataDir: dir, get, now: new Date('2026-11-07T11:00:00Z') });
    expect(r2).toMatchObject({ ok: true, written: false, changes: [] });
    expect(statSync(join(dir, 'datasets.json')).mtimeMs).toBe(mtime);
  });

  it('keeps the previous file when the API fails or returns nothing', async () => {
    await runDatasets({ dataDir: dir, get: fakeGet({ [API_URL]: { status: 200, body: ckan } }), now: NOW });
    const before = readFileSync(join(dir, 'datasets.json'), 'utf8');
    expect(await runDatasets({ dataDir: dir, get: fakeGet({}), now: NOW })).toMatchObject({ ok: false, error: 'HTTP 403' });
    const empty = JSON.stringify({ success: true, result: { results: [] } });
    expect((await runDatasets({ dataDir: dir, get: fakeGet({ [API_URL]: { status: 200, body: empty } }), now: NOW })).ok).toBe(false);
    expect(readFileSync(join(dir, 'datasets.json'), 'utf8')).toBe(before);
  });
});
