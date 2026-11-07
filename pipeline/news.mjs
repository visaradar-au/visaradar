// News orchestrator: runs every source once, merges with data/news/items.json
// (keeps firstSeen, dedupes by id, never drops items a failing source returned before),
// tags items, writes items.json + fetch-state.json, and appends new items to
// data/changes.json. Exits 0 even when sources fail; failures land in fetch-state.
//
//   node pipeline/news.mjs [--only qld,sa]

import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { get as httpGet } from './news/http.mjs';
import { tagItem } from './news/tags.mjs';
import { readJson, writeJson, appendChanges } from './news/changes.mjs';
import * as homeaffairs from './news/homeaffairs.mjs';
import * as qld from './news/qld.mjs';
import * as nsw from './news/nsw.mjs';
import * as vic from './news/vic.mjs';
import * as sa from './news/sa.mjs';
import * as wa from './news/wa.mjs';
import * as tas from './news/tas.mjs';
import * as act from './news/act.mjs';
import * as nt from './news/nt.mjs';

export const SOURCES = [homeaffairs, qld, nsw, vic, sa, wa, tas, act, nt];

// Sources whose licence is CC BY 4.0 (checked 2026-11-07). SA's copyright page allows
// reproduction but not alteration and doesn't say CC BY, so SA is left out.
// Everything else keeps title, date, link and tags only.
export const EXCERPT_OK = new Set(['nsw', 'act']);

const BOOTSTRAP_DAYS = 30;

/** Sort key: published date, else the day we first saw it. Newest first. */
function sortItems(items) {
  const k = (i) => i.published ?? i.firstSeen?.slice(0, 10) ?? '';
  return items.sort((a, b) => k(b).localeCompare(k(a)) || String(b.firstSeen).localeCompare(String(a.firstSeen)));
}

/** Merge freshly parsed items into the existing list. Returns {items, added}. */
export function mergeItems(existing, fresh, nowIso) {
  const byId = new Map(existing.map((i) => [i.id, { ...i }]));
  const added = [];
  for (const f of fresh) {
    const old = byId.get(f.id);
    if (old) {
      byId.set(f.id, {
        ...old,
        title: f.title || old.title,
        url: f.url,
        published: f.published ?? old.published,
        excerpt: f.excerpt ?? old.excerpt,
        tags: f.tags,
      });
    } else {
      const n = { ...f, firstSeen: nowIso };
      byId.set(f.id, n);
      added.push(n);
    }
  }
  return { items: sortItems([...byId.values()]), added };
}

/** A source-scoped wrapper over http.get that remembers validators and outcomes. */
function makeCtx(sourceId, prevState, hasItems, get, now) {
  const log = [];
  const prevUrls = prevState?.urls ?? {};
  return {
    log,
    now,
    async get(url, opts = {}) {
      const { conditional = true, ...rest } = opts;
      const v = prevUrls[url] ?? {};
      // Only send validators when we already hold this source's items: a 304 on an
      // empty items.json would leave the source empty forever.
      const useV = conditional && hasItems;
      const r = await get(url, {
        ...rest,
        etag: useV ? v.etag : undefined,
        lastModified: useV ? v.lastModified : undefined,
      });
      log.push({ url, ...r, body: undefined, prev: v });
      return r;
    },
  };
}

function sourceState(src, prev, log, itemCount, nowIso) {
  const primary = log[0];
  const st = {
    url: primary?.url ?? Object.values(src.urls).flat()[0],
    lastOk: prev?.lastOk ?? null,
    lastError: null,
    lastErrorAt: null,
    lastStatus: primary?.status ?? null,
    etag: primary?.etag ?? prev?.etag ?? null,
    lastModified: primary?.lastModified ?? prev?.lastModified ?? null,
    itemCount,
    urls: {},
  };
  const errors = [];
  for (const r of log) {
    const p = r.prev ?? {};
    st.urls[r.url] = {
      lastStatus: r.status,
      etag: r.notModified ? p.etag ?? null : r.etag,
      lastModified: r.notModified ? p.lastModified ?? null : r.lastModified,
      lastError: r.error,
    };
    if (r.error) errors.push(`${r.url}: ${r.error}`);
  }
  if (primary && (primary.ok || primary.notModified)) st.lastOk = nowIso;
  if (errors.length) st.lastError = errors.join('; ');
  else if (!log.length) st.lastError = 'no request made';
  if (st.lastError) st.lastErrorAt = nowIso;
  return st;
}

