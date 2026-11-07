# VisaRadar data sources: research notes

Researched 2026-11-07. Covers subclasses 189, 190 and 491.

## How to read this report

Each URL carries one of four labels:

- **FETCHED**: retrieved directly with WebFetch on 2026-11-07.
- **SAW (official)**: an official page that appeared only in search results. Any facts come from the search snippet. The page itself was not read.
- **THIRD-PARTY**: a figure taken from a migration agent or aggregator site. Unverified; use it as a lead only.
- **FAILED**: the fetch returned an error, which is noted.

**Selector hints are structural only.** WebFetch returns rendered markdown, so no CSS class names were ever visible. The hints describe what the page showed: heading levels, date formats, lists versus tables, and table columns. Confirm every hint against the raw HTML before writing a parser.

## Headline finding: the most valuable sources block automated fetching

Every Home Affairs host returned **HTTP 403** to WebFetch, including robots.txt:

- `immi.homeaffairs.gov.au`: invitation rounds, allocations, planning levels, news archive and robots.txt.
- `www.homeaffairs.gov.au/robots.txt`
- `minister.homeaffairs.gov.au/robots.txt`

These also returned 403:

- `data.gov.au`: both the CKAN API and the organisation page.
- `migration.tas.gov.au`
- `theterritory.com.au`
- `liveinmelbourne.vic.gov.au`
- `visaplan.au`, a third-party site.

What this means for the build:

- **The robots.txt rules and site terms for Home Affairs, TAS, NT and VIC are unknown.** Blocked does not mean allowed or disallowed.
- **Do a fetch test before anything else.** Run it from the real build environment (for example, a GitHub Actions runner), first with a normal browser user agent and then with a headless browser. Whether either one gets through is unverified.
- **Plan for some sources to fail permanently.** If a source stays blocked, show its last known value with an "as at" date, and add a manual-entry fallback (a small YAML file edited by hand) for the Home Affairs figures, which change only a few times a year.

---

## 1. Home Affairs: SkillSelect invitation rounds

- **URL:** https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/invitation-rounds. FAILED with 403. Also SAW (official) in search results.
- **Contents (from third-party descriptions and an older search snippet):**
  - Round dates.
  - Invitations per subclass: 189 and 491 Family Sponsored.
  - Minimum points and tie-break ("visa date of effect") dates for each occupation.
  - A separate table of state and territory nominations made so far in the program year, by state and subclass.
  - One older snapshot snippet says "State or territory government nominations for skilled visas will not be affected by the departmental invitation rounds".
- **Format:** HTML tables, per third parties. Not confirmed.
- **Cadence:** irregular. 2025-26 rounds included 4 June 2026. Third parties report one 2026-27 round so far, on 15 October 2026.
- **Latest date seen:**
  - migratio.com.au (FETCHED, THIRD-PARTY) says the page was "updated 2 November 2026" and lists 20,000 189 invitations for the 15 Oct 2026 round, with no 491 Family Sponsored invitations.
  - Other third parties give different numbers: 10,000 for the 4 June 2026 round, and "not yet published" for October.
  - **Round counts are unverified.**
  - migratio also says the per-occupation results give minimum scores and tie-break dates but not invitation counts per occupation.
- **State nominations year to date (THIRD-PARTY, migratio, period 1 Jul–30 Sep 2026; figures are 190 / 491):**

  | State | 190 | 491 |
  |---|---|---|
  | TAS | 271 | 96 |
  | NT | 188 | 208 |
  | WA | 17 | 120 |
  | ACT | <5 | <5 |

  These appear to be copied from this Home Affairs page.
- **Scraping notes:**
  - Couldn't inspect the page.
  - Expect a 403 from simple HTTP clients.
  - Hash the main content area and parse every `table`. Identify each table by its preceding heading text ("189", "491 Family Sponsored", "state and territory nominations"), not by its position on the page.
- **Licence:**
  - The Home Affairs copyright page, https://www.homeaffairs.gov.au/access-and-accountability/using-our-website/copyright-and-disclaimer (SAW, official), says CC BY 3.0 AU in its snippet. The snippet looked dated.
  - Recent Home Affairs PDFs use CC BY 4.0, also SAW.
  - Not confirmed for immi.
