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

## Rules

- Do not publish service-city pages without real local value.
- Add or update `data/proofs.json` before expanding to new lanes.
- Keep the same business name, phone, and site URL across listings and pages.
- Use this system to improve first-party demand, not to create fake local entities.
