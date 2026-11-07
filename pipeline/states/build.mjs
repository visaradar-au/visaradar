// Pure builders: turn manual.json + scraped data into the data/states.json,
// data/rounds.json and data/occupation-lists.json shapes, and diff for data/changes.json.

const ORDER = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

const SOURCE_NAME = {
  ACT: 'ACT Government',
  NSW: 'NSW Government',
  NT: 'NT Government',
  QLD: 'Migration Queensland',
  SA: 'Migration SA',
  TAS: 'Migration Tasmania',
  VIC: 'Live in Melbourne',
  WA: 'Migration WA',
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = (ym) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

/**
 * @param {object} manual pipeline/states/manual.json
 * @param {Record<string, {invitedSoFar?: object}>} scraped per state code
 * @param {string} today YYYY-MM-DD
 * @param {object[]} [prevStates] previous data/states.json; a failed scrape keeps its invitedSoFar
 */
export function buildStates(manual, scraped, today, prevStates = []) {
  return ORDER.map((code) => {
    const m = manual.states[code];
    const s = scraped[code] ?? {};
    const prev = prevStates.find((p) => p.code === code && p.programYear === manual.programYear);
    const hasAlloc = m.allocations?.['190'] != null || m.allocations?.['491'] != null;
    const verifiedDates = [m.status, m.model, m.opened, m.allocations]
      .map((f) => f?.verified)
      .filter(Boolean);
    const out = {
      code,
      name: m.name,
      site: m.site,
      programYear: manual.programYear,
      status: m.status?.value ?? 'unknown',
      statusByVisa: m.statusByVisa?.value ?? null,
      model: m.model?.value ?? null,
      opened: m.opened?.value ?? null,
      allocations: {
        190: m.allocations?.['190'] ?? null,
        491: m.allocations?.['491'] ?? null,
        source: hasAlloc ? SOURCE_NAME[code] : null,
        sourceUrl: hasAlloc ? m.allocations.sourceUrl ?? null : null,
        asAt: hasAlloc ? m.allocations.verified ?? null : null,
      },
      invitedSoFar: s.invitedSoFar ?? prev?.invitedSoFar ?? m.invitedSoFar ?? null,
      links: m.links,
      // Hand-checked facts only; scraped counts carry their own invitedSoFar.asAt.
      lastVerified: verifiedDates.sort().pop() ?? null,
      evidence: Object.fromEntries(
        ['status', 'statusByVisa', 'model', 'opened', 'allocations']
          .filter((k) => m[k]?.sourceUrl)
          .map((k) => [k, { sourceUrl: m[k].sourceUrl, verified: m[k].verified, quote: m[k].quote ?? null }]),
      ),
      notes: (m.notes ?? []).join('\n'),
    };
    return out;
  });
}

/** WA monthly invitation table rows -> rounds. */
export function waRounds(wa, sourceUrl) {
  const rounds = [];
  for (const y of wa.years) {
    for (const mo of y.months) {
      rounds.push({
        id: `WA-${mo.month}`,
        date: mo.month,
        scope: 'WA',
        title: `WA State Nominated Migration Program invitations, ${monthName(mo.month)}`,
        invitations: mo.total,
        byVisa: { 190: mo.v190, 491: mo.v491 },
        cutoffs: [],
        source: 'Migration WA',
        sourceUrl,
        verified: true,
        notes: 'Monthly total from the WA SNMP "Invitations issued" table; WA does not publish exact round dates in that table.',
      });
    }
  }
  // The page names the latest issue date in prose ("were issued on 14 October").
  const latest = rounds.filter((r) => r.date.length === 7).sort((a, b) => b.date.localeCompare(a.date))[0];
  const day = wa.issuedOn
    .map((t) => t.match(/issued on (\d{1,2}) ([A-Z][a-z]+)/))
    .find((m) => m && latest && MONTH_NAMES[Number(latest.date.slice(5, 7)) - 1] === m[2]);
  if (latest && day) latest.issuedOn = `${latest.date}-${day[1].padStart(2, '0')}`;
  return rounds;
}

/** ACT round page + rankings DOCX -> rounds. Cut-offs attach only when the DOCX date matches. */
export function actRounds(page, rankings, sourceUrl, rankingsUrl) {
  return page.rounds.map((r) => ({
    id: `ACT-${r.date}`,
    date: r.date,
    scope: 'ACT',
    title: r.title,
    invitations: r.invitations,
    byVisa: { 190: r.v190, 491: r.v491 },
    groups: r.groups,
    cutoffs: rankings && rankings.date === r.date ? rankings.cutoffs : [],
    cutoffsSourceUrl: rankings && rankings.date === r.date ? rankingsUrl : null,
    source: 'ACT Government',
    sourceUrl,
    verified: true,
    notes: 'Cut-offs are minimum Canberra Matrix scores per ANZSCO unit group (null = not considered); a date is the tie-break submission date.',
  }));
}

/** SA "Invitations issued" post -> round. */
export function saRound(post, sourceUrl) {
  return {
    id: `SA-${post.date}`,
    date: post.date,
    scope: 'SA',
    title: `South Australia: ${post.roundLabel}`,
    invitations: post.total,
    byVisa: { 190: post.v190, 491: post.v491 },
    yearToDate: post.ytd ? { programYear: post.programYear, ...post.ytd } : null,
    ...(post.other ? { otherBlock: post.other } : {}),
    groups: post.groups,
    cutoffs: [],
    source: 'Migration SA',
    sourceUrl,
    verified: true,
  };
}

/** Merge rounds by id (fresh wins), newest first. Old rounds are never dropped. */
export function mergeRounds(prev, fresh) {
  const byId = new Map(prev.map((r) => [r.id, r]));
  for (const r of fresh) byId.set(r.id, r);
  return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date) || a.scope.localeCompare(b.scope));
}

/** Diff states/rounds into data/changes.json entries. */
export function diffChanges({ prevStates, states, prevRounds, rounds, nowIso }) {
  const out = [];
  const prevByCode = new Map(prevStates.map((s) => [s.code, s]));
  for (const s of states) {
    const p = prevByCode.get(s.code);
    if (!p) continue;
    const link = s.links?.program ?? s.site;
    // Seed records (no evidence block) changing is not news.
    if ('evidence' in p && p.status !== s.status) {
      out.push({ at: nowIso, kind: 'state-status', source: s.code.toLowerCase(), title: `${s.name}: program ${s.status} (was ${p.status})`, url: link });
    }
    for (const v of ['190', '491']) {
      if (s.allocations[v] != null && s.allocations[v] !== p.allocations?.[v]) {
        out.push({ at: nowIso, kind: 'allocation', source: s.code.toLowerCase(), title: `${s.name}: ${s.programYear} allocation for ${v} is ${s.allocations[v]}`, url: s.allocations.sourceUrl ?? link });
      }
    }
  }
  const prevIds = new Set(prevRounds.map((r) => r.id));
  const bootstrap = prevRounds.length === 0;
  for (const r of rounds) {
    if (prevIds.has(r.id)) continue;
    // First run: only rounds from the current program year count as news.
    if (bootstrap && r.date < '2026-07') continue;
    out.push({ at: nowIso, kind: 'round', source: r.scope.toLowerCase(), title: `${r.title}: ${r.invitations ?? '?'} invitations`, url: r.sourceUrl });
  }
  return out;
}