- **Confidence:** URL high. Content and structure low to medium.

## 2. Home Affairs: state and territory nomination allocations

- **URL:** https://immi.homeaffairs.gov.au/what-we-do/state-and-territory-nomination-allocations. FAILED with 403. Also SAW (official).
- **Contents:**
  - The search snippet (SAW, official) says that on 4 November 2025 the government set 2025-26 allocations at **20,350**: 12,850 for 190 and 7,500 for 491. VIC had the largest 190 allocation, 2,700.
  - It defines allocations as "the number of new primary applicants each state or territory can nominate in a program year".
  - No official 2026-27 table was found. One search summary said the page still showed 2025-26.
  - Last year's set date (4 Nov) suggests the 2026-27 figures may be published around now.
- **Not the same as planning levels.** The allocation is a cap on nominations: 20,350 for 190 and 491 combined in 2025-26. The planning level (section 3, for example 33,000 for State/Territory Nominated) is a target for visa grants. Show them separately and label each one.
- **2026-27 allocations published so far** (from section 6 and third-party trackers):

  | State | 190 | 491 | Source |
  |---|---|---|---|
  | VIC | 900 | 491 places not finalised | official snippet |
  | TAS | 1,250 | 800 | snippet attributed to Migration Tasmania |
  | NT | 850 | 1,000 | NT media release republished by National Tribune (FETCHED) |
  | QLD, NSW, SA, WA, ACT | not published | not published | ACT says "not yet confirmed by the Australian Government" (FETCHED) |

- **Third-party aggregator:** https://www.widen.com.au/state-nomination-tracker/ (FETCHED, THIRD-PARTY, "Checked 3 November 2026") lists the official source URLs for all eight states. It is a useful cross-check.
- **Format:** HTML table, per earlier snippets. Not confirmed.
- **Cadence:** about once a year, with occasional mid-year top-ups.
- **Confidence:** 2025-26 figures medium (official snippet). 2026-27 figures low to medium.

## 3. Home Affairs: Migration Program planning levels

- **URL:** https://immi.homeaffairs.gov.au/what-we-do/migration-program-planning-levels. FAILED with 403. widen.com.au cites it as its source.
- **Official alternative:** Budget Paper No. 2, 2026-27, https://budget.gov.au/content/bp2/download/bp2_2026-27.pdf.
  - The fetch returned a 2 MB binary PDF that the tool could not extract text from.
  - Search snippet (SAW, official): "The Government will set the 2026–27 permanent Migration Program planning level at 185,000 places and allocate 132,240 places (over 70 per cent) to the Skill stream". 129,590 places will go to onshore migrants, plus 300 for Special Eligibility.
- **Category breakdown (THIRD-PARTY, consistent across several agent blogs):**

  | Category | 2025-26 | 2026-27 |
  |---|---|---|
  | Skilled Independent (189) | ~16,900 | 21,090 |
  | State/Territory Nominated (190) | 33,000 | 35,500 |
  | Regional (491/494) | 33,000 | 14,110 |
  | Employer Sponsored | 44,000 | 58,040 |
  | Talent & Innovation | — | 3,500 |
  | Family | — | 52,460 |

  - The Family figure of 52,460 is confirmed by an official snippet (SAW).
  - The 2025-26 State/Territory Nominated figure of 33,000 also appears in an official Home Affairs snippet (SAW).
  - **Story lead:** the 491 regional planning level is cut by about 57%. Third parties report this.
- **Format:** HTML table on immi. PDF in the budget papers.
- **Cadence:** once a year, at the May Budget.
- **Scraping notes:**
  - It changes once a year. Hand-enter it, with a weekly hash check on the immi page if that page can be reached.
- **Also noted:**
  - A 17 Sep 2026 ministerial release and National Press Club speech (SAW, official): https://minister.homeaffairs.gov.au/TonyBurke/Pages/speech-national-press-club-17092026.aspx. They mention Ministerial Direction changes and a redone points test. **Possibly high impact. Verify before telling users anything.**
  - Ministerial Direction PDFs, cited by migratio: https://immi.homeaffairs.gov.au/Visa-subsite/files/md-121.pdf and md-122.pdf.
