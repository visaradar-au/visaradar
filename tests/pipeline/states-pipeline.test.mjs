import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, URLS } from '../../pipeline/states.mjs';
import { buildStates, diffChanges, mergeRounds } from '../../pipeline/states/build.mjs';

const fx = (f, enc = 'utf8') => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), enc);
const manual = JSON.parse(readFileSync(new URL('../../pipeline/states/manual.json', import.meta.url), 'utf8'));
const read = (dir, f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const NOW = new Date('2026-11-07T10:00:00Z');

const RANKINGS = 'https://www.act.gov.au/__data/assets/word_doc/0009/3140487/2026-27-Invitation-Round-Rankings.docx';
const LIN_TEXT = 'https://www.legislation.gov.au/F2019L00278/2026-03-28/2026-03-28/text/original/epub/OEBPS/document_1/document_1.html';

function fakeGet(routes) {
  const calls = [];
  const get = async (url) => {
    calls.push(url);
    const body = routes[url];
    if (body == null) return { ok: false, status: 403, body: null, error: 'HTTP 403', url };
    return { ok: true, status: 200, body, error: null, url };
  };
  get.calls = calls;
  return get;
}

const allRoutes = () => ({
  [URLS.waSnmp]: fx('states/wa-snmp.html'),
  [URLS.actRound]: fx('news/act-round.html'),
  [URLS.actLibrary]: fx('states/act-library.html'),
  [RANKINGS]: fx('states/act-rankings-2026-10-12.docx', null),
  [URLS.saInvitations]: fx('states/sa-invitations-category.html'),
  'https://migration.sa.gov.au/news/invitations-issued-late-may-2026': fx('states/sa-invitations-late-may-2026.html'),
  'https://migration.sa.gov.au/news/invitations-issued-april-2026': fx('states/sa-invitations-april-2026.html'),
  'https://migration.sa.gov.au/news/invitations-issued-dec-2025': fx('states/sa-invitations-dec-2025.html'),
  [URLS.lin19051]: fx('states/lin19051-latest.html'),
  [LIN_TEXT]: fx('states/lin19051-text.html'),
  [URLS.qldOnshore]: fx('states/qld-onshore.html'),
  [URLS.qldOffshore]: fx('states/qld-offshore.html'),
  [URLS.saList]: fx('states/sa-list.html'),
  [URLS.actList]: fx('states/act-list.html'),
  [URLS.nswList]: fx('states/nsw-list.html'),
});

let dir;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'vr-states-'));
  writeFileSync(join(dir, 'states.json'), '[]');
  writeFileSync(join(dir, 'rounds.json'), '[]');
  writeFileSync(join(dir, 'occupation-lists.json'), '{"lists":{},"sources":{}}');
  writeFileSync(join(dir, 'changes.json'), '[]');
});

