// Polite HTTP for the sources pipeline.
// Honest UA, conditional requests (ETag / If-Modified-Since), timeouts, per-host
// crawl delay. One attempt per URL per run: a blocked host is recorded, never retried
// in a loop, and we never try to look like a browser to get past a block.

export const USER_AGENT = 'VisaRadar/0.1 (public data aggregator)';

// Seconds between requests to the same host. Hosts not listed get DEFAULT_DELAY.
export const CRAWL_DELAY = {
  'www.act.gov.au': 20, // robots.txt Crawl-delay: 20
  'www.legislation.gov.au': 10, // robots.txt Crawl-delay: 10
};
const DEFAULT_DELAY = 2;
const TIMEOUT_MS = 30_000;

const lastHit = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHost(host) {
  const delay = (CRAWL_DELAY[host] ?? DEFAULT_DELAY) * 1000;
  const last = lastHit.get(host);
  if (last != null) {
    const wait = last + delay - Date.now();
    if (wait > 0) await sleep(wait);
  }
  lastHit.set(host, Date.now());
}

/**
 * Fetch a URL once.
 * @param {string} url
 * @param {{etag?:string, lastModified?:string, binary?:boolean, fetchImpl?:typeof fetch}} [opts]
 * @returns {Promise<{ok:boolean, status:number|null, notModified:boolean, body:string|Buffer|null,
 *   etag:string|null, lastModified:string|null, error:string|null, url:string}>}
 */
export async function get(url, opts = {}) {
  const { etag, lastModified, binary = false, fetchImpl = fetch } = opts;
  const host = new URL(url).host;
  await waitForHost(host);
  const headers = { 'User-Agent': USER_AGENT, Accept: '*/*' };
  if (etag) headers['If-None-Match'] = etag;
  if (lastModified) headers['If-Modified-Since'] = lastModified;
  try {
    const res = await fetchImpl(url, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const out = {
      ok: res.ok,
      status: res.status,
      notModified: res.status === 304,
      body: null,
      etag: res.headers.get('etag'),
      lastModified: res.headers.get('last-modified'),
      error: null,
      url: res.url || url,
    };
    if (res.ok) {
      out.body = binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
    } else if (!out.notModified) {
      out.error = `HTTP ${res.status}`;
    }
    return out;
  } catch (err) {
    return {
      ok: false,
      status: null,
      notModified: false,
      body: null,
      etag: null,
      lastModified: null,
      error: String(err?.cause?.code || err?.name || err?.message || err),
      url,
    };
  }
}

/** Reset per-host timers (tests). */
export function resetHosts() {
  lastHit.clear();
}