- **Confidence:** totals (185,000 / 132,240) medium to high. Category split medium.

## 4. Skilled occupation lists (CSOL, MLTSSL, STSOL, ROL)

- **Home Affairs:**
  - The skill occupation list page on immi could not be reached. No fetch or search result returned its exact current URL.
  - CSOL PDF: https://immi.homeaffairs.gov.au/Documents/core-sol.pdf (SAW, official). The search tool dated it about 700 days old.
- **Best reachable official source: the Federal Register of Legislation.**
  - https://www.legislation.gov.au/F2019L00278/latest (FETCHED)
    - Instrument: LIN 19/051, "Specification of Occupations and Relevant Assessing Authorities". It is the legal source of the lists for 189, 190, 491 and 485.
    - Latest compilation: F2026C00265, dated 28 March 2026.
    - Its table of contents has "8 Medium and Long-term Strategic Skills List", "9 Short-term Skilled Occupation List" and "10 Regional Occupation List".
    - Downloads tab. Text also exists as EPUB/HTML at paths like `/F2019L00278/2026-03-28/2026-03-28/text/original/epub/OEBPS/document_1/document_1.html` (SAW).
  - https://www.legislation.gov.au/F2024L01618/latest (FETCHED)
    - The subclass 186 instrument (2024), which contains "7 Core Skills Occupation List".
    - Compilation F2026C00263, dated 28 March 2026.
    - CSOL is for employer-sponsored visas (482/186). It is not the list for 189, 190 or 491.
  - LIN 24/089 (482 occupations) appears on https://immi.homeaffairs.gov.au/what-we-do/skilled-migration-program/visa-options/legislative-instruments (SAW, official).
- **robots.txt for legislation.gov.au (FETCHED):** `Crawl-delay: 10`, only `/assets/` disallowed, and a sitemap at https://www.legislation.gov.au/sitemap.xml.
- **Format:** HTML/EPUB tables (ANZSCO code, occupation, assessing authority), plus PDF and Word.
- **Cadence:** amended a few times a year. Compilations are dated, so detect changes by the compilation number in the `/latest` page.
- **Scraping notes:**
  - Each day, check `/F2019L00278/latest` for a new compilation ID such as `F2026C00265`.
  - When it changes, fetch the HTML text and parse the tables under sections 8, 9 and 10.
  - The Register also has an API (not investigated).
- **Licence:** not checked on the site. Commonwealth legislation is generally CC BY 4.0. **Verify.**
- **Confidence:** high for the instrument and section structure. List contents not read.

## 5. Home Affairs news, media releases and SkillSelect updates

- **News archive:** https://immi.homeaffairs.gov.au/news-media/archive. FAILED with 403. Also SAW (official).
  - Snippet: "last updated on 25/09/2026".
  - Item URLs follow `/news-media/archive/article?itemId=NNNN`, for example itemId 1327 ("skilled visa income", updated 18/09/2026) and 1329.
  - The itemId is a sequential integer. Watching for the next ID is a possible way to detect changes.
- **SkillSelect overview:** https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/overview (SAW). No separate "latest updates" page or RSS feed was found.
- **Ministers' site:** https://minister.homeaffairs.gov.au/TonyBurke/Pages/... and /JulianHill/Pages/... (SAW). robots.txt FAILED with 403.
- **No RSS or Atom feed found** for any Home Affairs site.
- **Confidence:** low on structure.

## 6. State and territory sites

### QLD: Migration Queensland (confidence: high for structure, medium for allocations)

- **News:** https://migration.qld.gov.au/news (FETCHED)
  - Each card is one `a[href^="/news/"]` wrapping an image, an `h5` title and an optional subtitle.
  - **No date per item.** No pagination: 23 items, newest first.
  - The footer reads "Last published: 4:36 pm, Friday, 30 October 2026".
  - Latest item: "2026-27 SNMP now published" (30 Oct 2026).
- **2026-27 status:**
  - Program published 30 Oct 2026. **ROI model**, with ROIs open from **6 Nov 2026**.
  - Everyone must lodge a new ROI. Onshore applicants need a 2025-26 ATO Notice of Assessment.
