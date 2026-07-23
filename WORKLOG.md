# Worklog

## 2026-07-23

- Locked recurring customer outreach to a generic project-budget planning note with free consultations, free estimates, photo replies, and one branded estimate link.
- Removed service lists and prior-project language from the saved Apps Script marketing email.
- Updated the outreach policy and setup guides so future customer emails never state what the person requested, what Bill sold, or what work All-Pro completed.

## 2026-07-11

- Reviewed official guidance for Google AI features, ChatGPT Search, and Microsoft Copilot/Bing AI visibility.
- Explicitly allowed `OAI-SearchBot` in `robots.txt`; the existing public crawl rules remain in place.
- Corrected 600 public pages whose LocalBusiness schema incorrectly used a target city as All-Pro's address. The business address now consistently uses 1115 Priscilla Ct, New Athens, IL 62264, while each page retains its target city in `areaServed`.
- Fixed both public-page generators so future generated pages preserve the same business/address distinction.
- Added `scripts/submit_indexnow.py` and connected it to the GitHub Pages workflow so changed indexable pages are submitted to IndexNow after deployment.
- Regenerated `sitemap.xml` with 645 indexable URLs.
- Validation: zero incorrect business-schema localities, zero JSON-LD parse errors, SEO audit average 100.0, and HTTP 200 responses for OAI-SearchBot, Bingbot, and Googlebot user agents.

## Deployment gate

1. Commit and push the intended changes to `main`.
2. Confirm the GitHub Pages deployment succeeds, including the IndexNow step.
3. Confirm the live `robots.txt` contains the explicit OAI-SearchBot rule.
4. Redeploy the Apps Script lead handler.
5. Submit one controlled lead and confirm its Sheet row, email, and text alert.
