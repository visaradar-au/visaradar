import { describe, it, expect } from 'vitest';
import { get, USER_AGENT, CRAWL_DELAY } from '../../pipeline/news/http.mjs';

describe('http.get', () => {
  it('sends the honest UA and conditional headers, and reports 403 without retrying', async () => {
    const seen = [];
    const fetchImpl = async (url, init) => {
      seen.push(init.headers);
      return new Response('', { status: 403 });
    };
    const r = await get('https://blocked.example/a', { etag: '"x"', lastModified: 'Fri, 06 Nov 2026 00:00:00 GMT', fetchImpl });
    expect(seen).toHaveLength(1);
    expect(seen[0]['User-Agent']).toBe(USER_AGENT);
    expect(USER_AGENT).toBe('VisaRadar/0.1 (public data aggregator)');
    expect(seen[0]['If-None-Match']).toBe('"x"');
    expect(r).toMatchObject({ ok: false, status: 403, error: 'HTTP 403', body: null });
  });
  it('maps 304 to notModified and network errors to error strings', async () => {
    const r304 = await get('https://a.example/x', { fetchImpl: async () => new Response(null, { status: 304 }) });
    expect(r304).toMatchObject({ notModified: true, error: null });
    const bad = await get('https://b.example/x', { fetchImpl: async () => { throw Object.assign(new Error('x'), { cause: { code: 'ENOTFOUND' } }); } });
    expect(bad).toMatchObject({ ok: false, status: null, error: 'ENOTFOUND' });
  });
  it('knows the robots crawl delays', () => {
    expect(CRAWL_DELAY['www.act.gov.au']).toBe(20);
    expect(CRAWL_DELAY['www.legislation.gov.au']).toBe(10);
  });
});