- **Allocations:**
  - 2026-27: not published.
  - 2025-26: 1,850 for 190 and 750 for 491 (THIRD-PARTY only).
- **Occupation lists:** https://migration.qld.gov.au/occupation-lists (FETCHED)
  - Onshore list `/occupation-lists/queensland-onshore-skilled-occupation-list` (FETCHED): an HTML `table` of about 210 rows.
    - Columns: ANZSCO Code, Occupation, 491, 190, Building & Construction pathway. Ticks mark eligibility.
    - No date. No PDF or XLSX.
  - Offshore QSOL: `/occupation-lists/offshore-queensland-skilled-occupation-lists-(qsol)` (SAW link only).
- **Round data or statistics:** none published.
- **Feeds:**
  - No RSS.
  - https://migration.qld.gov.au/sitemap.xml (FETCHED): about 155 URLs, all with `<lastmod>`. Newest is 2026-11-04. **Use lastmod for change detection.** It also contains test or sandbox URLs; filter them out.
- **robots.txt:** 404, so no rules.
- **Licence:** /About/Copyright (FETCHED) says "reproduction by whatever means is prohibited without the prior written permission". **Store facts and links only.**

### NSW: nsw.gov.au (confidence: medium)

- **News:** https://www.nsw.gov.au/visas-and-migration/news-and-updates (FETCHED)
  - Cards: label, date, `h3 > a` title, summary.
  - **Stale.** Only 3 items, the latest dated 27 Sep 2023.
- **Hash these pages instead (all FETCHED; none carries a date):**
  - `/visas-and-migration/skilled-visas`
  - `/visas-and-migration/skilled-visas/skilled-nominated-visa-subclass-190`
  - `/visas-and-migration/skilled-visas/skilled-work-regional-visa-subclass-491`
  - `/visas-and-migration/skilled-visas/nsw-skills-lists`
- **2026-27 status:**
  - **EOI model** (no ROI). "There are no predetermined or publicly announced dates for NSW invitation rounds."
  - The 491 page says applications are closed for the current program year and settings are under review.
  - An agent (racc.net.au, FETCHED, THIRD-PARTY) says 190 is open for 2026-27, with a first round in the week of 19 Oct 2026. The official pages don't say so.
- **Allocations:**
  - 2026-27: not published.
  - 2025-26: 2,100 for 190 and 1,500 for 491 (THIRD-PARTY).
- **Occupation list:** nsw-skills-lists, an HTML list with two columns (ANZSCO Code, Unit Group Name). It has been updated for 190 only; the 491 list is pending.
- **Round results:** none published, despite the brief's assumption that NSW publishes them.
- **robots.txt (FETCHED):** no crawl-delay. Disallows `/*?*` (any query string), `/search/`, `/node/`, `/taxonomy/` and `/archive/`. `/visas-and-migration/` is allowed.
- **Sitemap:** https://www.nsw.gov.au/sitemap.xml (FETCHED) is an index of 8 child sitemaps. The children were not opened.
- **Licence:** CC BY 4.0 (FETCHED). Attribute as "© State of New South Wales. For current information go to www.nsw.gov.au."

### VIC: Live in Melbourne (confidence: medium for facts, low for structure)

- **Every path returned 403**, including robots.txt. No structure was inspected.
- **News:** https://liveinmelbourne.vic.gov.au/news-events/news (SAW). Article URLs follow `/news-events/news/<YYYY>/<slug>`.
  - Latest items, per search: 26 Oct 2026 (2026-27 program open for 190 ROIs) and 13 Oct 2026 (fees).
- **2026-27 status:**
  - **ROI model**, ranked by the Victorian Points Test.
  - **190 open, 900 places** (official snippet).
  - 491 ROIs closed; places not finalised.
  - Fees: ROI $60 + GST, nomination $180 + GST.
  - Program page: https://liveinmelbourne.vic.gov.au/migrate/skilled-migration-visas/2026-27-skilled-visa-nomination-program (SAW).
- **2025-26 allocation:** final 3,400, of which 2,700 for 190 (official snippet) and 700 for 491 (THIRD-PARTY).
- **Occupation list:** none found. VIC appears to rank by points rather than publish a list.
- **Statistics:** none found.
- **Licence and robots:** unknown.

