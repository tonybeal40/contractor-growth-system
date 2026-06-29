# Thumbtack Demand Router Plan

This note turns the pasted Thumbtack partner documentation into a practical lane for the All-Pro Local Demand Engine.

## The Useful Part

Thumbtack can be used as a downstream routing layer after the site captures demand.

The site should still be the upstream asset:

1. Helpful local SEO pages bring in homeowners.
2. First-party forms and phone links capture the lead.
3. The CRM stores source, page, city, service, and consent.
4. All-Pro follows up first when the job fits.
5. If the job is outside All-Pro's lane, the system can route the homeowner to a disclosed partner path such as Thumbtack.

This is different from trying to become a fake directory. The engine stays honest: real local pages, real business details, real routing disclosure.

## On Demand Widget

Thumbtack's On Demand Widget can be embedded with an iframe:

```html
<iframe
  src="https://thumbtack.com/embed/ondemand-request-flow?category_pk=109125193401647362&utm_medium=partnership&utm_source=cma-your-source"
  sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
  height="600"
  width="632"
></iframe>
```

Required inputs:

- `environment`: `https://thumbtack.com` for production or `https://staging-partner.thumbtack.com` for staging
- `category_pk`: supported Thumbtack category ID
- `utm_medium`: `partnership`
- `utm_source`: partner source, prefixed with `cma-`

Useful optional inputs:

- `zip_code`: prefill the local market
- `estimated_delivery_date`: next-day to less than 30 days out, format `YYYY-MM-DD`
- extra UTM fields for attribution

Supported home-service categories from the pasted docs:

- Carpet Cleaning: `122435952865247528`
- Gutter Cleaning and Maintenance: `124317070955717033`
- Handyman: `109125193401647362`
- Home Inspection: `152053870920155482`
- House Cleaning: `219264413294461288`
- Junk Removal: `150848602323501530`
- Lawn Mowing and Trimming: `122766917521637728`
- Pressure Washing: `124317505632420266`
- TV Mounting: `152396937238036850`
- Window Cleaning: `122707076295909723`

## Where This Fits On The Site

Do not put Thumbtack first on money pages where All-Pro can serve the customer.

Better placements:

- A fallback block on `thank-you.html` for urgent jobs All-Pro cannot take.
- A disclosed "compare more pros" route on future marketplace pages.
- Private/internal dispatch pages for phone staff.
- A partner test page kept `noindex` until credentials and disclosure are ready.

Suggested disclosure:

> If All-Pro is not the right fit or is unavailable, we may show partner options. Partner pages may be operated by third-party platforms and may use separate terms.

## Businesses Search API

The API can search Thumbtack businesses by service and zip code:

```http
POST /api/v4/businesses/search
Authorization: Bearer {{clientCredentials}}
Content-Type: application/json

{
  "searchQuery": "handyman",
  "zipCode": "62220",
  "utmData": {
    "utm_source": "cma-your-source"
  },
  "limit": 1
}
```

Useful returned fields:

- `searchID`
- `data[].businessName`
- `data[].rating`
- `data[].numberOfReviews`
- `data[].servicePageURL`
- `data[].widgets.requestFlowURL`
- `metadata.seeMoreProsURL`

This can power a partner fallback card, but it requires partner credentials and should run server-side.

## Webhooks

The pasted docs mention these event types:

- `NegotiationCreatedV4`
- `MessageCreatedV4`

The repo already has a generic webhook receiver in `server/webhook_app.py`. To productionize it:

1. Confirm Thumbtack's real signature/auth scheme with the partner account manager.
2. Store raw webhook events in `webhook_events`.
3. Normalize Thumbtack leads into `leads` with `source = 'thumbtack'`.
4. Deduplicate by negotiation ID.
5. Trigger fast follow-up alerts.

## Compliance Rules

- Do not fake businesses, locations, reviews, availability, or licensing.
- Do not sell or route leads without clear consent and disclosure.
- Keep partner widgets and fallback routing clearly labeled.
- Keep test pages `noindex`.
- Store source, landing page, UTM fields, consent, and raw payload for every lead.

## Build Order

1. Keep All-Pro SEO and first-party lead capture as the primary engine.
2. Add a `noindex` Thumbtack widget test page once a real `cma-` source is available.
3. Add a server-side Thumbtack API adapter only after credentials exist.
4. Add lead normalization from Thumbtack webhooks into the existing `leads` schema.
5. Add a disclosed partner fallback on thank-you/dispatch flows.
