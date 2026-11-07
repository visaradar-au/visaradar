import { describe, expect, it } from 'vitest';
import { normalise, prepare, search, type SearchEntry } from '../../src/lib/search';

// Made-up index entries.
const items: SearchEntry[] = [
  ['p', 'Top movers', 'Biggest monthly changes', '/movers/', 'trend'],
  ['s', 'Queensland', 'QLD: program', '/states/qld/', 'QLD'],
  ['s', 'South Australia', 'SA: program', '/states/sa/', 'SA'],
  ['v', '190 Skilled Nominated', 'Visa pathway', '/pathways/', 'subclass 190'],
  ['o', 'Software Engineer', 'ANZSCO 261313', '/occupations/261313/'],
  ['o', 'Software Tester', 'ANZSCO 261314', '/occupations/261314/'],
  ['o', 'Registered Nurse (Aged Care)', 'ANZSCO 254412', '/occupations/254412/'],
  ['n', 'Queensland opens its 2026-27 program', 'Queensland, 1 Jul 2026', 'https://example.org/n'],
];
const idx = prepare(items);
const labels = (q: string) => search(idx, q).map((e) => e[1]);

describe('normalise', () => {
  it('lowercases, strips accents and punctuation', () => {
    expect(normalise('  Café (Aged-Care) ')).toBe('cafe aged care');
  });
});

describe('search', () => {
  it('returns nothing for an empty query', () => {
    expect(search(idx, '   ')).toEqual([]);
  });
  it('finds an occupation by exact or partial ANZSCO code', () => {
    expect(labels('261313')[0]).toBe('Software Engineer');
    expect(labels('2613')).toEqual(['Software Engineer', 'Software Tester']);
  });
  it('matches word prefixes in any order and needs every word', () => {
    expect(labels('eng soft')).toEqual(['Software Engineer']);
    expect(labels('nurse aged')).toEqual(['Registered Nurse (Aged Care)']);
    expect(labels('nurse software')).toEqual([]);
  });
  it('puts a state before news that mentions it', () => {
    expect(labels('queensland')).toEqual(['Queensland', 'Queensland opens its 2026-27 program']);
    expect(labels('qld')[0]).toBe('Queensland');
  });
  it('tolerates a dropped letter in longer words', () => {
    expect(labels('sofware')).toContain('Software Engineer');
  });
  it('finds visas and pages by extra words', () => {
    expect(labels('subclass 190')).toEqual(['190 Skilled Nominated']);
    expect(labels('trend')).toEqual(['Top movers']);
  });
  it('respects the limit', () => {
    expect(search(idx, 's', 2)).toHaveLength(2);
  });
});
