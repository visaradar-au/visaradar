// Probe: anonymous Qlik session over WebSocket (cookie from the anonymous login redirect).
import WebSocket from 'ws';
const HOST = 'https://api.dynamic.reports.employment.gov.au';
const APP = 'aaac76b5-ad30-477e-9ca0-472f8ab57fc8';
const UA = 'VisaRadar/0.1 (public data aggregator)';

async function anonCookie() {
  let url = `${HOST}/anonap/extensions/hSKLS02_SkillSelect_EOI_Data/hSKLS02_SkillSelect_EOI_Data.html`;
  const jar = new Map();
  for (let i = 0; i < 10; i++) {
    const r = await fetch(url, { redirect: 'manual', headers: { 'user-agent': UA, cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') } });
    for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const [k, ...v] = kv.split('='); jar.set(k.trim(), v.join('=')); }
    console.log(r.status, url.slice(0, 120));
    const loc = r.headers.get('location');
    if (!loc) break;
    url = new URL(loc, url).href;
  }
  return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
}

const cookie = await anonCookie();
console.log('cookies:', cookie.split('; ').map(c => c.split('=')[0]));
const ws = new WebSocket(`wss://api.dynamic.reports.employment.gov.au/anonap/app/${APP}`, { headers: { cookie, 'user-agent': UA } });
let id = 0; const pending = new Map();
const call = (handle, method, params = []) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ jsonrpc: '2.0', id: i, handle, method, params })); });
ws.on('message', (d) => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(m.error) : p.res(m.result); } else if (m.method) console.log('notify', m.method, JSON.stringify(m.params).slice(0, 160)); });
ws.on('error', (e) => { console.error('ws error', e.message); process.exit(1); });
ws.on('open', async () => {
  try {
    const doc = await call(-1, 'OpenDoc', [APP]);
    const h = doc.qReturn.qHandle;
    const layout = await call(h, 'GetAppLayout');
    console.log('reload', layout.qLayout.qLastReloadTime, layout.qLayout.qTitle);
    const m = await call(h, 'GetMeasure', ['fPpzEmW']);
    const p = await call(m.qReturn.qHandle, 'GetProperties');
    console.log('masked measure', JSON.stringify(p.qProp.qMeasure.qDef));
  } catch (err) { console.error('err', JSON.stringify(err)); }
  ws.close(); process.exit(0);
});
setTimeout(() => { console.error('timeout'); process.exit(2); }, 40000);
