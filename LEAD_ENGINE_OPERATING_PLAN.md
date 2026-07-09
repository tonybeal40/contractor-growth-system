# All-Pro Lead Engine Operating Plan

Last updated: 2026-07-08

This is the working checklist for All-Pro Metro East Construction, Bill's List Metro East, Codex, OpenClaw, and Wild Bill.

## Current Technical Baseline

- Main site deploys from GitHub Pages through Cloudflare.
- Public sitemap contains 644 indexable URLs.
- Internal SEO audit is clean at 100.0 average with zero issue counts.
- Rendered crawl passed mobile and desktop checks with zero status, overflow, H1, alt, phone, form, and long-word issues.
- Google Analytics tag: `G-35DEM1MGDT`
- Secondary Google tag: `GT-WPQ8Z726`
- Microsoft Clarity tag: `weti9tqt5q`
- IndexNow key is present for Bing indexing and can be used after important page changes.
- FormSubmit routes public forms to William, Tony Gmail copy, and Tony SMS gateway copies.
- Google Apps Script endpoint responds with `{"ok":true,"service":"All-Pro Form Handler"}`.
- Live contact form proof completed on 2026-07-07:
  - Google Sheet row captured in `All-Pro Leads` -> `Leads`.
  - FormSubmit email received in Gmail.
  - Bill is primary recipient, Tony is copied, and 618-292-5320 carrier gateway addresses are copied.
  - Thank-you redirect works.

## Phase 2 Lead Growth System

The next phase is not more random pages. It is a weekly loop that turns the site, Google Business Profile, reviews, photos, and follow-up speed into a lead engine.

Current execution pack:

- `NEXT_PHASE_7_DAY_LEAD_ACTION_PACK_2026-07-08.md`

### CRM Decision: Keep Google Sheet First

Formspree + Notion is useful as a simple visual CRM, but it should not replace the current tested flow yet. The current production path already captures leads through FormSubmit, email/text alerts, and the All-Pro Google Sheet.

Use this order:

1. Keep FormSubmit + Google Sheet as the primary source of truth.
2. Use the Sheet daily for fast follow-up and recovery.
3. Add Notion later as a secondary board only if lead volume grows enough that New -> Contacted -> Qualified -> Won/Lost tracking is needed.
4. Do not switch form providers until another full end-to-end test proves email, text, sheet/CRM capture, and thank-you routing.

If Notion is added later, send copies of the same lead fields into Notion: name, phone, email, city, service, source page, timestamp, status, notes, and follow-up date.

Daily:
- Check Gmail for `New All-Pro Lead` messages.
- Check `All-Pro Leads` -> `Leads` for website form rows.
- Call or text every new lead as fast as possible.
- Mark lead status: new, contacted, estimate set, won, lost, spam, or vendor pitch.
- Save any useful project photos or before/after notes for future proof sections.

Weekly:
- Add one real project photo set to the site or Google Business Profile.
- Ask at least three happy customers for a review using `review.html` or `review-request.html`.
- Improve one money page with project proof, FAQs, or a clearer CTA.
- Submit changed URLs through IndexNow.
- Check Search Console and Bing Webmaster Tools for indexing and snippet issues.

Monthly:
- Review which pages produced calls/forms.
- Pick the next service/city pair to strengthen.
- Add one homeowner guide that answers a real search question.
- Add one contractor partner target list for Bill's List / Wild Bill outreach.

## Highest Priority Account Tasks

1. Redeploy the cleaned-up Apps Script when ready.
   - The current live script captures rows.
   - The repo copy aligns the intended column order better.
   - Redeploy from `allpro-form-handler.gs` when you are ready to clean up future Sheet columns.

2. Add Microsoft Ads UET once the tag ID is available.
   - Needed from Microsoft Ads: UET tag ID.
   - Do not invent this ID.
   - After the ID is available, add it to the shared tracking layer and fire lead conversions on `thank-you.html?src=form`.

3. Tighten Google Business Profile.
   - Confirm name, phone, website, service area, categories, and hours.
   - Add fresh project photos weekly.
   - Add posts for decks, bathrooms, kitchens, landscaping, fencing, concrete, patios, and small jobs.
   - Ask recent customers for reviews using `review.html` or `review-request.html`.

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
- Check Search Console and Bing Webmaster Tools for indexing issues, sitemap warnings, and stale search snippets.
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