### SA: Migration SA (confidence: high)

- **News:** https://migration.sa.gov.au/news (FETCHED)
  - Cards: plain-text date such as "22nd Oct 2026" (ordinal day), an optional category link, an `h3` title and a "Read More" link.
  - Pagination via `/news/p2`.
  - Filters: `?category=invitations-issued` and `?category=other-news`.
  - Latest item: 22 Oct 2026, "South Australia's General Skilled Migration Program Update".
- **2026-27 status:** open, with a hybrid model.
  - Onshore: ROI, for people in SA whose visas expire by 31 Jan 2027.
  - Offshore: invited directly from SkillSelect.
  - Priority sectors are listed.
- **Allocations:**
  - 2026-27: not published.
  - 2025-26: **1,350 for 190 and 900 for 491** (FETCHED, news post of 24 Nov 2025).
- **Occupation list:** https://migration.sa.gov.au/before-applying/work-in-sa/occupation-lists/occupations-list (FETCHED). HTML headings, not a table: category heading, then occupation with ANZSCO code. No file download.
- **Round statistics: yes.** "Invitations issued – <Month YYYY>" news posts, each with an HTML `table`.
  - Rows: ANZSCO sub-major group.
  - Columns: this round 190 / 491 / Total, and year to date 190 / 491 / Total.
  - Latest: `/news/invitations-issued-late-may-2026` (FETCHED). 238 invitations on 21 May 2026; 2,853 for 2025-26 to date.
  - No 2026-27 posts yet.
- **Feeds:**
  - No RSS.
  - Sitemap index https://migration.sa.gov.au/sitemap.xml (FETCHED).
  - News sitemap https://migration.sa.gov.au/sitemaps-1-section-news-12-sitemap.xml (FETCHED): 45 URLs with lastmod; newest 2026-10-23.
- **robots.txt:** 404 on the bare host. The `www.` host fails TLS, so use the bare host only.
- **Licence:** **CC BY 4.0** (FETCHED). Attribute to the Department of State Development, Government of South Australia.

### WA: Migration WA (confidence: high for structure, medium for 2026-27)

- **News:** https://migration.wa.gov.au/news (FETCHED), a Drupal site.
  - Each item: image, title heading, a date like "Fri, 03/07/2026 - 10:40" (DD/MM/YYYY, 24-hour) and a "Read more" link to `/news/<slug>`.
  - Paging via `?page=1`.
  - Latest item 03/07/2026 (not SNMP news). Latest SNMP item 08/12/2025.
- **Main data page:** https://migration.wa.gov.au/our-services-support/state-nominated-migration-program (FETCHED)
  - **EOI model**, with monthly invitations.
  - Table "2026-27 program year — Invitations issued": **2,327 to date** (1,620 for 190, 707 for 491). The October round was 1,227 (priority invitations issued 14 Oct). September was 1,100 per a third party.
  - "Last invited EOI" points by stream, with dates. Example: Non-trade, WASMOL Schedule 2, 190 WA: 90 points (09/04/2026).
  - 2026-27 allocation: not published.
  - 2025-26 allocation: 2,000 for 190 and 1,400 for 491 (THIRD-PARTY).
- **Occupation list (WASMOL):** rendered client-side.
  - **CSV export** (SAW link on the page, not fetched): https://migration.wa.gov.au/v2_occupation_search/occupation-search?page&_format=csv
- **Per-occupation round PDFs:** in `/sites/default/files/YYYY-MM/`, so the path changes every month. Discover them from the SNMP page. Example: `.../2026-10/Oct%202026%20-%20SNMP%20Invite%20Round%20-%20Last%20Invited%20By%20Occupation%20in%20other%20priority%20occupation.pdf` (SAW).
- **Feeds:**
  - `/rss.xml` returns 404.
  - `/sitemap.xml` (FETCHED): 38 URLs with lastmod; newest 2026-11-06. No news URLs in it.
