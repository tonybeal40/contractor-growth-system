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


def project_image(page: dict[str, Any]) -> str:
    text = f"{page['service']} {page['problem']}".lower()
    if any(word in text for word in ("bathroom", "shower", "drywall")):
        return "images/shower-remodel-belleville-il.webp"
    if any(word in text for word in ("landscape", "yard", "drainage", "pressure washing")):
        return "images/projects/metro-east-landscape-curb-appeal-wide.avif"
    if any(word in text for word in ("deck", "fence", "concrete", "handyman")):
        return "images/deck-build-metro-east-il.webp"
    return "all-pro-og-image.webp"


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
    title = f"{page['headline']} | All-Pro"
    desc = page["description"]
    related_links = "\n".join(
        f'              <li><a href="{escape(item["slug"])}.html">{escape(item["headline"])}</a></li>'
        for item in related
        if item["slug"] != page["slug"]
    )
    schema = jsonld(page)
    hero_image = project_image(page)
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
  <script defer src="analytics-loader.js?v=20260714a"></script>
  <script defer src="lead-tracking.js?v=20260721b"></script>
  <script defer src="formsubmit-lead-tracking.js?v=20260722a"></script>
  <script type="application/ld+json">
{schema}
  </script>
  <style>
    :root {{ --charcoal:#1f2933; --cream:#f7f3ea; --green:#2f5d50; --copper:#c96a26; --line:#d8ddd9; }}
    * {{ box-sizing:border-box; }}
    body {{ margin:0; font-family:Manrope, Segoe UI, Arial, sans-serif; background:var(--cream); color:var(--charcoal); line-height:1.65; }}
    .pi-wrap {{ width:min(1120px,calc(100% - 40px)); margin:0 auto; }}
    .pi-site-header {{ min-height:76px; background:#fff; border-bottom:1px solid var(--line); display:flex; align-items:center; position:relative; z-index:5; }}
    .pi-nav {{ display:flex; align-items:center; justify-content:space-between; gap:24px; }}
    .pi-brand {{ display:inline-flex; align-items:center; gap:10px; color:var(--green); text-decoration:none; font-weight:900; line-height:1.15; }}
    .pi-brand img {{ width:52px; height:46px; object-fit:contain; }}
    .pi-brand small {{ display:block; color:#5f6b66; font-size:.72rem; font-weight:700; }}
    .pi-nav-links {{ display:flex; align-items:center; gap:22px; }}
    .pi-nav-links a {{ color:var(--charcoal); text-decoration:none; font-size:.9rem; font-weight:800; }}
    .pi-nav-links .pi-nav-cta {{ padding:10px 14px; background:var(--copper); color:#fff; border-radius:6px; }}
    .pi-hero {{ min-height:500px; position:relative; display:flex; align-items:flex-end; overflow:hidden; background:var(--charcoal); }}
    .pi-hero-media {{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }}
    .pi-hero-shade {{ position:absolute; inset:0; background:rgba(18,30,26,.74); }}
    .pi-hero-content {{ position:relative; z-index:1; padding:68px 0 58px; color:#fff; }}
    .pi-eyebrow {{ color:#f1b27f; font-weight:900; font-size:.78rem; text-transform:uppercase; letter-spacing:0; }}
    h1 {{ max-width:820px; font-family:Georgia, 'Times New Roman', serif; font-size:3.25rem; line-height:1.04; margin:.5rem 0 1rem; letter-spacing:0; }}
    .pi-sub {{ color:#f4f5f2; max-width:760px; font-size:1.05rem; }}
    .pi-actions {{ display:flex; flex-wrap:wrap; gap:12px; margin-top:22px; }}
    .pi-btn {{ min-height:48px; display:inline-flex; align-items:center; justify-content:center; padding:12px 18px; border-radius:6px; font-weight:900; text-decoration:none; }}
    .pi-primary {{ background:var(--copper); color:#fff; }}
    .pi-secondary {{ border:1px solid #fff; color:#fff; background:rgba(31,41,51,.55); }}
    .pi-main {{ padding:42px 0 74px; }}
    .pi-grid {{ display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:24px; align-items:start; }}
    .pi-stack {{ display:grid; gap:20px; }}
    .pi-card {{ background:#fff; border:1px solid var(--line); border-radius:8px; padding:24px; box-shadow:0 12px 30px rgba(31,41,51,.08); }}
    .pi-card h2 {{ margin:0 0 10px; font-family:Georgia, 'Times New Roman', serif; color:var(--green); font-size:1.45rem; letter-spacing:0; }}
    .pi-card p, .pi-card li {{ color:#45524c; }}
    .pi-card ul {{ padding-left:20px; }}
    .pi-photo {{ width:100%; aspect-ratio:16/9; object-fit:cover; border-radius:6px; border:1px solid var(--line); margin:12px 0; }}
    details {{ padding:13px 0; border-top:1px solid var(--line); }}
    summary {{ cursor:pointer; font-weight:900; }}
    .pi-form input, .pi-form select, .pi-form textarea {{ width:100%; margin:6px 0 12px; padding:12px; border-radius:6px; border:1px solid #aeb8b3; background:#fff; color:var(--charcoal); font:inherit; }}
    .pi-form textarea {{ min-height:110px; }}
    .pi-form label {{ font-size:.86rem; color:#33423c; font-weight:800; }}
    .pi-form .pi-check {{ display:flex; align-items:flex-start; gap:9px; margin:10px 0; line-height:1.45; }}
    .pi-form .pi-check input {{ width:auto; flex:0 0 auto; margin:4px 0 0; }}
    .pi-form button {{ width:100%; min-height:48px; padding:13px; border:0; border-radius:6px; background:var(--copper); color:#fff; font-weight:900; font:inherit; }}
    .pi-note {{ font-size:.9rem; color:#5f6b66; }}
    .pi-links a {{ color:var(--green); text-decoration:underline; text-decoration-color:var(--copper); text-underline-offset:3px; }}
    .pi-form-card {{ position:sticky; top:18px; border-top:5px solid var(--copper); }}
    .pi-footer {{ background:var(--charcoal); color:#dce3df; padding:34px 0 88px; }}
    .pi-footer-inner {{ display:flex; justify-content:space-between; gap:24px; flex-wrap:wrap; }}
    .pi-footer a {{ color:#fff; }}
    .pi-mobile-bar {{ display:none; }}
    @media (max-width:820px) {{
      .pi-wrap {{ width:min(100% - 28px,1120px); }}
      .pi-site-header {{ min-height:66px; }}
      .pi-nav-links a:not(.pi-nav-cta) {{ display:none; }}
      .pi-brand span {{ font-size:.92rem; }}
      .pi-brand small {{ font-size:.65rem; }}
      .pi-hero {{ min-height:430px; }}
      .pi-hero-content {{ padding:52px 0 44px; }}
      h1 {{ font-size:2.35rem; overflow-wrap:anywhere; }}
      .pi-actions {{ display:grid; grid-template-columns:1fr; }}
      .pi-grid {{ grid-template-columns:1fr; }}
      .pi-form-card {{ position:static; }}
      .pi-mobile-bar {{ position:fixed; z-index:20; left:0; right:0; bottom:0; height:62px; display:grid; grid-template-columns:1fr 1fr; background:#fff; border-top:1px solid var(--line); }}
      .pi-mobile-bar a {{ display:flex; align-items:center; justify-content:center; color:var(--green); text-decoration:none; font-weight:900; }}
      .pi-mobile-bar a:last-child {{ background:var(--copper); color:#fff; }}
    }}
  </style>
</head>
<body>
  <header class="pi-site-header">
    <div class="pi-wrap pi-nav">
      <a class="pi-brand" href="index.html"><img src="images/branding/logo-web-sm.png" alt="All-Pro Metro East Construction logo" width="52" height="46"><span>All-Pro Construction<small>Metro East, Illinois</small></span></a>
      <nav class="pi-nav-links" aria-label="Primary navigation"><a href="index.html#services">Services</a><a href="index.html#areas">Areas</a><a href="reviews.html">Reviews</a><a class="pi-nav-cta" href="#estimate">Free Estimate</a></nav>
    </div>
  </header>
  <header class="pi-hero">
    <img class="pi-hero-media" src="{escape(hero_image)}" alt="All-Pro project work related to {escape(page['service'].lower())} in Metro East Illinois" width="1200" height="675" fetchpriority="high">
    <div class="pi-hero-shade" aria-hidden="true"></div>
    <div class="pi-wrap pi-hero-content">
      <div class="pi-eyebrow">Metro East problem solver | {escape(page["city"])}, {escape(page["state"])}</div>
      <h1>{escape(page["headline"])}</h1>
      <p class="pi-sub">{escape(page["description"])} If you are not sure whether this is a repair, cleanup, or larger project, send the details and the All-Pro team will help with the next step.</p>
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
          <img class="pi-photo" src="{escape(hero_image)}" alt="Relevant All-Pro project work for {escape(page['service'].lower())} in Metro East Illinois" loading="lazy" width="800" height="450">
          <ul>
{list_items(page["symptoms"])}
          </ul>
        </section>
        <section class="pi-card">
          <h2>How All-Pro handles it</h2>
          <ul>
{list_items(page["what_we_do"])}
          </ul>
          <p class="pi-note">Owner-led estimates, practical repair options, and clear written scope for Metro East homeowners.</p>
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
      <aside class="pi-card pi-form-card" id="estimate">
        <h2>Send the details</h2>
        <p class="pi-note">Tell us what is going on. Photos can be texted after the form if needed.</p>
        <form class="pi-form" action="{FORM_ACTION}" method="post" data-form="Problem Intent Page">
          <input type="hidden" name="_subject" value="NEW ALL-PRO PROJECT REQUEST | {escape(page['service'])} | {escape(page['city'])}">
          <input type="hidden" name="_cc" value="tonybeal40@gmail.com">
          <input type="hidden" name="_captcha" value="false">
          <input type="hidden" name="_template" value="table">
          <input type="hidden" name="_next" value="{escape(SITE)}/thank-you.html?src=form&amp;form={escape(page['slug'])}">
          <input type="text" name="_honey" tabindex="-1" autocomplete="off" style="display:none">
          <input type="hidden" name="problem_page" value="{escape(page["slug"])}">
          <input type="hidden" name="service" value="{escape(page["service"])}">
          <label for="name">Name</label>
          <input id="name" name="name" autocomplete="name" required>
          <label for="phone">Phone</label>
          <input id="phone" name="phone" autocomplete="tel" required>
          <label for="email">Email (optional)</label>
          <input id="email" name="email" type="email" autocomplete="email">
          <label for="city">City</label>
          <input id="city" name="city" value="{escape(page["city"])}" required>
          <label for="timeline">Timeline</label>
          <select id="timeline" name="timeline">
            <option value="">Select one</option>
            <option>ASAP</option>
            <option>This week</option>
            <option>This month</option>
            <option>Just planning</option>
          </select>
          <label for="details">What happened?</label>
          <textarea id="details" name="details" placeholder="{escape(page["problem"])}" required></textarea>
          <label class="pi-check"><input type="checkbox" name="estimate_contact_consent" value="yes" required> <span>I agree to be contacted by phone, text, or email about my estimate request.</span></label>
          <label class="pi-check"><input type="checkbox" name="email_marketing_opt_in" value="yes"> <span>Email me occasional project tips and local offers. I can unsubscribe anytime.</span></label>
          <button type="submit">Send request</button>
        </form>
      </aside>
    </div>
  </main>
  <footer class="pi-footer"><div class="pi-wrap pi-footer-inner"><div><strong>All-Pro Construction &amp; Landscape</strong><br>Serving Metro East since 2002</div><div><a href="tel:{PHONE.replace('-', '')}">{PHONE}</a><br><a href="privacy.html">Privacy</a> &middot; <a href="terms.html">Terms</a></div></div></footer>
  <nav class="pi-mobile-bar" aria-label="Quick actions"><a href="tel:{PHONE.replace('-', '')}">Call Bill</a><a href="#estimate">Free Estimate</a></nav>
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
  <script defer src="analytics-loader.js?v=20260714a"></script>
  <script defer src="lead-tracking.js?v=20260721b"></script>
  <script defer src="formsubmit-lead-tracking.js?v=20260722a"></script>
  <script type="application/ld+json">
{schema}
  </script>
  <style>
    :root {{ --charcoal:#1f2933; --cream:#f7f3ea; --green:#2f5d50; --copper:#c96a26; --line:#d8ddd9; }}
    * {{ box-sizing:border-box; }}
    body {{ margin:0; font-family:Manrope, Segoe UI, Arial, sans-serif; background:var(--cream); color:var(--charcoal); line-height:1.65; }}
    .pi-wrap {{ width:min(1120px,calc(100% - 40px)); margin:0 auto; }}
    .pi-site-header {{ min-height:76px; background:#fff; border-bottom:1px solid var(--line); display:flex; align-items:center; }}
    .pi-nav {{ display:flex; align-items:center; justify-content:space-between; gap:24px; }}
    .pi-brand {{ display:inline-flex; align-items:center; gap:10px; color:var(--green); text-decoration:none; font-weight:900; line-height:1.15; }}
    .pi-brand img {{ width:52px; height:46px; object-fit:contain; }}
    .pi-brand small {{ display:block; color:#5f6b66; font-size:.72rem; }}
    .pi-nav-links {{ display:flex; align-items:center; gap:22px; }}
    .pi-nav-links a {{ color:var(--charcoal); text-decoration:none; font-size:.9rem; font-weight:800; }}
    .pi-nav-links .pi-nav-cta {{ padding:10px 14px; background:var(--copper); color:#fff; border-radius:6px; }}
    .pi-hero {{ min-height:410px; position:relative; display:flex; align-items:flex-end; overflow:hidden; background:var(--charcoal); }}
    .pi-hero img {{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }}
    .pi-shade {{ position:absolute; inset:0; background:rgba(18,30,26,.76); }}
    .pi-hero-copy {{ position:relative; z-index:1; padding:64px 0 54px; color:#fff; }}
    h1 {{ max-width:780px; font:700 3.25rem/1.05 Georgia, 'Times New Roman', serif; letter-spacing:0; margin:0 0 16px; }}
    .pi-sub {{ color:#f2f5f3; max-width:760px; font-size:1.05rem; }}
    .pi-grid {{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; padding:38px 0 72px; }}
    .pi-card {{ background:#fff; border:1px solid var(--line); border-radius:8px; padding:22px; box-shadow:0 12px 30px rgba(31,41,51,.07); }}
    .pi-card h2 {{ margin:0 0 8px; font:700 1.3rem/1.25 Georgia, 'Times New Roman', serif; letter-spacing:0; }}
    .pi-card p {{ color:#52605a; }}
    .pi-card a {{ color:var(--green); text-decoration:underline; text-decoration-color:var(--copper); text-underline-offset:4px; }}
    .pi-footer {{ background:var(--charcoal); color:#dce3df; padding:34px 0; }}
    .pi-footer-inner {{ display:flex; justify-content:space-between; gap:24px; flex-wrap:wrap; }}
    .pi-footer a {{ color:#fff; }}
    @media (max-width:780px) {{
      .pi-wrap {{ width:min(100% - 28px,1120px); }}
      .pi-site-header {{ min-height:66px; }}
      .pi-nav-links a:not(.pi-nav-cta) {{ display:none; }}
      .pi-brand span {{ font-size:.92rem; }}
      .pi-brand small {{ font-size:.65rem; }}
      .pi-hero {{ min-height:360px; }}
      .pi-hero-copy {{ padding:48px 0 42px; }}
      h1 {{ font-size:2.35rem; overflow-wrap:anywhere; }}
      .pi-grid {{ grid-template-columns:1fr; }}
    }}
  </style>
</head>
<body>
  <header class="pi-site-header"><div class="pi-wrap pi-nav"><a class="pi-brand" href="index.html"><img src="images/branding/logo-web-sm.png" alt="All-Pro Metro East Construction logo" width="52" height="46"><span>All-Pro Construction<small>Metro East, Illinois</small></span></a><nav class="pi-nav-links" aria-label="Primary navigation"><a href="index.html#services">Services</a><a href="index.html#areas">Areas</a><a href="reviews.html">Reviews</a><a class="pi-nav-cta" href="get-quote.html">Free Estimate</a></nav></div></header>
  <header class="pi-hero">
    <img src="images/projects/metro-east-landscape-curb-appeal-wide.avif" alt="Completed Metro East landscape project by All-Pro Construction" width="1400" height="780" fetchpriority="high">
    <div class="pi-shade" aria-hidden="true"></div>
    <div class="pi-wrap pi-hero-copy">
      <h1>Metro East Homeowner Problem Solver</h1>
      <p class="pi-sub">Start with the problem you can see: a soft deck board, leaning fence, muddy yard, damaged drywall, or repair list. Each guide explains what may be involved and gives you a direct path to a local estimate.</p>
    </div>
  </header>
  <main class="pi-wrap pi-grid">
{cards}
  </main>
  <footer class="pi-footer"><div class="pi-wrap pi-footer-inner"><div><strong>All-Pro Construction &amp; Landscape</strong><br>Serving Metro East since 2002</div><div><a href="tel:{PHONE.replace('-', '')}">{PHONE}</a><br><a href="privacy.html">Privacy</a> &middot; <a href="terms.html">Terms</a></div></div></footer>
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
