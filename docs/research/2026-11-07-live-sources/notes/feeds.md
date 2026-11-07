# Feeds and change signals (sub-agent notes, 2026-11-07)

## Works today (fetched)
- Federal Register of Legislation REST/OData API, no key: https://api.prod.legislation.gov.au/v1/titles?$filter=startswith(name,'Migration')&$orderby=asMadeRegisteredAt%20desc&$top=10&$select=id,name,collection,asMadeRegisteredAt,status
  Newest: F2026L01466 Migration Amendment (Referred Stay (Permanent) (Class DH) Visa) Regulations 2026, registered 2026-11-02; F2026L01448 Migration Amendment (2026 Measures No. 1) Regulations 2026, 2026-10-31. Unfiltered query current to 2026-11-06. Watermark on asMadeRegisteredAt (not id). Docs: https://api.prod.legislation.gov.au/swagger/index.html. Reuse page asks for crawl delay and off-peak incremental crawls (outside 0800-2000 AEST): https://legislation.gov.au/help-and-resources/using-the-legislation-register/data-share-and-reuse
- PM media RSS: https://www.pm.gov.au/rss.xml (RSS 2.0, 50 items, newest 2026-11-06, not date-sorted).
- APH RSS index https://www.aph.gov.au/Help/RSS_feeds (committee inquiries, Bills Digests). ParlInfo feeds 403.

## Blocked (403 to plain fetch)
minister.homeaffairs.gov.au, homeaffairs.gov.au, liveinmelbourne.vic.gov.au, migration.tas.gov.au, theterritory.com.au, parlinfo.aph.gov.au.
No official RSS/GovDelivery/Mailchimp archive found for Home Affairs, VIC, TAS, NT. VIC has email newsletters only.

## Gaps
ETag/Last-Modified not observed. contains() filter returned 400 once (untested properly). Occupation-list instruments may not start with "Migration".
