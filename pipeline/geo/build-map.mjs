// One-off: download ABS ASGS Edition 4 (2026) state and territory boundaries,
// project them to SVG paths and write src/data/au-states.json.
// Run with `npm run build:map`. Not part of the regular build.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { encodeRings } from './compact.mjs';

const SERVICE = 'https://geo.abs.gov.au/arcgis/rest/services/ASGS2026/STE/MapServer/1/query';
const OUT = fileURLToPath(new URL('../../src/data/au-states.json', import.meta.url));
const ABBR = { 1: 'NSW', 2: 'VIC', 3: 'QLD', 4: 'SA', 5: 'WA', 6: 'TAS', 7: 'NT', 8: 'ACT' };
const WIDTH = 600;
const MIN_RING_DEG2 = 0.02; // drop islands smaller than this (Lord Howe, small reefs)
const TOLERANCE_PX = 0.4; // Douglas-Peucker tolerance after projection

const params = new URLSearchParams({
  where: 'STATE_CODE_2026 IN (\'1\',\'2\',\'3\',\'4\',\'5\',\'6\',\'7\',\'8\')',
  outFields: 'STATE_CODE_2026,STATE_NAME_2026',
  returnGeometry: 'true',
  outSR: '4326',
  geometryPrecision: '3',
  f: 'geojson',
});

const res = await fetch(`${SERVICE}?${params}`);
if (!res.ok) throw new Error(`ABS service returned ${res.status}`);
const geo = await res.json();
if (!geo.features?.length) throw new Error(`No features: ${JSON.stringify(geo).slice(0, 300)}`);

// Keep each state's outer rings that are big enough to see at this size.
const features = geo.features.map((f) => ({
  code: ABBR[Number(f.properties.STATE_CODE_2026)],
  name: f.properties.STATE_NAME_2026,
  rings: polygons(f.geometry)
    .map((poly) => poly[0]) // outer rings only; holes don't show at this scale
    .filter((ring) => Math.abs(area(ring)) >= MIN_RING_DEG2),
}));

// Equirectangular projection with a cos(latitude) correction at the centre of Australia.
const all = features.flatMap((f) => f.rings.flat());
const lons = all.map((p) => p[0]);
const lats = all.map((p) => p[1]);
const [minLon, maxLon] = extent(lons);
const [minLat, maxLat] = extent(lats);
const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
const scale = WIDTH / ((maxLon - minLon) * k);
const height = Math.ceil((maxLat - minLat) * scale);
const project = ([lon, lat]) => [(lon - minLon) * k * scale, (maxLat - lat) * scale];
const round = ([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10];

const states = features
  .map(({ code, name, rings }) => {
    const paths = rings
      .map((ring) => dedupe(simplify(ring.map(project), TOLERANCE_PX).map(round)))
      .filter((ring) => ring.length > 3);
    // Compact encoding: integer pixels, relative commands (see compact.mjs).
    const d = encodeRings(paths, code === 'ACT' ? 0.3 : 0.7);
    const main = paths.reduce((a, b) => (Math.abs(area(b)) > Math.abs(area(a)) ? b : a));
    return { code, name, d, centroid: centroid(main) };
  })
  .sort((a, b) => a.code.localeCompare(b.code));

if (states.length !== 8) throw new Error(`Expected 8 states, got ${states.length}`);

const out = {
  attribution: 'Based on ABS ASGS Edition 4 (2026) data, CC BY 4.0',
  sourceUrl: 'https://geo.abs.gov.au/arcgis/rest/services/ASGS2026/STE/MapServer',
  licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
  fetchedAt: new Date().toISOString(),
  width: WIDTH,
  height,
  states,
};
const json = JSON.stringify(out);
await writeFile(OUT, json + '\n');
console.log(`Wrote ${OUT} (${(json.length / 1024).toFixed(1)} KB, ${states.length} states)`);

function extent(values) {
  return values.reduce(([lo, hi], v) => [Math.min(lo, v), Math.max(hi, v)], [Infinity, -Infinity]);
}
function polygons(g) {
  return g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
}
function simplify(points, tol) {
  // Douglas-Peucker on an open ring (first point == last point in GeoJSON).
  if (points.length < 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = segDist(points[i], points[a], points[b]);
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}
function segDist([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function dedupe(ring) {
  return ring.filter((p, i) => i === 0 || p[0] !== ring[i - 1][0] || p[1] !== ring[i - 1][1]);
}
function area(ring) {
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}
function centroid(ring) {
  let cx = 0, cy = 0;
  const a = area(ring);
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    const f = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  return [Math.round(cx / (6 * a)), Math.round(cy / (6 * a))];
}
