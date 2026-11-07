// Federal Register of Legislation: new Migration instruments (regulations, LINs, occupation
// lists) from the public OData API. One cheap query per run, newest first by registration time.
// Occupation-list instruments are all named "Migration (… Specification of Occupations …)",
// so the "starts with Migration" filter catches them; combining it with contains() returns 400.
// Licence CC BY 4.0; ATTRIBUTION is the wording the register's terms of use ask for.
import { item, clean } from './util.mjs';

export const id = 'legislation';
export const name = 'Federal Register of Legislation';
export const urls = {
  api:
    "https://api.prod.legislation.gov.au/v1/titles?$filter=startswith(name,'Migration')" +
    '&$orderby=asMadeRegisteredAt%20desc&$top=20&$select=id,name,collection,asMadeRegisteredAt',
};
export const terms = 'https://www.legislation.gov.au/terms-of-use';

/** Required attribution (terms of use), with the download date filled in. */
export function attribution(date) {
  return `Sourced from the Federal Register of Legislation at ${date}. For the latest information on Australian Government law please go to https://www.legislation.gov.au.`;
}

/** The register's page for an instrument as made. */
export const itemUrl = (titleId) => `https://www.legislation.gov.au/${encodeURIComponent(titleId)}/asmade`;

/** Our own tag from the title: occupation-list instruments vs everything else (policy). */
export function tags({ title }) {
  return [/occupation/i.test(title) ? 'occupation-list' : 'policy'];
}

export function parse(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  const out = [];
  for (const t of data?.value ?? []) {
    const title = clean(t.name);
    if (!t.id || !title) continue;
    // asMadeRegisteredAt has no offset (register local time): keep the date as written.
    const published = /^\d{4}-\d{2}-\d{2}/.test(t.asMadeRegisteredAt ?? '') ? t.asMadeRegisteredAt.slice(0, 10) : null;
    out.push(item({ source: id, title, url: itemUrl(t.id), published }));
  }
  return out;
}

export async function fetch(ctx) {
  const r = await ctx.get(urls.api);
  return r.body ? parse(r.body) : [];
}
