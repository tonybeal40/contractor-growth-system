# Local Lead Engine

This tool creates a reviewable queue of public project opportunities and a separate queue of posts for business profiles All-Pro owns.

It is intentionally not a private-profile scraper. It does not bypass logins, collect private group content, harvest homeowner phone numbers, or send unsolicited messages. A captured opportunity contains a public source link and a `Reply on source` action so a person can read the full request, follow the community rules, and decide whether a helpful disclosed response is appropriate.

## Public Opportunity Scan

```powershell
python tools/local-lead-engine/lead_engine.py scan `
  --config tools/local-lead-engine/config.json `
  --seed tools/local-lead-engine/initial-public-opportunities.json
```

Outputs are written to `tools/local-lead-engine/output/` and ignored by Git:

- `opportunities.json`
- `opportunities.csv`
- `index.html`

The daily runner also builds `output/josh-highland/` from `config.josh-highland.json`. That lane uses Josh Barber's public All-Pro page, contact details, Highland as its center, and a 20-mile approved Nextdoor search radius. It still requires human review before any reply.

`josh-business-prospects.json` is a separate relationship list for public property-management and procurement pages. Those records are possible introductions, not active jobs. Do not claim that a company needs help unless its official site or bid page says so.

### Supported Sources

- manually reviewed public source records
- public RSS/Atom feeds that permit automated access
- Nextdoor Displaying Content Search API after Nextdoor approves the application and issues OAuth access

Set an approved Nextdoor token only in the environment:

```powershell
$env:NEXTDOOR_ACCESS_TOKEN = "..."
```

The official endpoint searches public posts by keyword, coordinates, and radius. Only posts from the last seven days are eligible in Nextdoor's API. Never commit the token.

The sample Reddit RSS query is disabled because anonymous Reddit search feeds can return `429 Too Many Requests`. Keep it off unless Reddit permits the traffic for your use case; use an approved Reddit API application for a production/commercial monitor.

## Owned-Channel Posting

See `SOCIAL_AUTHORIZATION.md` and `social_publisher.py`. Publishing defaults to a dry run and requires an explicit `--confirm-publish` flag plus an OAuth token for the business account.

## What Counts As A Lead

An item is an opportunity, not a confirmed lead, until a homeowner responds and consents to contact. Before replying:

1. Open the original source.
2. Confirm the post is current and inside the real service area.
3. Read the community's promotion rules.
4. Reply as All-Pro, not as a fake neighbor or customer.
5. Move contact information into the normal estimate form only with the homeowner's participation.

## Tests

```powershell
python -m unittest discover tools/local-lead-engine/tests -v
```
