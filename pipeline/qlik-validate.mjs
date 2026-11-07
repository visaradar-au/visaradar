// Regression check: reproduce totals hand-verified from the dashboard UI on 2026-11-04
// (10/2026, QLD, SUBMITTED, scores >= 65, "<20" cells excluded).
import { openApp } from './lib/qlik.mjs';
const EXPECT = {
  '190SAS|261399': 504, '190SAS|261313': 1654, '190SAS|261312': 1084, '491SNR|261399': 426,
  '491SNR|261313': 1527, '491SNR|261312': 963,
};
const app = await openApp();
await app.clearAll();
await app.select('As At Month', ['10/2026']);
await app.select('Nominated State', ['QLD']);
await app.select('EOI Status', ['SUBMITTED']);
console.log(await app.currentSelections());
const rows = await app.cube(['Visa Type', 'Occupation', 'Score']);
const got = {};
for (const [v, o, s, c] of rows) {
  const k = `${v.slice(0, 6)}|${o.slice(0, 6)}`;
  if (!(k in EXPECT) || +s < 65 || Number.isNaN(Number(c))) continue;
  got[k] = (got[k] ?? 0) + Number(c);
}
let bad = 0;
for (const [k, e] of Object.entries(EXPECT)) { const ok = got[k] === e; if (!ok) bad++; console.log(ok ? 'OK ' : 'BAD', k, 'expected', e, 'got', got[k]); }
console.log('rows', rows.length);
app.close();
process.exit(bad ? 1 : 0);
