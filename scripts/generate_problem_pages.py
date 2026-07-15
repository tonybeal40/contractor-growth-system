#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import date
from html import escape
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SITE = "https://allprometroeastconstruction.com"
PHONE = "618-581-0676"
PHONE_E164 = "+16185810676"
BUSINESS = "All-Pro Construction & Landscape"
FORM_ACTION = "https://formsubmit.co/williamosessionallpro@gmail.com"
TODAY = date.today().isoformat()


def load_pages() -> list[dict[str, Any]]:
    return json.loads((DATA / "problem_pages.json").read_text(encoding="utf-8"))


def list_items(items: list[str]) -> str:
    return "\n".join(f"              <li>{escape(item)}</li>" for item in items)


def faq_html(items: list[list[str]]) -> str:
    return "\n".join(
        f"""          <details>
            <summary>{escape(q)}</summary>
            <p>{escape(a)}</p>
          </details>"""
        for q, a in items
    )


def jsonld(page: dict[str, Any]) -> str:
    url = f"{SITE}/{page['slug']}.html"
    graph = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
                "@id": f"{SITE}/#business",
                "name": BUSINESS,
                "url": SITE,
                "telephone": PHONE_E164,
                "areaServed": {"@type": "City", "name": f"{page['city']}, {page['state']}"},
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": "1115 Priscilla Ct",
                    "addressLocality": "New Athens",
                    "addressRegion": "IL",
                    "postalCode": "62264",
                    "addressCountry": "US",
                },
                "image": f"{SITE}/all-pro-og-image.png",
            },
            {
                "@type": "Service",
                "@id": f"{url}#service",
                "name": f"{page['service']} for {page['problem']} in {page['city']}, {page['state']}",
                "serviceType": page["service"],
                "provider": {"@id": f"{SITE}/#business"},
                "areaServed": {"@type": "City", "name": f"{page['city']}, {page['state']}"},
                "description": page["description"],
                "url": url,
            },
            {
                "@type": "FAQPage",
                "mainEntity": [
                    {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
                    for q, a in page["faq"]
                ],
            },
            {
                "@type": "BreadcrumbList",
                "@id": f"{url}#breadcrumbs",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Homeowner Problem Solver",
                        "item": f"{SITE}/metro-east-homeowner-problem-solver.html",
                    },
                    {"@type": "ListItem", "position": 3, "name": page["headline"], "item": url},
                ],
            },
        ],
    }
    return json.dumps(graph, indent=2)


