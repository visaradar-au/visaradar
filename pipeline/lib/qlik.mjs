// Minimal Qlik Engine JSON-RPC client for the public SkillSelect EOI dashboard.
// Uses the dashboard's anonymous session, the same way a browser visitor does.
import WebSocket from 'ws';

export const HOST = 'https://api.dynamic.reports.employment.gov.au';
export const APP_ID = 'aaac76b5-ad30-477e-9ca0-472f8ab57fc8';
export const DASHBOARD_URL = `${HOST}/anonap/extensions/hSKLS02_SkillSelect_EOI_Data/hSKLS02_SkillSelect_EOI_Data.html`;
// Library measure "Count EOIs". It keeps the department's small-cell mask ("<20").
// Never use the unmasked measure.
export const MASKED_MEASURE = 'fPpzEmW';
const UA = 'VisaRadar/0.1 (public data aggregator)';

async function anonCookie() {
  let url = DASHBOARD_URL;
  const jar = new Map();
  for (let i = 0; i < 10; i++) {
    const r = await fetch(url, { redirect: 'manual', headers: { 'user-agent': UA, cookie: cookieHeader(jar) } });
    for (const c of r.headers.getSetCookie()) {
      const [kv] = c.split(';');
      const [k, ...v] = kv.split('=');
      jar.set(k.trim(), v.join('='));
    }
    const loc = r.headers.get('location');
    if (!loc) break;
    url = new URL(loc, url).href;
  }
  if (![...jar.keys()].some((k) => k.startsWith('X-Qlik-Session'))) throw new Error('No anonymous Qlik session cookie');
  return cookieHeader(jar);
}
const cookieHeader = (jar) => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');

export async function openApp({ timeoutMs = 120000 } = {}) {
  const cookie = await anonCookie();
  const ws = new WebSocket(`wss://${new URL(HOST).host}/anonap/app/${APP_ID}`, { headers: { cookie, 'user-agent': UA } });
  let seq = 0;
  const pending = new Map();
  const call = (handle, method, params = []) =>
    new Promise((res, rej) => {
      const id = ++seq;
      const t = setTimeout(() => { pending.delete(id); rej(new Error(`Qlik ${method} timed out`)); }, timeoutMs);
      pending.set(id, { res: (v) => { clearTimeout(t); res(v); }, rej: (e) => { clearTimeout(t); rej(e); } });
      ws.send(JSON.stringify({ jsonrpc: '2.0', id, handle, method, params }));
    });
  ws.on('message', (d) => {
    const m = JSON.parse(d);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.rej(new Error(`Qlik error ${m.error.code}: ${m.error.message} ${m.error.parameter ?? ''}`)) : p.res(m.result);
    }
  });
  await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
  const doc = await call(-1, 'OpenDoc', [APP_ID]);
  const h = doc.qReturn.qHandle;

  const app = {
    async lastReload() {
      const l = await call(h, 'GetAppLayout');
      return l.qLayout.qLastReloadTime;
    },
    async clearAll() { await call(h, 'ClearAll', [true]); },
    async fieldValues(field, max = 5000) {
      const o = await call(h, 'CreateSessionObject', [{ qInfo: { qType: 'vr-list' }, qListObjectDef: { qDef: { qFieldDefs: [field] }, qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 1, qHeight: max }] } }]);
      const lay = await call(o.qReturn.qHandle, 'GetLayout');
      await call(h, 'DestroySessionObject', [o.qReturn.qGenericId]);
      return lay.qLayout.qListObject.qDataPages[0].qMatrix.map((r) => r[0].qText);
    },
    async select(field, values) {
      const f = await call(h, 'GetField', [field]);
      // Field.Select with a search string works for dual (text + number) fields like "As At Month",
      // where SelectValues by text silently matches nothing.
      const fh = f.qReturn.qHandle;
      await call(fh, 'Clear');
      for (const v of values) {
        const ok = await call(fh, values.length > 1 ? 'ToggleSelect' : 'Select', [v, false, 0]);
        if (!ok.qReturn) throw new Error(`Selection failed on ${field} = ${v}`);
      }
      const sel = (await this.currentSelections()).find((s) => s.field === field);
      if (!sel) throw new Error(`Selection on ${field} did not stick`);
    },
    async currentSelections() {
      const o = await call(h, 'CreateSessionObject', [{ qInfo: { qType: 'vr-sel' }, qSelectionObjectDef: {} }]);
      const lay = await call(o.qReturn.qHandle, 'GetLayout');
      await call(h, 'DestroySessionObject', [o.qReturn.qGenericId]);
      return lay.qLayout.qSelectionObject.qSelections.map((s) => ({ field: s.qField, selected: s.qSelected }));
    },
    /** Rows of [...dimension texts, count text] for the current selections. */
    async cube(dimensions, { pageCells = 9000 } = {}) {
      const width = dimensions.length + 1;
      const o = await call(h, 'CreateSessionObject', [{
        qInfo: { qType: 'vr-cube' },
        qHyperCubeDef: {
          qDimensions: dimensions.map((d) => ({ qDef: { qFieldDefs: [d] } })),
          qMeasures: [{ qLibraryId: MASKED_MEASURE }],
          qSuppressZero: true,
        },
      }]);
      const oh = o.qReturn.qHandle;
      const lay = await call(oh, 'GetLayout');
      const total = lay.qLayout.qHyperCube.qSize.qcy;
      const height = Math.floor(pageCells / width);
      const rows = [];
      for (let top = 0; top < total; top += height) {
        const pages = await call(oh, 'GetHyperCubeData', ['/qHyperCubeDef', [{ qTop: top, qLeft: 0, qWidth: width, qHeight: height }]]);
        for (const r of pages.qDataPages[0].qMatrix) rows.push(r.map((c) => c.qText));
      }
      await call(h, 'DestroySessionObject', [o.qReturn.qGenericId]);
      return rows;
    },
    close() { ws.close(); },
  };
  return app;
}
