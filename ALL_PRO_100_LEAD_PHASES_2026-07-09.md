# All-Pro 100 Lead Phases

Date: 2026-07-09

Goal: make the All-Pro lead system as close to 100% as practical: no missed leads, fast Bill follow-up, clean spreadsheet tracking, strong SEO, visible local proof, and a repeatable growth loop.

## Phase 1: Lead Recovery And Control

Status: in progress / mostly done.

Completed:

- Created `Follow Up Board` in the `All-Pro Leads` Google Sheet.
- Repaired `Live Leads 2026-06-29+` after a `#REF!` header problem.
- Backfilled key missed Nextdoor and website leads from Gmail.
- Added optional email field to `nextdoor.html`.
- Added optional email and website/profile fields to `metro-east-pro-network.html`.
- Confirmed every public FormSubmit form now has an email field.
- Confirmed the live Nextdoor test logs to the Sheet.
- Patched `allpro-form-handler.gs` so Apps Script can send Bill/Tony/SMS notifications itself after redeploy.

Phase 1 next actions:

1. Text Bill the high-priority leads from `Follow Up Board`.
2. Mark `Bill Text Sent?` as `Yes`.
3. Mark status after contact: `Contacted`, `Estimate Set`, `Won`, `Lost`, or `No Fit`.
4. Redeploy the updated Apps Script so the Sheet endpoint sends notifications directly.

## Phase 2: Make Apps Script The Primary Lead Engine

Current weakness:

- FormSubmit email can work, but it is a separate system from the Sheet logger.
- The better structure is one primary lead endpoint that logs and notifies.

Target structure:

```text
Website form
  -> Apps Script endpoint
  -> Google Sheet
  -> Bill email
  -> Tony email
  -> Tony SMS gateway alerts
  -> thank-you page
```

Implementation sequence:

1. Redeploy `allpro-form-handler.gs`.
2. Run one controlled test from:
   - homepage
   - contact page
   - get quote page
   - nextdoor page
   - estimator page
3. Confirm each writes to Sheet and sends notification.
4. Only after that, consider moving forms away from direct FormSubmit actions.

Do not switch all form actions until the deployed Apps Script notification path is proven.

## Phase 3: Daily Lead Operations

Daily checklist:

1. Check `Follow Up Board`.
2. Check `Live Leads 2026-06-29+`.
3. Search Gmail for:

```text
from:submissions@formsubmit.co newer_than:7d -in:trash
```

4. Text Bill every real lead that is still `New`.
5. Update status after Bill/customer contact.
6. Move vendor pitches to `Vendor Pitch`.

Bill text format:

```text
New All-Pro lead:
[Name]
[Phone]
[City]
[Service]
[Project summary]
Source: [source]
Next step: [call/text/customer needs photos/etc.]
```

## Phase 4: Local SEO And AI Answer Engine Levers

Priority money pages:

- `kitchen-remodel-belleville-il.html`
- `bathroom-remodel-belleville-il.html`
- `deck-builder-belleville-il.html`
- `landscaping-ofallon-il.html`
- `concrete-patio-cost-guide-metro-east.html`
- `small-handyman-jobs-ofallon-il.html`

Weekly page work:

1. Add real project proof.
2. Add one FAQ based on real customer questions.
3. Add one internal link from a related city/service page.
4. Submit changed URLs through IndexNow.
5. Request indexing manually in Google Search Console for top pages.

AI-answer content blocks to keep adding:

- When to call us
- What affects cost
- What to send before an estimate
- Common problems
- Repair vs replace
- Timeline
- Permit / HOA notes
- Local city context

## Phase 5: Google Business Profile And Reviews

Weekly Google Business Profile work:

1. Upload 3 to 5 real project photos.
2. Publish one post linking to a money page.
3. Ask 3 customers for reviews using:

```text
https://allprometroeastconstruction.com/review.html
```

4. Reply to reviews with city/service detail when natural.

Review ask:

```text
Hi, this is Bill with All-Pro. Thanks again for trusting us with your project. If you were happy with the work, would you mind leaving a quick Google review?

https://allprometroeastconstruction.com/review.html

If you can, mention the city and project type. That helps local homeowners know who they can trust.
```

## Phase 6: Traffic And Lead Channels

Owned channels:

- Google organic
- Bing organic
- Google Business Profile
- Bing Places
- Nextdoor
- Facebook
- LinkedIn
- Review pages
- Bill's List / contractor match

Paid channels to test carefully:

- Google Local Services Ads if eligible
- Google Search Ads for exact money keywords
- Nextdoor sponsored local post
- Facebook retargeting only after tracking is clean

Do not spend ad money until:

- Forms are verified.
- Calls and form submits are tracked.
- The follow-up board is worked daily.
- Bill can respond fast.

## Phase 7: Partner / Bill's List Lead Expansion

Purpose:

- Capture homeowner projects All-Pro can handle first.
- Route non-fit projects later to vetted contractors.
- Recruit contractors who need websites, SEO, lead capture, reviews, and AI-assisted local visibility.

Rules:

- No fake neutral marketplace claims.
- No fake listings.
- No scraped private consumer leads.
- No spam calls or spam texts.
- Every partner lane needs disclosure.

Best partner categories:

- Electricians
- Plumbers
- HVAC
- Roofers
- Junk removal
- Cleaners
- Painters
- Tree service
- Flooring
- Specialty repair contractors

## Phase 8: Weekly Scorecard

Track every Friday:

- New leads this week
- Leads texted to Bill
- Estimates set
- Won jobs
- Lost/no-fit jobs
- Vendor pitches
- Top source
- Top service
- Top city
- Reviews requested
- Reviews received
- Photos uploaded
- GBP posts published
- Pages improved

If one source is producing leads, build more around that source before chasing a new tool.

## Definition Of 100

The system is at 100 only when:

- Every form has email, phone, source, service, city, and consent fields.
- Every form writes to the Sheet.
- Every real lead lands in `Follow Up Board`.
- Bill gets every real lead fast.
- The status board is updated daily.
- Google Business Profile gets weekly photos/posts.
- Reviews are requested every week.
- Top money pages keep getting proof.
- Search Console/Bing indexing is monitored.
- No fake reviews, fake locations, or spam tactics are used.

Current biggest gap:

Redeploy the updated Apps Script so the Sheet endpoint sends notifications directly. After that, run controlled form tests and then simplify the form stack.
