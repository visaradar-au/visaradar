// Shared path encoder for the state map: Douglas-Peucker in pixels, integer
// coordinates and relative commands. Keeps au-states.json (and every page that
// draws the map) small.
export function simplify(points, tol) {
  if (points.length < 3) return points;
  const sq = tol * tol;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax, dy = by - ay;
    const len = dx * dx + dy * dy || 1;
    let max = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
      const ex = ax + t * dx - px, ey = ay + t * dy - py;
      const d = ex * ex + ey * ey;
      if (d > max) { max = d; idx = i; }
    }
    if (max > sq) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

/** Rings of [x, y] pixel points to a compact SVG path ("M x y l dx dy ... z"). */
export function encodeRings(rings, tol = 0.7) {
  const parts = [];
  for (const ring of rings) {
    const pts = [];
    for (const [x, y] of simplify(ring, tol)) {
      const p = [Math.round(x), Math.round(y)];
      const last = pts.at(-1);
      if (!last || last[0] !== p[0] || last[1] !== p[1]) pts.push(p);
    }
    if (pts.length < 3) continue;
    let s = `M${pts[0][0]} ${pts[0][1]}l`;
    const deltas = [];
    for (let i = 1; i < pts.length; i++) deltas.push(`${pts[i][0] - pts[i - 1][0]} ${pts[i][1] - pts[i - 1][1]}`);
    s += deltas.join(' ').replace(/ -/g, '-') + 'z';
    parts.push(s);
  }
  return parts.join('');
}

/** Parse an absolute "M x,y L x,y ... Z" path (the old format) back into rings. */
export function parseAbsolute(d) {
  return d.split(/[Zz]/).map((seg) => [...seg.matchAll(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g)].map((m) => [Number(m[1]), Number(m[2])])).filter((r) => r.length >= 3);
}