- **robots.txt (FETCHED):** Drupal default with no crawl-delay. `/node/` and `/search` are disallowed; `/news` and `/our-services-support/` are allowed.
- **Licence:** **not CC.** https://migration.wa.gov.au/copyright (FETCHED) forbids reproduction, reuse or publication without written permission. **Store facts and links only, and consider asking website@dtwd.wa.gov.au for permission.**

### TAS: Migration Tasmania (confidence: low to medium)

- **Every fetch returned 403**, including robots.txt. The site appears to run on Squiz Matrix.
- **News:** https://www.migration.tas.gov.au/news (SAW).
  - The 2026-27 opening notice reuses an old slug: https://www.migration.tas.gov.au/news/2024-25_program_open_to_rois (SAW, titled "Program Update - August 2026 - 2026-27 Program Opening").
- **2026-27 status (SAW and THIRD-PARTY):**
  - **ROI model.** ROIs opened 17 Aug 2026, with weekly invitation rounds from 20 Aug.
  - No 491 offshore (OSOP) invitations this year.
  - Allocation: **1,250 for 190 and 800 for 491** (2,050 in total).
- **Statistics:** https://www.migration.tas.gov.au/news/processing_times_and_allocation_usage (SAW), updated weekly.
  - Third party (migratio): the 5 Nov 2026 round invited 68 for 190 and 28 for 491; places left were 828 for 190 and 628 for 491. Unverified.
- **Documents:**
  - Document library: https://www.migration.tas.gov.au/skilled_migration/document_library (SAW).
  - Summary of Changes PDF (SAW): https://www.migration.tas.gov.au/__data/assets/pdf_file/0006/644352/2026-27-Tasmanian-Skilled-Migration-State-Nomination-Program-Summary-of-Changes-August-2026.pdf
- **RSS, sitemap and licence:** unknown.

### ACT: act.gov.au/migration (confidence: high)

- **Updates:** no news page. The "Updates" block on https://www.act.gov.au/migration (FETCHED) has 5 undated bullets. Contact is through an email newsletter only.
- **Round page:** https://www.act.gov.au/migration/resources/canberra-matrix-invitation-round (FETCHED)
  - Structure: H1, then H2 sections, H3 groups (Canberra residents / Overseas / Application Count) and H4 categories.
  - The data is in `ul` bullets with bold text. No tables.
- **12 Oct 2026 round:** 261 invitations, all for 190.
  - Doctorate Streamlined Pathway: 54.
  - Canberra residents, Small Business Owners: 18 (minimum score 120).
  - Canberra residents, Critical Skill Occupations: 126.
  - Overseas applicants, Critical Skill Occupations: 63.
  - No 491 invitations.
  - Tentative next rounds: weeks of 25 Jan, 22 Mar and 24 May 2027.
- **2026-27 status:** EOI plus Canberra Matrix. The allocation is "not yet been confirmed by the Australian Government".
- **2025-26 allocation:** 800 for 190 and 800 for 491, all used.
- **Library:** https://www.act.gov.au/migration/resources/library-guidelines-and-invitations (FETCHED). Each document is an H3 with a PDF link and a DOCX link.
- **Rankings DOCX (best parse target):** https://www.act.gov.au/__data/assets/word_doc/0009/3140487/2026-27-Invitation-Round-Rankings.docx (FETCHED)
  - One table of about 108 rows.
  - Columns: ANZSCO unit group | title | Canberra resident 491 | Canberra resident 190 | Overseas 491 | Overseas 190.
  - Cells hold the minimum Matrix score, sometimes with a tie-break date. Example: 2613 → N/A | 130 (7/9/2026) | N/A | 105.
  - Asset IDs change with every new version, so **discover the link from the library page each day.**
- **Occupation list:** https://www.act.gov.au/migration/skilled-migrants/act-nominated-migration-program-occupation-list (FETCHED)
  - Table-like layout; some rows are marked "(491 Only)".
  - Still dated "October 2025", not yet refreshed for 2026-27.
  - PDF and DOCX copies are under `/__data/assets/`.
- **robots.txt (FETCHED):** **Crawl-delay: 20.** `/migration` and `/__data/assets/` are allowed.
- **Sitemap:** https://www.act.gov.au/sitemap.xml (FETCHED, partly read).
- **Licence:** **CC BY 4.0** (FETCHED). Credit "© Australian Capital Territory".

