import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, mergeItems, SOURCES } from '../../pipeline/news.mjs';
import { mergeChanges } from '../../pipeline/news/changes.mjs';
import * as sa from '../../pipeline/news/sa.mjs';
import * as wa from '../../pipeline/news/wa.mjs';
import * as homeaffairs from '../../pipeline/news/homeaffairs.mjs';

const fx = (f) => readFileSync(new URL(`./fixtures/news/${f}`, import.meta.url), 'utf8');
const read = (dir, f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));

let dir;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'vr-news-'));
  mkdirSync(join(dir, 'news'));
  writeFileSync(join(dir, 'news', 'items.json'), '[]');
  writeFileSync(join(dir, 'news', 'fetch-state.json'), '{}');
  writeFileSync(join(dir, 'changes.json'), '[]');
});

/** Fake http.get: url -> {status, body}; records calls. */
function fakeGet(routes) {
  const calls = [];
  const get = async (url, opts = {}) => {
    calls.push({ url, opts });
    const r = routes[url] ?? { status: 403 };
    if (r.status === 304) return { ok: false, status: 304, notModified: true, body: null, etag: null, lastModified: null, error: null, url };
    const ok = r.status >= 200 && r.status < 300;
    return { ok, status: r.status, notModified: false, body: ok ? r.body : null, etag: r.etag ?? null, lastModified: null, error: ok ? null : `HTTP ${r.status}`, url };
  };
  get.calls = calls;
  return get;
}

const NOW = new Date('2026-11-07T10:00:00Z');

describe('news orchestrator', () => {
  it('registers all nine sources', () => {
    expect(SOURCES.map((s) => s.id)).toEqual(['homeaffairs', 'qld', 'nsw', 'vic', 'sa', 'wa', 'tas', 'act', 'nt']);
  });

  it('writes items, records blocked sources, and bootstraps changes with recent items only', async () => {
    const get = fakeGet({
      [sa.urls.news]: { status: 200, body: fx('sa-news.html'), etag: '"e1"' },
      [wa.urls.news]: { status: 200, body: fx('wa-news.html') },
    });
    await run({ dataDir: dir, sources: [homeaffairs, sa, wa], get, now: NOW });
    const items = read(dir, 'news/items.json');
    expect(items).toHaveLength(13);
    expect(items[0].published >= items[items.length - 1].published).toBe(true);
    expect(items.every((i) => i.firstSeen === NOW.toISOString() && i.tags.length)).toBe(true);
    expect(items.filter((i) => i.source === 'wa').every((i) => i.excerpt === null)).toBe(true);

    const state = read(dir, 'news/fetch-state.json');
    expect(state.homeaffairs).toMatchObject({ lastStatus: 403, lastOk: null, itemCount: 0 });
    expect(state.homeaffairs.lastError).toMatch(/403/);
    expect(state.homeaffairs.lastErrorAt).toBe(NOW.toISOString());
    expect(state.sa).toMatchObject({ lastStatus: 200, lastError: null, etag: '"e1"', itemCount: 8 });

    // Bootstrap: only items published in the last 30 days become changes.
    const changes = read(dir, 'changes.json');
    expect(changes.map((c) => c.title)).toEqual(['South Australia’s General Skilled Migration Program Update']);
    expect(changes[0]).toMatchObject({ kind: 'news', source: 'sa', at: '2026-10-22' });
  });

  it('keeps firstSeen and old items when a source later fails or returns 304', async () => {
    await run({ dataDir: dir, sources: [sa], get: fakeGet({ [sa.urls.news]: { status: 200, body: fx('sa-news.html'), etag: '"e1"' } }), now: NOW });
    const later = new Date('2026-11-07T10:30:00Z');
    const get304 = fakeGet({ [sa.urls.news]: { status: 304 } });
    await run({ dataDir: dir, sources: [sa], get: get304, now: later });
    expect(get304.calls[0].opts.etag).toBe('"e1"');
    let items = read(dir, 'news/items.json');
    expect(items).toHaveLength(8);
    expect(items[0].firstSeen).toBe(NOW.toISOString());
    let state = read(dir, 'news/fetch-state.json');
    expect(state.sa).toMatchObject({ lastStatus: 304, lastOk: later.toISOString(), etag: '"e1"', itemCount: 8 });

    await run({ dataDir: dir, sources: [sa], get: fakeGet({}), now: later });
    items = read(dir, 'news/items.json');
    expect(items).toHaveLength(8);
    state = read(dir, 'news/fetch-state.json');
    expect(state.sa.lastOk).toBe(later.toISOString());
    expect(state.sa.lastStatus).toBe(403);
  });

  it('adds every genuinely new item to changes after the first run', async () => {
    const html = fx('sa-news.html');
    await run({ dataDir: dir, sources: [sa], get: fakeGet({ [sa.urls.news]: { status: 200, body: html } }), now: NOW });
    const extra = `<div class="x"><span>5th Nov 2026</span><h3>Invitations issued - November 2026</h3><a href="https://migration.sa.gov.au/news/invitations-issued-nov-2026">Read More</a></div>`;
    const later = new Date('2026-11-07T11:00:00Z');
    await run({ dataDir: dir, sources: [sa], get: fakeGet({ [sa.urls.news]: { status: 200, body: html.replace('</body>', `${extra}</body>`) } }), now: later });
    const changes = read(dir, 'changes.json');
    expect(changes[0]).toMatchObject({ title: 'Invitations issued - November 2026', at: later.toISOString(), kind: 'news' });
  });

  it('survives a parser crash and never throws', async () => {
    const boom = { id: 'boom', name: 'Boom', urls: { news: 'https://x.invalid/' }, parse: () => [], fetch: async () => { throw new Error('bad html'); } };
    const { state } = await run({ dataDir: dir, sources: [boom], get: fakeGet({}), now: NOW, write: false });
    expect(state.boom.lastError).toMatch(/parser error: Error: bad html/);
  });
});

describe('mergeItems / mergeChanges', () => {
  it('updates title/published but keeps firstSeen', () => {
    const old = [{ id: 'a', source: 'sa', title: 'Old', url: 'u', published: '2026-01-01', firstSeen: 'T0', tags: [], excerpt: null }];
    const { items, added } = mergeItems(old, [{ ...old[0], title: 'New', published: null, firstSeen: null, tags: ['other'] }], 'T1');
    expect(added).toHaveLength(0);
    expect(items[0]).toMatchObject({ title: 'New', published: '2026-01-01', firstSeen: 'T0' });
  });
  it('caps changes at 500, newest first, deduped', () => {
    const existing = Array.from({ length: 500 }, (_, i) => ({ at: `2026-01-01T00:00:${String(i % 60).padStart(2, '0')}Z`, kind: 'news', source: 's', title: `t${i}`, url: `u${i}` }));
    const merged = mergeChanges(existing, [{ at: '2026-11-07T00:00:00Z', kind: 'news', source: 's', title: 'fresh', url: 'f' }, existing[0]]);
    expect(merged).toHaveLength(500);
    expect(merged[0].title).toBe('fresh');
  });
});
