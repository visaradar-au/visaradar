// Official pages we point people to. Only government sources.
export const official = {
  skillselect: 'https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect',
  eoiData:
    'https://api.dynamic.reports.employment.gov.au/anonap/extensions/hSKLS02_SkillSelect_EOI_Data/hSKLS02_SkillSelect_EOI_Data.html',
  invitationRounds: 'https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/invitation-rounds',
  allocations: 'https://immi.homeaffairs.gov.au/what-we-do/state-and-territory-nomination-allocations',
  planningLevels: 'https://immi.homeaffairs.gov.au/what-we-do/migration-program-planning-levels',
  homeAffairsNews: 'https://immi.homeaffairs.gov.au/news-media/archive',
  homeAffairsCopyright: 'https://www.homeaffairs.gov.au/access-and-accountability/using-our-website/copyright-and-disclaimer',
  marn: 'https://www.mara.gov.au/',
  abs: 'https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs/edition-4-july-2026-june-2031/access-and-downloads/digital-boundary-files',
  ccBy: 'https://creativecommons.org/licenses/by/4.0/',
};

export const NEWS_SOURCES: Record<string, { label: string; site: string; news: string | null }> = {
  homeaffairs: { label: 'Home Affairs', site: 'https://immi.homeaffairs.gov.au', news: official.homeAffairsNews },
  act: { label: 'ACT', site: 'https://www.act.gov.au/migration', news: null },
  nsw: { label: 'NSW', site: 'https://www.nsw.gov.au/visas-and-migration', news: 'https://www.nsw.gov.au/visas-and-migration/news-and-updates' },
  nt: { label: 'NT', site: 'https://theterritory.com.au', news: null },
  qld: { label: 'Queensland', site: 'https://migration.qld.gov.au', news: 'https://migration.qld.gov.au/news' },
  sa: { label: 'SA', site: 'https://migration.sa.gov.au', news: 'https://migration.sa.gov.au/news' },
  tas: { label: 'Tasmania', site: 'https://www.migration.tas.gov.au', news: 'https://www.migration.tas.gov.au/news' },
  vic: { label: 'Victoria', site: 'https://liveinmelbourne.vic.gov.au', news: 'https://liveinmelbourne.vic.gov.au/news-events/news' },
  wa: { label: 'WA', site: 'https://migration.wa.gov.au', news: 'https://migration.wa.gov.au/news' },
};

export const TAG_LABELS: Record<string, string> = {
  'program-open': 'Program open',
  'program-closed': 'Program closed',
  allocation: 'Allocation',
  round: 'Round',
  invitations: 'Invitations',
  'occupation-list': 'Occupation list',
  'points-test': 'Points test',
  processing: 'Processing',
  fees: 'Fees',
  policy: 'Policy',
  other: 'Other',
};
