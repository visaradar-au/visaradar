import { describe, expect, it } from 'vitest';
import { getMapMetrics, getMeta, getOccupationStats, getPathways } from '../../src/lib/data/eoi';
import { getDatasets } from '../../src/lib/data/sources';
import { PATHWAY_NAMES, PATHWAY_VISAS } from '../../src/lib/eoi';
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
    expect(se?.top190?.state).toMatch(/^(ACT|NSW|NT|QLD|SA|TAS|VIC|WA)$/);
    // Distinct per-visa counts come straight from occupations.json byVisa.
    expect(typeof se?.submitted['190'] === 'number' || se?.submitted['190'] === '<20').toBe(true);
  });
  it('pathways cover every SkillSelect visa with masked counts only', () => {
    const p = getPathways();
    expect(p).not.toBeNull();
    expect([...p!.visas].sort()).toEqual([...PATHWAY_VISAS].sort());
    expect(PATHWAY_VISAS.every((v) => PATHWAY_NAMES[v])).toBe(true);
    expect(p!.months).toContain(p!.asAt);
    for (const [m, v, , c] of p!.rows) {
      expect(p!.months).toContain(m);
      expect(PATHWAY_VISAS).toContain(v);
      expect(c === '<20' || (Number.isInteger(c) && (c as number) >= 20)).toBe(true);
    }
  });
  it('datasets link to data.gov.au with a licence each', () => {
    const d = getDatasets();
    expect(d?.datasets.length).toBeGreaterThan(0);
    for (const ds of d!.datasets) {
      expect(ds.url).toMatch(/^https:\/\/data\.gov\.au\/data\/dataset\//);
      expect(ds.licence.id ?? ds.licence.title).toBeTruthy();
    }
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