### NT: theterritory.com.au (confidence: low to medium)

- **Fetching:** every fetch returned 403. `www.theterritory.com.au` fails DNS, so use the bare domain.
- **Updates:** published as Drupal nodes such as https://theterritory.com.au/node/2927 (SAW). No news list was found.
- **Media release:** the 2026-27 announcement was an NT Government media release, dated 20 Aug 2026 in a National Tribune republication (FETCHED): https://www.nationaltribune.com.au/nt-secures-biggest-skilled-migration-boost-in-nation/
- **2026-27 status:**
  - Direct application through the NT portal (no ROI), open from 21 Aug 2026.
  - Sources conflict on whether the offshore Priority Occupation stream is closed.
- **Allocations:**
  - 2026-27: **850 for 190 and 1,000 for 491** (1,850 in total).
  - 2025-26: 1,650 in total.
- **Occupation list:** the offshore list (NTOMOL) is at https://theterritory.com.au/node/76 (SAW), last updated 9 Jul 2024.
- **Round data:** none, since NT uses direct applications.
- **RSS, robots and licence:** unknown.

---

## 7. SkillSelect EOI data dashboard (Qlik)

- **URL:** https://api.dynamic.reports.employment.gov.au/anonap/extensions/hSKLS02_SkillSelect_EOI_Data/hSKLS02_SkillSelect_EOI_Data.html (FETCHED)
  - The page returned only interface chrome: Back/Next/"Navigate to sheet" buttons and `skillselect-logo.png`.
  - The data loads client-side through Qlik. There was no as-at date, script URL or app ID in the extracted text.
- **Official linking page:** not confirmed.
  - A third party (oneuedu.com, FETCHED) says the data comes from "the EOI dashboard that the Department of Home Affairs publishes on SkillSelect" and links https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect, which returned 403.
  - The 2020 Migration Alliance article and FOI threads on righttoknow.org.au (SAW) reference the same `anonap` path.
- **Cadence:**
  - Third party: "The Department usually publishes the previous month's end-of-month data early in the following month". Its latest snapshot was "as at Oct 2026".
  - FOI history (SAW) shows long gaps: no updates after Nov 2020 and after Aug 2022, and the dashboard was taken down in 2020 over privacy concerns.
- **Data rules:**
  - Counts under 20 are shown as "<20" (third party).
  - Only two extra filter dimensions can be combined at once (FOI threads).
  - Figures cover EOIs in SUBMITTED status, and EOIs are not people.
- **Downloadable copy:**
  - **None found.** No data.gov.au dataset turned up in search, and data.gov.au itself returned 403.
  - The related data.gov.au dataset is "Permanent Migration Program (Skilled & Family) Outcomes Snapshot": https://data.gov.au/data/dataset/permanent-migration-program-skilled-family (SAW). It has CSV, XLSX and PDF files covering 2016-17 to 2024-25, was last updated 24 Apr 2026, and is licensed CC BY 2.5 AU. These are annual grants, not EOIs.
- **Scraping notes:**
  - "anonap" looks like a Qlik Sense anonymous virtual proxy. A headless browser could render the sheets.
  - The Qlik Engine websocket API (enigma.js) might allow direct queries. **Unverified, and it may breach the spirit of the site's terms. Ask before doing it.**
  - Without that, link to the dashboard rather than mirroring it.
- **Licence:** unknown.
- **Confidence:** URL high. Everything else low to medium.

## 8. State boundary geometry

- **Recommended:** ABS ASGS Edition 4 (2026) STE, from https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs/edition-4-july-2026-june-2031/access-and-downloads/digital-boundary-files (FETCHED).
  - File: `/statistics/standards/australian-statistical-geography-standard-asgs/edition-4-july-2026-june-2031/access-and-downloads/digital-boundary-files/STE_2026_AUST_SHP_GDA2020.zip`. A 20.34 MB shapefile in GDA2020 (latitude/longitude).
  - Released **22/07/2026**.
  - Licence: **CC BY 4.0** ("Unless otherwise noted, content is licensed under a Creative Commons Attribution 4.0 International licence"). © Commonwealth of Australia, administered by the ABS.
