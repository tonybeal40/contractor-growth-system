# OpenClaw Demo Template — Contractor Growth System

**How to launch a new client demo in 2–3 hours.**

---

## Quick Start

1. Copy the `client/` folder → rename to the client's business slug (e.g., `smithlawn/`)
2. Open `CONFIG.js` and fill in all client variables
3. Run `build.py` — it injects all variables into every page automatically
4. Drop real photos into `client/images/` (pull from their website or Google Maps)
5. Update city pages — copy from the `city-page-template.html` and fill in city data
6. Push to GitHub Pages → update CNAME → demo is live

---

## CONFIG.js — Fill These In

```js
const CLIENT = {
  // Business
  name: "CLIENT BUSINESS NAME",           // e.g., "Lawn-Mex Inc."
  name_short: "CLIENT SHORT NAME",         // e.g., "Lawn-Mex"
  tagline: "CLIENT TAGLINE",               // e.g., "Metro East's Most Trusted Lawn Care"
  years_exp: "25+",                        // Years in business
  founded: "1999",                         // Year founded

  // Contact
  phone: "(000) 000-0000",
  phone_raw: "0000000000",
  email: "client@email.com",
  address: "City, State ZIP",
  city: "Home City",
  state: "IL",
  county: "County Name",
  zip: "00000",

  // Brand Colors (hex)
  color_primary: "#2e7d32",               // Main brand color
  color_primary_dark: "#1b5e20",
  color_primary_light: "#4caf50",
  color_accent: "#f9a825",                // Gold/accent
  color_bg: "#0b1a0f",                    // Dark background

  // Website
  current_site: "https://clientsite.com", // Their existing site
  demo_domain: "allprometroeastconstruction.com", // Where demo is hosted
  demo_slug: "client-slug",               // Folder name e.g. "lawnmex"

  // Services (comma separated, shown on homepage)
  services: [
    "Lawn Mowing & Edging",
    "Mulch & Landscape Beds",
    "Seasonal Cleanup",
    "Shrub Trimming",
    "Snow Removal",
    "Fertilization & Weed Control"
  ],

  // SEO Cities (for city pages — 5-10 recommended)
  cities: [
    { name: "Home City", county: "County", zip: "00000", clients: "500+" },
    { name: "City Two",  county: "County", zip: "00000", clients: "200+" },
  ],

  // Revenue estimates for before/after section
  missed_revenue: "$15,000–$40,000",
  projected_revenue: "$18,000–$45,000",

  // Owner info (for team section)
  owner_name: "Owner Name",
  owner_title: "Owner & Operator",
};
```

---

## File Structure

```
demo-template/
├── README.md                   ← This file
├── CONFIG.js                   ← Fill this in for each client
├── build.py                    ← Run this to inject config into all pages
│
├── outreach-template.html      ← Main pitch page (Jeff's overview equivalent)
├── pricing-template.html       ← Pricing page
│
└── client/                     ← All inner pages
    ├── index.html              ← Homepage
    ├── quote.html              ← Quote form
    ├── invoice.html            ← Invoice + payment demo
    ├── email-outreach.html     ← Email kit page
    ├── market-report.html      ← Market report
    ├── client.css              ← Shared stylesheet (swap colors in :root)
    ├── images/                 ← Drop client photos here
    │   └── placeholder.jpg
    └── city-pages/
        └── city-page-template.html  ← Copy + fill for each city
```

---

## City Page Checklist (per city)

- [ ] Copy `city-page-template.html` → `city-name-state.html`
- [ ] Update `<title>`, `<meta description>`, `<h1>`
- [ ] Write 2 unique about paragraphs mentioning local landmarks/neighborhoods
- [ ] Set unique client count stat
- [ ] Update canonical URL

---

## Checklist — New Client Demo

- [ ] Fill in CONFIG.js
- [ ] Run `python build.py`
- [ ] Drop 6–10 real photos into `client/images/`
- [ ] Write unique city pages (use template)
- [ ] Update before/after revenue estimates
- [ ] Update email campaign examples with client's name + services
- [ ] Test all nav links and buttons
- [ ] Verify tour works (take it yourself)
- [ ] Add noindex to all pages
- [ ] Push to GitHub Pages
- [ ] Update CNAME if needed
- [ ] Send to client

---

## Time Estimates

| Task | Time |
|---|---|
| Fill CONFIG.js + run build.py | 15 min |
| Pull/optimize photos | 20 min |
| Write 5 city pages | 45 min |
| Review + QA | 20 min |
| Push live | 10 min |
| **Total** | **~2 hours** |

---

## Built by OpenClaw
Each demo is a live, hosted, guided sales presentation.
Not a PDF. Not a Figma mock. A real working website.
