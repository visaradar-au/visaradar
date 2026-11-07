// Turn a new SkillSelect month into entries for data/changes.json.
// Visa 189 has no state; SkillSelect files it under "N/A".
// Pure: summary + meta in, change entries out. Wording sticks to what the data is:
// month-end counts of EOIs in a status, never "invitations issued".

const STATE_NAMES = {
  ACT: 'ACT', NSW: 'NSW', NT: 'NT', QLD: 'Queensland', SA: 'SA', TAS: 'Tasmania', VIC: 'Victoria', WA: 'WA', ANY: 'any state',
};
const VISAS = ['189', '190', '491'];
const MIN_MOVE = 20; // ignore small month-to-month noise

const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};
const num = (v) => (typeof v === 'number' ? v : null);
const fmt = (n) => n.toLocaleString('en-AU');

export function eoiMonthChanges(summary, meta, at = new Date().toISOString()) {
  const months = summary.months ?? [];
  if (months.length < 2) return [];
  const cur = months.at(-1);
  const prev = months.at(-2);
  const cell = new Map(summary.rows.map(([m, v, s, st, c]) => [`${m}|${v}|${s}|${st}`, c]));
  const get = (m, v, s, st) => (cell.has(`${m}|${v}|${s}|${st}`) ? cell.get(`${m}|${v}|${s}|${st}`) : 0);
  const url = meta.sourceUrl;
  const out = [{
    at, kind: 'eoi-month', source: 'skillselect', url,
    title: `SkillSelect EOI data for ${monthLabel(cur)} is out`,
  }];

  for (const visa of VISAS) {
    const states = visa === '189' ? ['N/A'] : Object.keys(STATE_NAMES).filter((s) => s !== 'ANY');
    for (const state of states) {
      const inv = [num(get(prev, visa, state, 'INVITED')), num(get(cur, visa, state, 'INVITED'))];
      const lod = [num(get(prev, visa, state, 'LODGED')), num(get(cur, visa, state, 'LODGED'))];
      // Masked cells ("<20") on either side: we can't measure the move, so say nothing.
      if (inv.includes(null) || lod.includes(null)) continue;
      const dInv = inv[1] - inv[0];
      const dLod = lod[1] - lod[0];
      // Invited is a stock: people who lodge leave it. A real round shows up as invited
      // and/or lodged going up, so look at both.
      if (Math.max(dInv, dLod) < MIN_MOVE) continue;
      const where = visa === '189' ? 'Visa 189' : `${STATE_NAMES[state]}, visa ${visa}`;
      out.push({
        at, kind: 'eoi-month', source: 'skillselect', url,
        state: visa === '189' ? null : state, visa,
        title: `${where}: EOIs in invited status ${fmt(inv[0])} → ${fmt(inv[1])}, lodged ${fmt(lod[0])} → ${fmt(lod[1])} (${monthLabel(cur)} month end)`,
      });
    }
  }
  return out;
}
