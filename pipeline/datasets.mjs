// Home Affairs datasets on data.gov.au (CKAN organisation "immi") into data/datasets.json.
// Adds a data/changes.json entry (kind "dataset") when a dataset is new, its
// metadata_modified moves, or its resource list changes. The file is rewritten only when
// its content changes, so an unchanged hourly run leaves data/ untouched.
//
//   node pipeline/datasets.mjs
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { get as httpGet } from './news/http.mjs';
import { readJson, writeJson, appendChanges } from './news/changes.mjs';

export const API_URL =
  'https://data.gov.au/data/api/3/action/package_search?fq=organization:immi&sort=metadata_modified%20desc&rows=100';
export const ORG_URL = 'https://data.gov.au/data/organization/immi';
export const SOURCE = 'datagov';
const BOOTSTRAP_DAYS = 30;

// CKAN timestamps are UTC without an offset: mark them as UTC so nothing reads them as local.
const utc = (s) => (s && /^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(s) ? `${s}Z` : s ?? null);
// The site and its dates run on Brisbane time (UTC+10, no daylight saving).
const brisbaneDay = (iso) => (iso ? new Date(new Date(iso).getTime() + 10 * 3600e3).toISOString().slice(0, 10) : '');

const datasetUrl = (name) => `https://data.gov.au/data/dataset/${encodeURIComponent(name)}`;

/** First line of the CKAN notes as plain text, at most ~200 characters. */
export function summary(notes) {
  const line =
    String(notes ?? '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find(Boolean) ?? '';
  const text = line
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // markdown links
    .replace(/[*_`#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= 200) return text;
  const cut = text.slice(0, 200);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 120 ? cut.lastIndexOf(' ') : 200)}…`;
}

/** CKAN package_search result -> our dataset records, newest first. */
export function parse(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  if (!data?.success) throw new Error('CKAN response not successful');
  return (data.result?.results ?? [])
    .filter((p) => p.name && p.title && !p.private)
    .map((p) => ({
      name: p.name,
      title: p.title,
      summary: summary(p.notes),
      metadataModified: utc(p.metadata_modified),
      licence: { id: p.license_id ?? null, title: p.license_title ?? null, url: p.license_url ?? null },
      url: datasetUrl(p.name),
      resources: (p.resources ?? []).map((r) => ({
        name: r.name ?? '',
        format: r.format ?? '',
        lastModified: utc(r.last_modified),
        url: r.url,
      })),
    }))
    .sort((a, b) => String(b.metadataModified).localeCompare(String(a.metadataModified)));
}

const resKey = (d) => JSON.stringify(d.resources.map((r) => [r.name, r.format, r.url, r.lastModified]).sort());

/**
 * Change entries between the previous and the current dataset lists. On the first run
 * (no previous file) only datasets modified in the last 30 days are reported, dated by
 * their own metadata_modified; later changes are dated when we detect them.
 */
export function datasetChanges(prev, next, nowIso) {
  const entry = (d, title, at) => ({ at, kind: 'dataset', source: SOURCE, title, url: d.url });
  const day = (d) => brisbaneDay(d.metadataModified);
  if (!prev) {
    const cutoff = new Date(new Date(nowIso).getTime() - BOOTSTRAP_DAYS * 86400e3).toISOString().slice(0, 10);
    return next.filter((d) => day(d) >= cutoff).map((d) => entry(d, `${d.title}: updated ${day(d)}`, day(d)));
  }
  const before = new Map(prev.map((d) => [d.name, d]));
  const out = [];
  for (const d of next) {
    const p = before.get(d.name);
    if (!p) out.push(entry(d, `New dataset: ${d.title}`, nowIso));
    else if (p.metadataModified !== d.metadataModified) out.push(entry(d, `${d.title}: updated ${day(d)}`, nowIso));
    else if (resKey(p) !== resKey(d)) out.push(entry(d, `${d.title}: files changed ${brisbaneDay(nowIso)}`, nowIso));
  }
  return out;
}

/**
 * @param {{dataDir?:string, get?:Function, now?:Date, write?:boolean}} [opts]
 * @returns {Promise<{ok:boolean, error?:string, datasets?:object[], changes?:object[], written?:boolean}>}
 */
export async function run(opts = {}) {
  const dataDir = opts.dataDir ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
  const get = opts.get ?? httpGet;
  const nowIso = (opts.now ?? new Date()).toISOString();
  const file = join(dataDir, 'datasets.json');

  const r = await get(API_URL, { conditional: false });
  if (!r.body) return { ok: false, error: r.error ?? `HTTP ${r.status}` };
  let datasets;
  try {
    datasets = parse(r.body);
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
  if (!datasets.length) return { ok: false, error: 'no datasets in response' }; // never wipe the list

  const prev = await readJson(file, null);
  const out = {
    source: 'Department of Home Affairs datasets on data.gov.au',
    sourceUrl: ORG_URL,
    apiUrl: API_URL,
    lastModified: datasets[0].metadataModified,
    datasets,
  };
  const changes = datasetChanges(prev?.datasets ?? null, datasets, nowIso);
  const written = JSON.stringify(prev) !== JSON.stringify(out);
  if (opts.write !== false && written) {
    await writeJson(file, out);
    await appendChanges(join(dataDir, 'changes.json'), changes);
  }
  return { ok: true, datasets, changes, written };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  run()
    .then((r) => {
      if (!r.ok) console.log(`datasets: not updated (${r.error})`);
      else console.log(`datasets ${r.datasets.length}, ${r.written ? 'written' : 'unchanged'}, changes +${r.changes.length}`);
    })
    .catch((err) => console.error(err))
    .finally(() => process.exit(0));
}
