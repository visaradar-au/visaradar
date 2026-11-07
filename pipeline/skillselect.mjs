// Pull SkillSelect EOI data (Department of Employment and Workplace Relations Qlik dashboard)
// into static JSON for the site. Masked counts only: "<20" stays a string.
//
//   node pipeline/skillselect.mjs [--force] [--months N]
//
// Skips the pull when the dashboard's last reload time hasn't changed.
import fs from 'node:fs/promises';
import path from 'node:path';
import { openApp, DASHBOARD_URL } from './lib/qlik.mjs';

const OUT = path.resolve('data/eoi');
const VISAS = {
  '189PTS Points-Tested Stream': '189',
  '190SAS Skilled Australian Sponsored': '190',
  '491SNR State or Territory Nominated - Regional': '491',
  '491FSR Family Sponsored - Regional': '491F',
};
const STATUSES = ['SUBMITTED', 'INVITED', 'LODGED', 'HOLD'];
const args = process.argv.slice(2);
const force = args.includes('--force');
const monthsBack = Number(args[args.indexOf('--months') + 1]) || 13;

const count = (c) => (/^\d+$/.test(c) ? Number(c) : c); // "<20" stays a string
const splitOcc = (o) => { const m = o.match(/^(\d{6})\s+(.*)$/); return m ? [m[1], m[2]] : [null, o]; };
const monthKey = (m) => { const [mm, yyyy] = m.split('/'); return `${yyyy}-${mm}`; };

async function readJson(p, fallback) { try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return fallback; } }
async function writeJson(p, v) { await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, JSON.stringify(v)); }

const app = await openApp();
try {
  const reload = await app.lastReload();
  const meta = await readJson(path.join(OUT, 'meta.json'), {});
  if (!force && meta.lastReload === reload) {
    console.log(`SkillSelect unchanged since ${reload}; nothing to do.`);
    process.exit(0);
  }

  await app.clearAll();
  const months = (await app.fieldValues('As At Month'))
    .filter((m) => /^\d{2}\/\d{4}$/.test(m))
    .sort((a, b) => monthKey(a).localeCompare(monthKey(b)));
  const latest = months.at(-1);
  const wanted = months.slice(-monthsBack);
  console.log(`Reload ${reload}. Months ${wanted[0]}..${latest}`);

  const base = async (month) => {
    await app.clearAll();
    await app.select('As At Month', [month]);
    await app.select('Visa Type', Object.keys(VISAS));
    await app.select('EOI Status', STATUSES);
  };

  // 1. Latest month, full detail by points, sharded per occupation.
  await base(latest);
  const rows = await app.cube(['Occupation', 'Visa Type', 'Nominated State', 'EOI Status', 'Score']);
  const occs = new Map();
  for (const [o, v, s, st, sc, c] of rows) {
    const [code, name] = splitOcc(o);
    if (!code) continue;
    if (!occs.has(code)) occs.set(code, { code, name, rows: [] });
    occs.get(code).rows.push([VISAS[v], s, st, Number(sc), count(c)]);
  }
  await fs.rm(path.join(OUT, 'occ'), { recursive: true, force: true });
  for (const occ of occs.values()) await writeJson(path.join(OUT, 'occ', `${occ.code}.json`), { asAt: monthKey(latest), ...occ });
  console.log(`Latest ${latest}: ${rows.length} rows, ${occs.size} occupations`);

  // 2. History without points: month x occupation x visa x state x status.
  const history = new Map();
  const summary = [];
  for (const m of wanted) {
    await base(m);
    const hr = await app.cube(['Occupation', 'Visa Type', 'Nominated State', 'EOI Status']);
    for (const [o, v, s, st, c] of hr) {
      const [code] = splitOcc(o);
      if (!code) continue;
      if (!history.has(code)) history.set(code, []);
      history.get(code).push([monthKey(m), VISAS[v], s, st, count(c)]);
    }
    // State totals are a distinct count across occupations, so pull them directly
    // rather than summing occupation rows (which would drop the "<20" cells).
    const sr = await app.cube(['Visa Type', 'Nominated State', 'EOI Status']);
    for (const [v, s, st, c] of sr) summary.push([monthKey(m), VISAS[v], s, st, count(c)]);
    console.log(`  ${m}: ${hr.length} history rows`);
  }
  await fs.rm(path.join(OUT, 'history'), { recursive: true, force: true });
  for (const [code, r] of history) await writeJson(path.join(OUT, 'history', `${code}.json`), { code, rows: r });
  await writeJson(path.join(OUT, 'summary.json'), { months: wanted.map(monthKey), rows: summary });

  // 3. Occupation index for search. Distinct EOI counts per visa straight from the engine,
  // so an EOI naming several states is counted once. Never sum across visas or states.
  await base(latest);
  const ir = await app.cube(['Occupation', 'Visa Type', 'EOI Status']);
  const idx = new Map();
  for (const [o, v, st, c] of ir) {
    const [code, name] = splitOcc(o);
    if (!code) continue;
    if (!idx.has(code)) idx.set(code, { code, name, byVisa: {} });
    const bv = (idx.get(code).byVisa[VISAS[v]] ??= {});
    bv[st] = count(c);
  }
  const index = [...idx.values()].sort((a, b) => a.code.localeCompare(b.code));
  await writeJson(path.join(OUT, 'occupations.json'), index);

  await writeJson(path.join(OUT, 'meta.json'), {
    source: 'SkillSelect EOI data, Department of Employment and Workplace Relations / Home Affairs',
    sourceUrl: DASHBOARD_URL,
    lastReload: reload,
    latestMonth: monthKey(latest),
    months: wanted.map(monthKey),
    fetchedAt: new Date().toISOString(),
    notes: [
      'Counts are EOIs, not people. One person can lodge several EOIs.',
      'Counts under 20 are masked by the department and shown as "<20".',
      'Status is a month-end snapshot. INVITED counts EOIs still in invited status at month end.',
      'An EOI can name more than one state, so state totals overlap.',
    ],
  });
  console.log('Done.');
} finally {
  app.close();
}
