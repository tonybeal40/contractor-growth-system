# All-Pro Lead Engine Operating Plan

Last updated: 2026-07-01

This is the working checklist for All-Pro Metro East Construction, Bill's List Metro East, Codex, OpenClaw, and Wild Bill.

## Current Technical Baseline

- Main site deploys from GitHub Pages through Cloudflare.
- Public sitemap contains 643 indexable URLs.
- Internal SEO audit is clean at 100.0 average with zero issue counts.
- Rendered crawl passed mobile and desktop checks with zero status, overflow, H1, alt, phone, form, and long-word issues.
- Google Analytics tag: `G-35DEM1MGDT`
- Secondary Google tag: `GT-WPQ8Z726`
- Microsoft Clarity tag: `weti9tqt5q`
- IndexNow key is present for Bing indexing.
- FormSubmit routes public forms to William, Tony Gmail copy, and Tony SMS gateway copies.
- Google Apps Script endpoint responds with `{"ok":true,"service":"All-Pro Form Handler"}`.

## Highest Priority Account Tasks

1. Run one real test lead from the live website.
   - Page: `https://allprometroeastconstruction.com/contact.html`
   - Use a clear subject/details like `CODEX TEST LEAD - safe to delete`.
   - Confirm William Gmail receives it.
   - Confirm Tony Gmail receives it.
   - Confirm Tony phone receives the SMS gateway alert at `618-292-5320`.
   - Confirm the Google Sheet/App Script log captures the row.

2. Add Microsoft Ads UET once the tag ID is available.
   - Needed from Microsoft Ads: UET tag ID.
   - Do not invent this ID.
   - After the ID is available, add it to the shared tracking layer and fire lead conversions on `thank-you.html?src=form`.

3. Tighten Google Business Profile.
   - Confirm name, phone, website, service area, categories, and hours.
   - Add fresh project photos weekly.
   - Add posts for decks, bathrooms, kitchens, landscaping, fencing, concrete, patios, and small jobs.
   - Ask recent customers for reviews using `review-request.html`.

4. Citation cleanup.
   - Confirm consistent name/phone/site on Google, Bing Places, Apple Maps, Yelp, Facebook, LinkedIn, Nextdoor, Angi, HomeAdvisor, Houzz, Thumbtack, BBB, and local chamber/directories.
   - Keep service area language focused on Belleville, O'Fallon, Edwardsville, Collinsville, Swansea, Shiloh, Glen Carbon, Maryville, Fairview Heights, Granite City, and Metro East IL.

## Weekly SEO Work

- Add one real project photo set or before/after proof.
- Add or improve one money page:
  - `kitchen remodel belleville il`
  - `bathroom remodel belleville il`
  - `deck builder belleville il`
  - `landscaping belleville il`
  - `fence contractor belleville il`
  - repeat for O'Fallon and Edwardsville.
- Add one Google Business Profile post.
- Ask for three reviews after completed jobs.
- Check Search Console and Bing Webmaster Tools for indexing issues.
- Run `python scripts/seo_audit.py` before publishing site changes.

## Bill's List Metro East

Keep Bill's List on the All-Pro domain for now.

Public positioning:
- Homeowner-first project match desk.
- All-Pro is the primary verified contractor lane today.
- Future vetted local contractors can request listing review.
- Do not claim the directory is neutral if paid routing or All-Pro-first routing affects placement.

Pages to maintain:
- `metro-east-contractor-match.html`
- `how-metro-east-project-match-works.html`
- `metro-east-pro-network.html`
- `bill-s-list-contractor-listing.html`
- `bill-s-list-disclosure.html`
- `privacy.html`
- `terms.html`

## Wild Bill Lead Rules

Wild Bill can collect public business lead targets for website, SEO, lead generation, and partner outreach only when the information is publicly available.

Allowed:
- Business name
- Website
- Public phone number
- Public email
- City/service area
- Services offered
- Notes about visible website/SEO/review gaps
- Public proof links

Not allowed:
- Scraped personal consumer leads.
- Hidden or private contact data.
- Automated robocalls or mass texts without consent.
- Fake reviews, fake contractor listings, fake locations, or misleading directory claims.
- Dark-web sourcing or shady lead buying.

Best early targets:
- Small family-owned or independent local trades.
- Companies with weak websites but real local reputation.
- Contractors who could benefit from web, SEO, photos, review workflows, or lead capture.
- Service lanes All-Pro does not want to perform directly.

## Phone Workflow

When on phone, use short commands:

- `Codex: check forms and push if clean`
- `Codex: add this photo to the right project section`
- `Codex: make this page match the homepage`
- `Codex: create a Google Business post from this project`
- `Codex: add this company to Wild Bill partner targets`
- `Codex: run SEO audit and tell me what changed`

## What Not To Chase Yet

- Do not buy a standalone Bill's List domain until lead flow and partner demand are proven.
- Do not split the brand too early.
- Do not rebuild the whole site in a framework just for style.
- Do not promise first-page rankings as guaranteed.
- Do not add paid marketplace language without disclosure.
