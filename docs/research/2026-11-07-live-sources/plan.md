# Plan: live official data sources for VisaRadar (2026-11-07)

**Question:** Which official, frequently updated data sources and APIs for Australian skilled migration can a static site fetch automatically, with an honest user agent, that we don't use yet? How do we detect their changes fast?

**Decision it serves:** which new fetchers to build next, in order.

**Already used:**
- SkillSelect EOI Qlik dashboard
- QLD, NSW, SA, WA and ACT news
- ACT rankings DOCX
- WA and SA invitations
- legislation.gov.au lists

**Blocked to plain fetch:** Home Affairs, VIC, TAS and NT.

**Tier:** Standard, 4 sub-agents.

## Sub-questions
1. **gov-data**: Dataset and API platforms: data.gov.au CKAN API (Migration Program outcomes, visa grants, the BP0014 skilled visa dataset, temporary visa holders), ABS APIs (overseas migration), and the Jobs and Skills Australia Occupation Shortage List with its API or download. For each, cover endpoints, cadence, latest date, licence and change detection.
2. **dashboards**: Other official dashboards (Qlik, Power BI, Tableau) by Home Affairs or DEWR: visa processing times, the 482 or nominations dashboards, the SkillSelect invitation round results, "Migration Program report" PDFs. Which ones expose machine-readable endpoints anonymously?
3. **feeds**: RSS, Atom, sitemaps and email-alert feeds for Home Affairs news, ministers' media releases, the Federal Register of Legislation (new instruments: LINs, occupation lists), APH (Hansard, bills), and state sites (VIC, TAS, NT alternatives). Do any of these mirrors stay reachable when the main site blocks bots, such as official GovDelivery or Mailchimp archives?
4. **counter**: Limits and risks: terms of use that forbid automated access (Home Affairs, the Register of Legislation, Jobs and Skills Australia), rate limits, CC BY attribution needs, and the reliability of third-party mirrors. Is anything we plan to use unsuitable?