/**
 * Run the news pipeline.
 * @param {{dataDir?:string, sources?:object[], get?:Function, now?:Date, write?:boolean}} [opts]
 */
export async function run(opts = {}) {
  const dataDir = opts.dataDir ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
  const sources = opts.sources ?? SOURCES;
  const get = opts.get ?? httpGet;
  const now = opts.now ?? new Date();
  const nowIso = now.toISOString();
  const itemsFile = join(dataDir, 'news', 'items.json');
  const stateFile = join(dataDir, 'news', 'fetch-state.json');
  const changesFile = join(dataDir, 'changes.json');

  const existing = await readJson(itemsFile, []);
  const prevState = await readJson(stateFile, {});
  const state = { ...prevState };
  const fresh = [];
  const report = [];

  for (const src of sources) {
    const hasItems = existing.some((i) => i.source === src.id);
    const ctx = makeCtx(src.id, prevState[src.id], hasItems, get, now);
    let items = [];
    let crash = null;
    try {
      items = await src.fetch(ctx);
    } catch (err) {
      crash = String(err?.stack || err);
    }
    for (const it of items) {
      if (!EXCERPT_OK.has(src.id)) it.excerpt = null;
      it.tags = tagItem(it);
      fresh.push(it);
    }
    report.push({ source: src.id, parsed: items.length, statuses: ctx.log.map((r) => r.status ?? r.error) });
    state[src.id] = { log: ctx.log, items: items.length, crash };
  }

  const { items, added } = mergeItems(existing, fresh, nowIso);
  for (const src of sources) {
    const { log, crash } = state[src.id];
    const count = items.filter((i) => i.source === src.id).length;
    state[src.id] = sourceState(src, prevState[src.id], log, count, nowIso);
    if (crash) Object.assign(state[src.id], { lastError: `parser error: ${crash.split('\n')[0]}`, lastErrorAt: nowIso });
  }

  // First run: everything is "new", so only recent items go to the change feed.
  const bootstrap = existing.length === 0;
  const cutoff = new Date(now.getTime() - BOOTSTRAP_DAYS * 86400e3).toISOString().slice(0, 10);
  const changes = added
    .filter((i) => !bootstrap || (i.published && i.published >= cutoff))
    .map((i) => ({
      at: bootstrap ? i.published : i.firstSeen,
      kind: 'news',
      source: i.source,
      title: i.title,
      url: i.url,
    }));

  if (opts.write !== false) {
    await writeJson(itemsFile, items);
    await writeJson(stateFile, state);
    await appendChanges(changesFile, changes);
  }
  return { items, added, changes, state, report };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const onlyArg = process.argv.find((a) => a.startsWith('--only'));
  const only = onlyArg ? (onlyArg.split('=')[1] ?? process.argv[process.argv.indexOf(onlyArg) + 1]).split(',') : null;
  const sources = only ? SOURCES.filter((s) => only.includes(s.id)) : SOURCES;
  run({ sources })
    .then(({ report, added, items, changes }) => {
      for (const r of report) console.log(`${r.source.padEnd(12)} parsed ${String(r.parsed).padStart(3)}  ${r.statuses.join(' ')}`);
      console.log(`items ${items.length} (+${added.length} new), changes +${changes.length}`);
    })
    .catch((err) => {
      console.error(err);
    })
    .finally(() => process.exit(0));
}
