# Live official sources for VisaRadar

2026-11-07 · Standard tier · 4 sub-researchers + direct Node tests · Sources: ~25 · Overall confidence: Medium-High

## Answer
Three new official sources can be fetched today from a build runner with an honest user agent. They are confirmed by direct Node `fetch` tests on 2026-11-07:
- the **Federal Register of Legislation API** (new migration instruments, current to the day);
- the **data.gov.au CKAN API** for Home Affairs (organisation `immi`, 12 datasets, updated 20 Oct 2026);
- the **ABS SDMX API** (net overseas migration).

The **PM media RSS** also works and supports ETag and Last-Modified. Home Affairs pages and PDFs, VIC, TAS, NT and ParlInfo still return 403, and none of them has an official feed or mirror. Most federal material is CC BY 4.0 (the CKAN datasets vary: CC BY 2.5/3.0 AU). Republishing aggregated figures with attribution needs no permission.

## Ranked build list
1. **Legislation API watcher** (`https://api.prod.legislation.gov.au/v1/titles`, OData):
   - Poll for titles starting "Migration" and occupation-list instruments, ordered by `asMadeRegisteredAt`. Add them to the news feed as source `legislation`, tagged `policy` or `occupation-list`.
   - Use `asMadeRegisteredAt` as the watermark, not the id.
   - Attribution wording is required, and the register asks for crawl delays and off-peak polling.
   - Evidence: [reuse page](https://legislation.gov.au/help-and-resources/using-the-legislation-register/data-share-and-reuse), [terms](https://www.legislation.gov.au/terms-of-use).
   - Newest at test time: F2026L01466, registered 2026-11-02.
2. **data.gov.au Home Affairs datasets** (`package_search?fq=organization:immi&sort=metadata_modified desc`):
   - Show a "Datasets" page with each dataset's last update.
   - Add a change entry when `metadata_modified` or the resource list changes.
   - Datasets: temporary work (skilled) BP0014, temporary graduate, student, temporary visa holders BP0019, working holiday, visitor, overseas arrivals, settlement, and the Permanent Migration Program outcomes.
   - Licences per dataset (cc-by, cc-by-2.5).
3. **All SkillSelect visa pathways** from the Qlik app we already use:
   - Visas: 491F in full; 188 Business Innovation, Investor, Significant Investor and Entrepreneur; 132 Significant Business History.
   - Add a `/pathways/` page that links each visa to its official page.
4. **PM media RSS** (`https://www.pm.gov.au/rss.xml`, ETag supported): keep only migration-related items, using deterministic keyword rules.
5. **ABS net overseas migration** (`data.api.abs.gov.au`, SDMX, quarterly): show a context chart on /about or the home page. Lower priority.
6. **Jobs and Skills Australia Occupation Shortage List** (annual, Oct 2026, 279 occupations in shortage): the site timed out from both the research tool and Node. Add it as a hand-checked annual list with a link only.

## Key findings
- **The Legislation API is the fastest official signal for rule changes.** (High) It's a free OData API with no key, current to the day. Visa rule changes land there as instruments, even while Home Affairs blocks bots.
- **The CKAN API works from Node but not from the research tool.** (High, direct test) Search results also confirm the `immi` organisation slug. Datasets were updated 20 Oct 2026.
- **No other public apps were found on the SkillSelect Qlik host.** (Medium) No official Power BI or Tableau dashboards were found either.
- **Home Affairs and the VIC, TAS and NT state sites stay blocked**, and there are no official feeds or archives for them. (High for the blocks) The Home Affairs PDFs under `/research-and-stats/files/` are also blocked from Node.
- **Licences.** (Medium-High)
  - ABS and FRL: CC BY 4.0 International.
  - Home Affairs: CC BY 4.0 (read from a subdomain).
  - JSA publications: CC BY 4.0; datasets are often CC BY 2.5/3.0 AU.
  - No automated-access clauses were found.
  - QLD and WA content terms forbid reuse, so we keep facts and links only (see `research/sources.md`).
- **189 rounds.** Secondary sources only. AHC Lawyers reports a 4 Jun 2026 round of 10,000 invitations. IDP reports a 15 Oct 2026 round "not yet published". Neither is shown as official. The SkillSelect INVITED stock jump (36 → 15,369 in October 2026) is consistent with an October round. That is an inference.

## Conflicts and caveats
- The 403s depend on the fetcher. data.gov.au blocked the research tool but served Node. Retest blocked hosts from GitHub Actions runners too.
- One Home Affairs page writes its licence as "4.0 Australia", which is probably CC BY 4.0 International mis-stated.
- s280: a general-information statistics site with no personalised advice appears outside "immigration assistance". This is an inference: no OMARA guidance was found.

## Open questions
- The Home Affairs processing-times data endpoint (page blocked).
- A dedicated ABS series for net overseas migration by visa.
- JSA site reachability from CI.

## Sources
See `2026-11-07-live-sources/notes/*.md` for the full claim tables and URLs.