describe('states pipeline (offline)', () => {
  it('builds states, rounds and lists from fixtures', async () => {
    await run({ dataDir: dir, get: fakeGet(allRoutes()), now: NOW });
    const states = read(dir, 'states.json');
    expect(states.map((s) => s.code)).toEqual(['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']);
    const wa = states.find((s) => s.code === 'WA');
    expect(wa.invitedSoFar).toMatchObject({ n: 2327, byVisa: { 190: 1620, 491: 707 }, source: 'Migration WA', asAt: '2026-11-07' });
    expect(states.find((s) => s.code === 'ACT').invitedSoFar).toMatchObject({ n: 261, asAt: '2026-10-12' });
    // SA fixtures are all 2025-26, so no 2026-27 count.
    expect(states.find((s) => s.code === 'SA').invitedSoFar).toBeNull();
    for (const s of states) {
      expect(['open', 'closed', 'paused', 'not-yet-open', 'unknown']).toContain(s.status);
      // Only official sources may fill allocations; none are published for 2026-27 yet.
      expect(s.allocations[190]).toBeNull();
    }
    for (const code of ['NT', 'VIC', 'TAS']) expect(states.find((s) => s.code === code).status).toBe('unknown');

    const rounds = read(dir, 'rounds.json');
    const act = rounds.find((r) => r.id === 'ACT-2026-10-12');
    expect(act).toMatchObject({ scope: 'ACT', invitations: 261, verified: true, cutoffsSourceUrl: RANKINGS });
    expect(act.cutoffs.length).toBeGreaterThan(100);
    expect(rounds.find((r) => r.id === 'WA-2026-10')).toMatchObject({ invitations: 1227, issuedOn: '2026-10-14' });
    expect(rounds.find((r) => r.id === 'SA-2025-12')).toMatchObject({ invitations: 402, yearToDate: null });
    expect(rounds.filter((r) => r.scope === '189' || r.scope === '491F')).toHaveLength(0);
    expect(rounds.every((r, i) => i === 0 || rounds[i - 1].date >= r.date)).toBe(true);

    const occ = read(dir, 'occupation-lists.json');
    expect(Object.keys(occ.lists).sort()).toEqual(['ACT', 'MLTSSL', 'NSW', 'QLD', 'ROL', 'SA', 'STSOL']);
    expect(occ.sources.MLTSSL).toMatchObject({ compilation: 'F2026C00265', asAt: '2026-03-28' });
    expect(occ.lists.WA).toBeUndefined();
    expect(occ.sources.WA.note).toMatch(/copyright/);

    // First run: only 2026-27 rounds become changes.
    const changes = read(dir, 'changes.json');
    expect(changes.map((c) => c.kind)).toEqual(['round', 'round', 'round']);
  });

  it('keeps previous rounds/lists when everything is blocked, and skips known SA posts', async () => {
    await run({ dataDir: dir, get: fakeGet(allRoutes()), now: NOW });
    const before = read(dir, 'rounds.json');
    await run({ dataDir: dir, get: fakeGet({}), now: NOW });
    expect(read(dir, 'rounds.json')).toEqual(before);
    expect(read(dir, 'occupation-lists.json').lists.MLTSSL.length).toBeGreaterThan(0);
    // A blocked scrape keeps the last known count (with its own asAt).
    expect(read(dir, 'states.json').find((s) => s.code === 'WA').invitedSoFar).toMatchObject({ n: 2327, asAt: '2026-11-07' });

    const get = fakeGet(allRoutes());
    await run({ dataDir: dir, get, now: NOW });
    // Posts already stored are not refetched; the 4 without fixtures failed and are retried once per run.
    const posts = get.calls.filter((u) => u.includes('/news/invitations-issued-'));
    expect(posts).toHaveLength(4);
    expect(posts).not.toContain('https://migration.sa.gov.au/news/invitations-issued-late-may-2026');
    // Same compilation: the 800 KB text is not refetched.
    expect(get.calls).not.toContain(LIN_TEXT);
  });
});

describe('build helpers', () => {
  it('status change on a verified state becomes a change; seed records do not', () => {
    const states = buildStates(manual, {}, '2026-11-07');
    const prev = structuredClone(states);
    prev.find((s) => s.code === 'QLD').status = 'closed';
    prev.find((s) => s.code === 'SA').status = 'closed';
    prev.find((s) => s.code === 'SA').lastVerified = null;
    const ch = diffChanges({ prevStates: prev, states, prevRounds: [{ id: 'x', date: '2020-01' }], rounds: [], nowIso: 'T' });
    expect(ch).toEqual([expect.objectContaining({ kind: 'state-status', source: 'qld', title: 'Queensland: program open (was closed)' })]);
  });
  it('mergeRounds never drops old rounds and fresh data wins', () => {
    const m = mergeRounds([{ id: 'A', date: '2026-01', scope: 'WA', invitations: 1 }], [{ id: 'A', date: '2026-01', scope: 'WA', invitations: 2 }, { id: 'B', date: '2026-02', scope: 'SA' }]);
    expect(m.map((r) => [r.id, r.invitations])).toEqual([['B', undefined], ['A', 2]]);
  });
  it('every manual value with a sourceUrl also has a verified date and a quote', () => {
    for (const [code, s] of Object.entries(manual.states)) {
      for (const k of ['status', 'statusByVisa', 'model', 'opened', 'allocations']) {
        const f = s[k];
        if (f?.sourceUrl && f.quote) expect(f.verified, `${code}.${k}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        const hasValue = k === 'allocations' ? f?.['190'] != null || f?.['491'] != null : f?.value != null && f.value !== 'unknown';
        if (hasValue) expect(f.sourceUrl, `${code}.${k}`).toMatch(/^https:\/\//);
      }
    }
  });
});
