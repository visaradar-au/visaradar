// States / rounds / occupation lists pipeline.
//   node pipeline/states.mjs            states + rounds + lists
//   node pipeline/states.mjs --no-lists states + rounds only
//
// Scrapes what official pages allow (WA invitations, ACT rounds + rankings DOCX, SA
// "Invitations issued" posts, occupation lists), layers it over the hand-curated
// pipeline/states/manual.json, and writes data/states.json, data/rounds.json,
// data/occupation-lists.json and new entries in data/changes.json. A failed fetch
// keeps the previous values. Always exits 0.

import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import mammoth from 'mammoth';
import { get as httpGet } from './news/http.mjs';
import { readJson, writeJson, appendChanges } from './news/changes.mjs';
import * as P from './states/parse.mjs';
import { buildStates, waRounds, actRounds, saRound, mergeRounds, diffChanges } from './states/build.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export const URLS = {
  waSnmp: 'https://migration.wa.gov.au/our-services-support/state-nominated-migration-program',
  actRound: 'https://www.act.gov.au/migration/resources/canberra-matrix-invitation-round',
  actLibrary: 'https://www.act.gov.au/migration/resources/library-guidelines-and-invitations',
  actList: 'https://www.act.gov.au/migration/skilled-migrants/act-nominated-migration-program-occupation-list',
  saInvitations: 'https://migration.sa.gov.au/news?category=invitations-issued',
  saList: 'https://migration.sa.gov.au/before-applying/work-in-sa/occupation-lists/occupations-list',
  qldOnshore: 'https://migration.qld.gov.au/occupation-lists/queensland-onshore-skilled-occupation-list',
  qldOffshore: 'https://migration.qld.gov.au/occupation-lists/offshore-queensland-skilled-occupation-lists-(qsol)',
  nswList: 'https://www.nsw.gov.au/visas-and-migration/skilled-visas/nsw-skills-lists',
  lin19051: 'https://www.legislation.gov.au/F2019L00278/latest',
};

async function docxToHtml(buf) {
  return (await mammoth.convertToHtml({ buffer: buf })).value;
}

/** Run a parser on a fetched body; log and return null on any failure. */
async function scrape(log, get, url, parse, opts) {
  const r = await get(url, opts);
  log.push({ url, status: r.status, error: r.error });
  if (!r.body) return null;
  try {
    return await parse(r.body);
  } catch (err) {
    log.push({ url, status: r.status, error: `parse: ${err.message}` });
    return null;
  }
}

export async function run(opts = {}) {
  const dataDir = opts.dataDir ?? join(HERE, '..', 'data');
  const get = opts.get ?? httpGet;
  const now = opts.now ?? new Date();
  const nowIso = now.toISOString();
  // Program dates are Australian; use the Brisbane calendar date for "verified today".
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane' }).format(now);
  const lists = opts.lists ?? true;
  const manual = opts.manual ?? (await readJson(join(HERE, 'states', 'manual.json')));
  const roundsManual = opts.roundsManual ?? (await readJson(join(HERE, 'states', 'rounds-manual.json')));

  const files = {
    states: join(dataDir, 'states.json'),
    rounds: join(dataDir, 'rounds.json'),
    lists: join(dataDir, 'occupation-lists.json'),
    changes: join(dataDir, 'changes.json'),
  };
  const prevStates = await readJson(files.states, []);
  const prevRounds = await readJson(files.rounds, []);
  const prevLists = await readJson(files.lists, { lists: {}, sources: {} });
  const log = [];
  const scraped = {};
  const fresh = [];

  // WA: invitations issued, by month and program year.
  const wa = await scrape(log, get, URLS.waSnmp, P.parseWaSnmp);
  if (wa) {
    const cur = wa.years.find((y) => y.programYear === manual.programYear);
    if (cur?.total != null) {
      const months = cur.months.map((m) => m.month);
      scraped.WA = {
        invitedSoFar: {
          n: cur.total,
          byVisa: { 190: cur.v190, 491: cur.v491 },
          period: `${manual.programYear} to date (${months[0]} to ${months[months.length - 1]})`,
          source: 'Migration WA',
          sourceUrl: URLS.waSnmp,
          asAt: today,
        },
      };
    }
    fresh.push(...waRounds(wa, URLS.waSnmp));
  }

  // ACT: round page + rankings DOCX (asset URL changes per version; found via the library).
  const actPage = await scrape(log, get, URLS.actRound, P.parseActRoundPage);
  let rankings = null;
  let rankingsUrl = null;
  if (actPage?.rounds.length) {
    rankingsUrl = await scrape(log, get, URLS.actLibrary, (h) => P.findActRankingsDocx(h, URLS.actLibrary));
    if (rankingsUrl) {
      rankings = await scrape(log, get, rankingsUrl, async (b) => P.parseActRankings(await docxToHtml(b)), { binary: true });
    }
    fresh.push(...actRounds(actPage, rankings, URLS.actRound, rankingsUrl));
    const yearRounds = actPage.rounds.filter((r) => r.date >= `${manual.programYear.slice(0, 4)}-07-01`);
    if (yearRounds.length) {
      const n = yearRounds.reduce((a, r) => a + r.invitations, 0);
      scraped.ACT = {
        invitedSoFar: {
          n,
          byVisa: { 190: yearRounds.reduce((a, r) => a + r.v190, 0), 491: yearRounds.reduce((a, r) => a + r.v491, 0) },
          period: `${manual.programYear}: rounds of ${yearRounds.map((r) => r.date).join(', ')}`,
          source: 'ACT Government',
          sourceUrl: URLS.actRound,
          asAt: yearRounds[0].date,
        },
      };
    }
  }

  // SA: each "Invitations issued" post once (posts don't change after publication).
  const known = new Set(prevRounds.filter((r) => r.scope === 'SA').map((r) => r.sourceUrl));
  const posts = (await scrape(log, get, URLS.saInvitations, (h) => P.findSaInvitationPosts(h, URLS.saInvitations))) ?? [];
  for (const url of posts.filter((u) => !known.has(u))) {
    const post = await scrape(log, get, url, P.parseSaInvitations);
    if (post) fresh.push(saRound(post, url));
  }
  const saCur = [...prevRounds, ...fresh]
    .filter((r) => r.scope === 'SA' && r.yearToDate?.programYear === manual.programYear)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (saCur) {
    scraped.SA = {
      invitedSoFar: {
        n: saCur.yearToDate.total,
        byVisa: { 190: saCur.yearToDate.v190, 491: saCur.yearToDate.v491 },
        period: `${manual.programYear} to ${saCur.date}`,
        source: 'Migration SA',
        sourceUrl: saCur.sourceUrl,
        asAt: saCur.date,
      },
    };
  }

  const states = buildStates(manual, scraped, today, prevStates);
  const rounds = mergeRounds(prevRounds, [...fresh, ...(roundsManual.rounds ?? [])]);

  let occ = prevLists;
  if (lists) occ = await buildLists(log, get, prevLists, today);

  const changes = diffChanges({ prevStates, states, prevRounds, rounds, nowIso });
  if (opts.write !== false) {
    await writeJson(files.states, states);
    await writeJson(files.rounds, rounds);
    await writeJson(files.lists, occ);
    await appendChanges(files.changes, changes);
  }
  return { states, rounds, lists: occ, changes, log };
}