def render_problem_page(page: dict[str, Any], related: list[dict[str, Any]]) -> str:
    url = f"{SITE}/{page['slug']}.html"
    title = f"{page['headline']} | {BUSINESS}"
    desc = page["description"]
    related_links = "\n".join(
        f'              <li><a href="{escape(item["slug"])}.html">{escape(item["headline"])}</a></li>'
        for item in related
        if item["slug"] != page["slug"]
    )
    schema = jsonld(page)
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(title)}</title>
  <meta name="description" content="{escape(desc)}">
  <link rel="canonical" href="{escape(url)}">
  <meta property="og:title" content="{escape(title)}">
  <meta property="og:description" content="{escape(desc)}">
  <meta property="og:url" content="{escape(url)}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="{SITE}/all-pro-og-image.png">
  <link rel="stylesheet" href="styles.css">
  <script defer src="lead-tracking.js?v=20260715d"></script>
  <script defer src="formsubmit-lead-tracking.js?v=20260715e"></script>
  <script type="application/ld+json">
{schema}
  </script>
  <style>
    body {{ margin:0; font-family: Manrope, Segoe UI, Arial, sans-serif; background:#0a0f18; color:#f7fbff; line-height:1.65; }}
    .pi-wrap {{ max-width:1120px; margin:0 auto; padding:0 24px; }}
    .pi-hero {{ padding:64px 0 32px; background:linear-gradient(145deg,#08111d,#142033 62%,#0a0f18); border-bottom:1px solid rgba(255,255,255,.08); }}
    .pi-eyebrow {{ color:#ff8da0; font-weight:900; font-size:.78rem; text-transform:uppercase; letter-spacing:.08em; }}
    h1 {{ font-size:clamp(2rem,4vw,3.35rem); line-height:1.06; margin:.45rem 0 .8rem; }}
    .pi-sub {{ color:#b8c8dc; max-width:760px; font-size:1.05rem; }}
    .pi-actions {{ display:flex; flex-wrap:wrap; gap:12px; margin-top:22px; }}
    .pi-btn {{ display:inline-flex; align-items:center; justify-content:center; padding:13px 18px; border-radius:8px; font-weight:900; text-decoration:none; }}
    .pi-primary {{ background:#c8102e; color:white; }}
    .pi-secondary {{ border:1px solid rgba(255,255,255,.16); color:white; background:rgba(255,255,255,.04); }}
    .pi-main {{ padding:34px 0 68px; }}
    .pi-grid {{ display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:24px; align-items:start; }}
    .pi-stack {{ display:grid; gap:20px; }}
    .pi-card {{ background:#121b28; border:1px solid rgba(255,255,255,.09); border-radius:8px; padding:22px; box-shadow:0 18px 44px rgba(0,0,0,.22); }}
    .pi-card h2 {{ margin:0 0 10px; font-size:1.25rem; }}
    .pi-card p, .pi-card li {{ color:#c3d1e4; }}
    .pi-card ul {{ padding-left:20px; }}
    .pi-photo {{ width:100%; aspect-ratio:16/9; object-fit:cover; border-radius:8px; border:1px solid rgba(255,255,255,.1); margin:12px 0; }}
    details {{ padding:13px 0; border-top:1px solid rgba(255,255,255,.08); }}
    summary {{ cursor:pointer; font-weight:900; }}
    .pi-form input, .pi-form select, .pi-form textarea {{ width:100%; margin:6px 0 12px; padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,.14); background:#0d1420; color:white; }}
    .pi-form textarea {{ min-height:110px; }}
    .pi-form label {{ font-size:.86rem; color:#dce8f7; font-weight:800; }}
    .pi-form button {{ width:100%; padding:14px; border:0; border-radius:8px; background:#c8102e; color:white; font-weight:900; }}
    .pi-note {{ font-size:.9rem; color:#b8c8dc; }}
    .pi-links a {{ color:#ffffff; text-decoration:underline; text-decoration-color:#c8102e; text-underline-offset:3px; }}
    @media (max-width:820px) {{ .pi-grid {{ grid-template-columns:1fr; }} .pi-hero {{ padding-top:44px; }} }}
  </style>
</head>
<body>
  <header class="pi-hero">
    <div class="pi-wrap">
      <div class="pi-eyebrow">Metro East problem solver | {escape(page["city"])}, {escape(page["state"])}</div>
      <h1>{escape(page["headline"])}</h1>
      <p class="pi-sub">{escape(page["description"])} If you are not sure whether this is a repair, cleanup, or bigger project, send the details and Bill will route it.</p>
      <div class="pi-actions">
        <a class="pi-btn pi-primary" href="#estimate">Request a free estimate</a>
        <a class="pi-btn pi-secondary" href="tel:{PHONE.replace('-', '')}">Call {PHONE}</a>
      </div>
    </div>
  </header>
  <main class="pi-main">
    <div class="pi-wrap pi-grid">
      <div class="pi-stack">
        <section class="pi-card">
          <h2>Signs this is the problem</h2>
          <img class="pi-photo" src="all-pro-og-image.png" alt="All-Pro Construction project work in Metro East Illinois">
          <ul>
{list_items(page["symptoms"])}
          </ul>
        </section>
        <section class="pi-card">
          <h2>How All-Pro handles it</h2>
          <ul>
{list_items(page["what_we_do"])}
          </ul>
          <p class="pi-note">Owner-led estimates, practical repair paths, and local Belleville/O'Fallon focus. No fake scarcity and no mystery quote games.</p>
        </section>
        <section class="pi-card">
          <h2>Common questions</h2>
{faq_html(page["faq"])}
        </section>
        <section class="pi-card pi-links">
          <h2>Related homeowner searches</h2>
          <ul>
{related_links}
          </ul>
        </section>
      </div>
      <aside class="pi-card" id="estimate">
        <h2>Send the details</h2>
        <p class="pi-note">Tell us what is going on. Photos can be texted after the form if needed.</p>
        <form class="pi-form" action="{FORM_ACTION}" method="post" data-form="Problem Intent Page">
          <input type="hidden" name="_cc" value="tonybeal40@gmail.com">
          <input type="hidden" name="_captcha" value="false">
          <input type="hidden" name="_template" value="table">
          <input type="hidden" name="problem_page" value="{escape(page["slug"])}">
          <input type="hidden" name="service" value="{escape(page["service"])}">
          <label for="name">Name</label>
          <input id="name" name="name" autocomplete="name" required>
          <label for="phone">Phone</label>
          <input id="phone" name="phone" autocomplete="tel" required>
          <label for="email">Email</label>
          <input id="email" name="email" type="email" autocomplete="email">
          <label for="city">City</label>
          <input id="city" name="city" value="{escape(page["city"])}">
          <label for="timeline">Timeline</label>
          <select id="timeline" name="timeline">
            <option value="">Select one</option>
            <option>ASAP</option>
            <option>This week</option>
            <option>This month</option>
            <option>Just planning</option>
          </select>
          <label for="details">What happened?</label>
          <textarea id="details" name="details" placeholder="{escape(page["problem"])}"></textarea>
          <button type="submit">Send request</button>
        </form>
      </aside>
    </div>
  </main>
</body>
</html>
"""


def render_hub(pages: list[dict[str, Any]]) -> str:
    cards = "\n".join(
        f"""        <article class="pi-card">
          <h2><a href="{escape(page["slug"])}.html">{escape(page["headline"])}</a></h2>
          <p>{escape(page["description"])}</p>
        </article>"""
        for page in pages
    )
    graph = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "name": "Metro East Homeowner Problem Solver",
                "url": f"{SITE}/metro-east-homeowner-problem-solver.html",
                "about": "Local construction, repair, landscaping, and handyman problem pages for Belleville and O'Fallon homeowners.",
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
                    {"@type": "ListItem", "position": 2, "name": "Problem Solver", "item": f"{SITE}/metro-east-homeowner-problem-solver.html"},
                ],
            },
        ],
    }
    schema = json.dumps(graph, indent=2)
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Metro East Homeowner Problem Solver | All-Pro Construction & Landscape</title>
  <meta name="description" content="Find help for common Belleville and O'Fallon homeowner problems: deck repair, fence damage, drainage, cleanup, handyman work, pressure washing, and more.">
  <link rel="canonical" href="{SITE}/metro-east-homeowner-problem-solver.html">
  <meta property="og:title" content="Metro East Homeowner Problem Solver">
  <meta property="og:description" content="Problem-focused local service pages for Belleville and O'Fallon homeowners.">
  <meta property="og:url" content="{SITE}/metro-east-homeowner-problem-solver.html">
  <meta property="og:type" content="website">
  <meta property="og:image" content="{SITE}/all-pro-og-image.png">
  <link rel="stylesheet" href="styles.css">
  <script defer src="lead-tracking.js?v=20260715d"></script>
  <script defer src="formsubmit-lead-tracking.js?v=20260715e"></script>
  <script type="application/ld+json">
{schema}
  </script>
  <style>
    body {{ margin:0; font-family:Manrope, Segoe UI, Arial, sans-serif; background:#0a0f18; color:white; line-height:1.65; }}
    .pi-wrap {{ max-width:1120px; margin:0 auto; padding:0 24px; }}
    .pi-hero {{ padding:64px 0 32px; background:linear-gradient(145deg,#08111d,#142033 62%,#0a0f18); }}
    h1 {{ font-size:clamp(2rem,4vw,3.4rem); line-height:1.08; margin:0 0 12px; }}
    .pi-sub {{ color:#b8c8dc; max-width:760px; }}
    .pi-grid {{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; padding:30px 0 70px; }}
    .pi-card {{ background:#121b28; border:1px solid rgba(255,255,255,.09); border-radius:8px; padding:22px; }}
    .pi-card h2 {{ margin:0 0 8px; font-size:1.15rem; }}
    .pi-card p {{ color:#c3d1e4; }}
    .pi-card a {{ color:white; text-decoration:underline; text-decoration-color:#c8102e; text-underline-offset:4px; }}
    @media (max-width:780px) {{ .pi-grid {{ grid-template-columns:1fr; }} }}
  </style>
</head>
<body>
  <header class="pi-hero">
    <div class="pi-wrap">
      <h1>Metro East Homeowner Problem Solver</h1>
      <p class="pi-sub">Pages built around the way homeowners actually search: the broken deck board, the leaning fence, the muddy yard, the cleanup before listing, and the small repair list that needs a real contractor.</p>
    </div>
  </header>
  <main class="pi-wrap pi-grid">
{cards}
  </main>
</body>
</html>
"""


def main() -> None:
    pages = load_pages()
    for page in pages:
        related = [item for item in pages if item["city"] == page["city"]][:4]
        (ROOT / f"{page['slug']}.html").write_text(render_problem_page(page, related), encoding="utf-8")
    (ROOT / "metro-east-homeowner-problem-solver.html").write_text(render_hub(pages), encoding="utf-8")
    print(f"Wrote {len(pages)} problem pages plus hub on {TODAY}")


if __name__ == "__main__":
    main()
