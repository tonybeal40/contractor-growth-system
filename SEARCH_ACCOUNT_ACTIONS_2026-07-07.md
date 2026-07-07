# Search Account Actions - 2026-07-07

This is the account-side checklist for getting the latest All-Pro pages recrawled after the site cleanup.

## Already handled on the site

- `robots.txt` exposes both sitemap files.
- `sitemap.xml` contains the public indexable pages.
- `d572a4ce6cd84a499d4c761de6f83d80.txt` is the IndexNow key file for Bing-compatible crawlers.
- All sitemap pages have the Google tags and Microsoft Clarity tag installed.
- All public FormSubmit pages have the lead-tracking script installed.
- The customer review short link is `https://allprometroeastconstruction.com/review.html`.

## Google Search Console

Submit or confirm this sitemap:

```text
https://allprometroeastconstruction.com/sitemap.xml
```

Use URL Inspection and request indexing for these priority pages:

```text
https://allprometroeastconstruction.com/
https://allprometroeastconstruction.com/kitchen-remodel-belleville-il.html
https://allprometroeastconstruction.com/bathroom-remodel-belleville-il.html
https://allprometroeastconstruction.com/deck-builder-belleville-il.html
https://allprometroeastconstruction.com/decks.html
https://allprometroeastconstruction.com/landscaping-ofallon-il.html
https://allprometroeastconstruction.com/patio-contractor-metro-east.html
https://allprometroeastconstruction.com/concrete-patio-cost-guide-metro-east.html
https://allprometroeastconstruction.com/concrete-contractor-belleville-il.html
https://allprometroeastconstruction.com/handyman-belleville-il.html
https://allprometroeastconstruction.com/metro-east-contractor-match.html
https://allprometroeastconstruction.com/review-request.html
```

Do not use the old public Google sitemap ping URL. Google retired that path; use Search Console, the Search Console API, and the sitemap lines in `robots.txt`.

## Bing Webmaster Tools

Confirm this sitemap is listed with zero errors:

```text
https://allprometroeastconstruction.com/sitemap.xml
```

After important page changes, submit the priority URLs through IndexNow and use URL Inspection for any page showing stale title, preview image, or meta description.

## Birdeye Profile

Website:

```text
https://allprometroeastconstruction.com/
```

Keywords:

```text
Construction, Vinyl Fences, Deck Builder, Fence Contractor, Landscaping, Concrete Contractor, Patio Contractor, Bathroom Remodel, Kitchen Remodel, Outdoor Living, Handyman Services, Metro East IL, Belleville IL, O'Fallon IL, Edwardsville IL, Collinsville IL, Swansea IL, Shiloh IL
```

Business description:

```text
All-Pro Landscape Construction helps Metro East Illinois homeowners with decks, vinyl fences, wood fences, landscaping, patios, concrete, bathroom remodels, kitchen remodels, outdoor living projects, pressure washing, yard cleanup, and small home repairs.

Owner Bill Session works with homeowners who want clear communication, practical project advice, written estimates, and work done right. All-Pro serves Belleville, O'Fallon, Edwardsville, Collinsville, Swansea, Shiloh, Fairview Heights, Glen Carbon, Maryville, Granite City, and surrounding Metro East IL communities.

Call 618-581-0676 to request a written estimate for your next home improvement, remodeling, fence, deck, landscaping, concrete, patio, or small repair project.
```

## Google Business Profile

Weekly work:

- Add 3-5 real project photos.
- Add one short post linking to the most relevant money page.
- Ask recent customers to use `https://allprometroeastconstruction.com/review.html`.
- Reply to every new review with the service and city when natural.

## Proof To Check

- Google Search Console: latest sitemap read date and indexed pages.
- Bing Webmaster Tools: sitemap warnings and URL Inspection warnings.
- GA4 Realtime: form submit, call click, and page view events.
- Lead inbox: William Gmail, Tony Gmail copy, and Tony SMS gateway alerts.
- Google Sheet/App Script: one controlled test lead row.