/** Occupation lists. Each list keeps its previous value when its fetch fails. */
async function buildLists(log, get, prev, today) {
  const lists = { ...prev.lists };
  const byVisa = { ...(prev.byVisa ?? {}) };
  const sources = { ...prev.sources };
  const set = (name, codes, src) => {
    if (!codes?.length) return;
    lists[name] = [...new Set(codes)].sort();
    sources[name] = src;
  };

  // Federal lists: only refetch the 800 KB text when the compilation id changes.
  const latest = await scrape(log, get, URLS.lin19051, (h) => P.parseLegislationLatest(h, URLS.lin19051));
  if (latest?.compilation && latest.textUrl && latest.compilation !== prev.sources?.MLTSSL?.compilation) {
    const fed = await scrape(log, get, latest.textUrl, P.parseLin19051);
    for (const name of ['MLTSSL', 'STSOL', 'ROL']) {
      set(name, fed?.[name], {
        url: latest.textUrl,
        page: URLS.lin19051,
        instrument: 'LIN 19/051 (F2019L00278)',
        compilation: latest.compilation,
        asAt: latest.asAt,
        checked: today,
      });
    }
  } else if (latest?.compilation) {
    for (const name of ['MLTSSL', 'STSOL', 'ROL']) if (sources[name]) sources[name] = { ...sources[name], checked: today };
  }

  const qOn = await scrape(log, get, URLS.qldOnshore, P.parseQldList);
  const qOff = await scrape(log, get, URLS.qldOffshore, P.parseQldList);
  if (qOn && qOff) {
    set('QLD', [...qOn.all, ...qOff.all], {
      url: 'https://migration.qld.gov.au/occupation-lists',
      parts: { onshore: URLS.qldOnshore, offshore: URLS.qldOffshore },
      asAt: null,
      checked: today,
      note: 'Union of the onshore list and the offshore QSOL. Pages carry no date. byVisa.QLD splits by list and visa.',
    });
    byVisa.QLD = {
      onshore: { 190: qOn[190], 491: qOn[491] },
      offshore: { 190: qOff[190], 491: qOff[491] },
    };
  }

  const sa = await scrape(log, get, URLS.saList, P.parseSaList);
  set('SA', sa, {
    url: URLS.saList,
    asAt: null,
    checked: today,
    note: 'Every occupation on the SA list page. Availability differs by stream (offshore, graduates, working in SA); see the page.',
  });

  const act = await scrape(log, get, URLS.actList, P.parseActList);
  if (act) {
    set('ACT', act.all, { url: URLS.actList, asAt: act.asAt, checked: today, note: 'Rows marked "(491 Only)" are in byVisa.ACT["491"] only.' });
    byVisa.ACT = { 190: act[190], 491: act[491] };
  }

  const nsw = await scrape(log, get, URLS.nswList, P.parseNswList);
  set('NSW', nsw, {
    url: URLS.nswList,
    asAt: null,
    checked: today,
    level: 'unit-group',
    note: '4-digit ANZSCO unit groups, not 6-digit occupations. The page says it has been updated for 190; the 491 list is pending.',
  });

  // WA: the WASMOL CSV export returned an empty body on 2026-11-07, and Migration WA's
  // copyright forbids reuse, so no WA list is stored. Link to the source instead.
  sources.WA = {
    url: URLS.waSnmp,
    asAt: null,
    checked: today,
    note: 'Not stored: the CSV export returned no data and Migration WA copyright forbids reuse. Use the official occupation search.',
  };
  return { lists, byVisa, sources };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  run({ lists: !process.argv.includes('--no-lists') })
    .then(({ states, rounds, lists, changes, log }) => {
      for (const l of log) console.log(String(l.status ?? '-').padEnd(4), l.error ?? '', l.url);
      console.log(states.map((s) => `${s.code}:${s.status}${s.invitedSoFar ? `(${s.invitedSoFar.n})` : ''}`).join(' '));
      console.log(`rounds ${rounds.length}; lists ${Object.entries(lists.lists).map(([k, v]) => `${k}=${v.length}`).join(' ')}; changes +${changes.length}`);
    })
    .catch((err) => console.error(err))
    .finally(() => process.exit(0));
}