- **Edition 3 (2021):** `STE_2021_AUST_SHP_GDA2020.zip` (FETCHED page, released 20 Jul 2021), same licence.
- **GeoJSON from the ABS ArcGIS REST service:**
  - https://geo.abs.gov.au/arcgis/rest/services/ASGS2026/STE/MapServer (FETCHED)
    - Layers: STE (0), STE_GEN (1, generalised) and STE_PT (2).
    - Query formats: JSON, geoJSON and PBF.
    - Copyright field: "Australian Bureau of Statistics (ABS)".
  - The ASGS2021 equivalent (FETCHED) has the same three layers, maxRecordCount 2000, and a blank copyright field. Cite CC BY 4.0 from the ABS page.
  - A request of the form `.../ASGS2026/STE/MapServer/1/query?where=1=1&outFields=*&f=geojson` should return generalised GeoJSON. **Not tested.**
- **GitHub alternatives (weaker):**
  - https://github.com/symbolixau/data (FETCHED): ABS-derived, CC BY 4.0, but 2016 vintage.
  - https://github.com/ferocia/australia-geojsons (SAW): archived in 2023.
  - https://gist.github.com/Calvein/eaceb41348487a52be1d (SAW): simplified, vintage unknown.
- **ABS robots.txt (FETCHED):** disallows `/core/`, `/profiles/`, `/full`, `/section` and `*/print`. Sitemap at https://www.abs.gov.au/sitemap.xml.
- **Plan:**
  - Download once, simplify with mapshaper (for example to 1–2%, about 100 KB), and commit the GeoJSON to the repo.
  - Don't fetch it daily.
  - Attribute: "Based on ABS ASGS Edition 4 (2026) data, CC BY 4.0".
- **Confidence:** high.

---

## Ranked list: most valuable sources to automate first

Ranked by reachability today, value to users, change frequency and licence.

1. **ACT: invitation round page and rankings DOCX.**
   - Reachable and CC BY 4.0, with rich per-occupation minimum scores.
   - A round about every two months. Respect the 20-second crawl delay.
2. **SA: news list plus the news sitemap, and the "Invitations issued" tables.**
   - Reachable and CC BY 4.0, with dated items and sitemap lastmod.
   - Round tables will resume for 2026-27.
3. **WA: SNMP page (invitations to date, last-invited points) and the WASMOL CSV.**
   - Reachable, monthly, high value.
   - Copyright forbids reuse: extract numbers only, link back, and consider asking permission.
4. **QLD: sitemap lastmod, news list and onshore occupation table.**
   - Reachable, and its ROI program has just opened, which is topical.
   - No dates on items; facts only (all rights reserved).
5. **Home Affairs: invitation rounds, state nominations and allocations.**
   - The most valuable data in the system.
   - **Blocked with 403** for a basic fetcher. Run the browser-UA and headless test first.
   - Fallback: hand-entered YAML updated after each round, with third-party trackers as alerts only.
6. **NSW: content hashes of the 190, 491 and skills-list pages.**
   - Reachable and CC BY 4.0.
   - No dates and no statistics, so it only tells you "something changed".
7. **legislation.gov.au: LIN 19/051 compilation ID check** (MLTSSL, STSOL, ROL).
   - Authoritative and reachable (Crawl-delay 10), but changes a few times a year.
   - A weekly check is enough.
8. **VIC, TAS and NT: blocked with 403.** Try the same browser approach as Home Affairs. Otherwise hand-enter, and for NT watch NT Government media releases.
9. **SkillSelect EOI Qlik dashboard.** High interest but technically hard, terms unclear, and a history of outages. Link to it; don't scrape it for v1.
10. **ABS boundaries.** A one-off vendored asset, not a daily source.

## Open gaps

- Robots.txt and terms for Home Affairs, data.gov.au, VIC, TAS and NT. All were blocked.
- Official 2026-27 allocation table. Not seen; may be published in early November.
- The exact current URL of the Home Affairs skill occupation list page.
- Which official page links to the Qlik dashboard.
- The exact 2026-27 category planning levels from an official source. The budget PDF text wasn't extracted.
- The 15 Oct 2026 189 round count. Third parties conflict.
