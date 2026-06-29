# All-Pro Local Demand Engine

This repo now has a current-site local demand engine for `allprometroeastconstruction.com`.

## What it does

- Stores city targets in `data/cities.json`
- Stores service targets in `data/services.json`
- Stores local proof inputs in `data/proofs.json`
- Generates current-site service-city pages with:
  - self canonicals
  - `LocalBusiness` + `Service` + `FAQPage` + `BreadcrumbList` JSON-LD
  - first-party estimate form fields with attribution
  - review / guide / project proof links
- Writes public pages into the site root
- Rebuilds `sitemap-local.xml`
- Keeps an output copy under `output/pages/`

## Run it

```powershell
python scripts/generate_pages.py
```

## Current lane

This generator is intentionally focused on the current All-Pro local-growth cluster:

- `deck-repair`
- `fence-contractor`
- `landscaping`
- `pressure-washing`
- `yard-cleanup`
- `handyman`

Across:

- Belleville
- O'Fallon
- Edwardsville
- Collinsville
- Swansea

## Supporting backend files

- SQL schema: `sql/schema.sql`
- Search Console helper: `scripts/search_console_inspect.py`
- OpenAI brief helper: `scripts/openai_brief_example.py`
- Webhook prototype: `server/webhook_app.py`
- SEO quality gate: `scripts/seo_audit.py`
- Thumbtack/partner routing plan: `THUMBTACK-DEMAND-ROUTER.md`

## Quality Gate

Run the audit before publishing major changes:

```powershell
python scripts/seo_audit.py --json outputs/seo-audit.json --markdown outputs/seo-audit.md --fail-under 85
```

The audit checks:

- title, meta description, H1, canonical, and JSON-LD basics
- invalid JSON-LD
- sitemap coverage
- broken internal links
- thin internal linking and orphaned pages
- image alt coverage

The point is not just to score pages. The point is to prevent the engine from publishing pages that Google and homeowners cannot understand.

## Partner Routing Lane

Thumbtack-style partner routing can be useful after the site captures demand, especially for services All-Pro does not want or cannot schedule quickly.

The rule:

- All-Pro pages capture first-party demand.
- All-Pro gets first shot when the lead fits.
- Partner routing is a disclosed fallback, not a fake directory or hidden lead sale.
- Partner widgets/API routes stay `noindex` until credentials, disclosure, and tracking are finished.

## Rules

- Do not publish service-city pages without real local value.
- Add or update `data/proofs.json` before expanding to new lanes.
- Keep the same business name, phone, and site URL across listings and pages.
- Use this system to improve first-party demand, not to create fake local entities.
- Do not route or sell leads without clear user consent and source tracking.
