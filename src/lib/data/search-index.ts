// Builds the site search index at build time. Only import from .astro pages and endpoints.
import { PATHWAY_NAMES, PATHWAY_VISAS, STATES, STATE_NAMES } from '../eoi';
import { formatDate } from '../format';
import { href } from '../href';
import { NEWS_SOURCES } from '../official';
import type { SearchEntry, SearchIndex } from '../search';
import { getOccupations } from './eoi';
import { getNews } from './sources';

const PAGES: [string, string, string, string?][] = [
  ['Home', '/', 'Headline figures, map and what changed'],
  ['States and territories', '/states/', 'Map and every state program', 'map'],
  ['Occupations', '/occupations/', 'Search and sort every occupation', 'anzsco jobs'],
  ['Top movers', '/movers/', 'Biggest monthly changes in invited and lodged EOIs', 'movers changes trend invited lodged'],
  ['News', '/news/', 'Dated news from Home Affairs and the states', 'updates announcements'],
  ['Invitation rounds', '/rounds/', '189, 491 family and state rounds, cut-offs', 'cutoff cut off points'],
  ['Visa pathways', '/pathways/', 'Every SkillSelect visa with pool numbers', 'business 188 132'],
  ['Has my EOI been invited?', '/eoi-check/', 'Signs of an invitation and how not to miss them', 'check status invitation email'],
  ['Where I stand', '/me/', 'Your points against the pool, kept in your browser', 'profile my points position'],
  ['Home Affairs datasets', '/datasets/', 'Datasets on data.gov.au', 'data gov'],
  ['Sources and method', '/about/', 'Where the numbers come from, masking, disclaimer', 'about method masked licence'],
];

export function buildSearchIndex(): SearchIndex {
  const items: SearchEntry[] = [
    ...PAGES.map(([label, path, detail, extra]): SearchEntry => ['p', label, detail, href(path), extra]),
    ...STATES.map((s): SearchEntry => ['s', STATE_NAMES[s], `${s}: program, EOIs for 190 and 491, news`, href(`/states/${s.toLowerCase()}/`), s]),
    ...PATHWAY_VISAS.map((v): SearchEntry => ['v', PATHWAY_NAMES[v], 'Visa pathway in SkillSelect', href('/pathways/'), `subclass ${v}`]),
    ...getOccupations().map((o): SearchEntry => ['o', o.name, `ANZSCO ${o.code}`, href(`/occupations/${o.code}/`)]),
    ...getNews().map((n): SearchEntry => {
      const when = formatDate(n.published ?? n.firstSeen);
      return ['n', n.title, [NEWS_SOURCES[n.source]?.label ?? n.source, when].filter(Boolean).join(', '), n.url];
    }),
  ];
  // Drop the empty extra-words slot so the index stays small.
  return { v: 1, items: items.map((e) => (e[4] ? e : (e.slice(0, 4) as SearchEntry))) };
}
