import { describe, expect, it } from 'vitest';
import { getMapMetrics, getMeta, getOccupationStats } from '../../src/lib/data/eoi';
import { getChanges, getNews, getRounds, listsFor } from '../../src/lib/data/sources';
import geo from '../../src/data/au-states.json';

describe('data layer against committed data', () => {
  it('reads EOI meta', () => {
    expect(getMeta().months.length).toBeGreaterThan(0);
  });
  it('map metrics have the 8 states plus ANY for 190 and 491', () => {
    const m = getMapMetrics();
    for (const visa of ['190', '491'] as const) {
      expect(Object.keys(m[visa]).sort()).toEqual(['ACT', 'ANY', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']);
    }
  });
  it('occupation stats pick one state, never a cross-state sum', () => {
    const se = getOccupationStats().find((o) => o.code === '261313');
    expect(se?.pool190?.state).toMatch(/^(ACT|NSW|NT|QLD|SA|TAS|VIC|WA)$/);
  });
  it('seed files that may be empty still load', () => {
    expect(Array.isArray(getNews())).toBe(true);
    expect(Array.isArray(getRounds())).toBe(true);
    expect(Array.isArray(getChanges())).toBe(true);
    expect(Array.isArray(listsFor('261313'))).toBe(true);
  });
  it('the map has exactly 8 states and stays small', () => {
    expect(geo.states.map((s) => s.code).sort()).toEqual(['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']);
    expect(JSON.stringify(geo).length).toBeLessThan(80_000);
  });
});
