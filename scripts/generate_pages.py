#!/usr/bin/env python3
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from html import escape
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUTPUT = ROOT / "output"
OUTPUT_PAGES = OUTPUT / "pages"

SITE = "https://allprometroeastconstruction.com"
PHONE = "618-581-0676"
PHONE_E164 = "+16185810676"
BUSINESS = "All-Pro Construction & Landscape"
FORM_ACTION = "https://formsubmit.co/williamosessionallpro@gmail.com"
TODAY = date.today().isoformat()


@dataclass(frozen=True)
class City:
    slug: str
    city: str
    state: str
    market: str
    county: str
    postal_codes: list[str]
    nearby: list[str]
    local_notes: str
    intro_hook: str
    neighborhoods: list[str]


@dataclass(frozen=True)
class Service:
    slug: str
    service: str
    service_type: str
    description: str
    summary: str
    cta_label: str
    bullets: list[str]
    faq: list[dict[str, str]]


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def city_code(city: City) -> str:
    return f"{city.slug}-{city.state.lower()}"


def filename(service: Service, city: City) -> str:
    return f"{service.slug}-{city.slug}-{city.state.lower()}.html"


def page_url(service: Service, city: City) -> str:
    return f"{SITE}/{filename(service, city)}"


def render_list(items: list[str]) -> str:
    return "\n".join(f"            <li>{escape(item)}</li>" for item in items)


def render_links(items: list[tuple[str, str]]) -> str:
    return "\n".join(
        f'            <li><a href="{escape(href)}">{escape(label)}</a></li>' for href, label in items
    )


def render_faq_html(service: Service) -> str:
    return "\n".join(
        f"""            <details>
              <summary>{escape(item["q"])}</summary>
              <p>{escape(item["a"])}</p>
            </details>"""
        for item in service.faq
    )


def render_faq_schema(service: Service) -> list[dict[str, Any]]:
    return [
        {
            "@type": "Question",
            "name": item["q"],
            "acceptedAnswer": {"@type": "Answer", "text": item["a"]},
        }
        for item in service.faq
    ]


def build_proof(service: Service, city: City, proofs: dict[str, Any]) -> dict[str, Any]:
    service_proof = proofs["service_proofs"].get(service.slug, {})
    city_proof = proofs["city_proofs"].get(city.slug, {})
    combo_proof = proofs.get("combo_overrides", {}).get(f"{service.slug}::{city.slug}", {})

    merged = {
        "review_excerpt": service_proof.get("review_excerpt", ""),
        "review_author": service_proof.get("review_author", "Verified local customer"),
        "image_urls": list(service_proof.get("image_urls", [])),
        "proof_points": list(service_proof.get("proof_points", [])),
        "local_notes": [city.local_notes, city_proof.get("extra_note", ""), combo_proof.get("extra_note", "")],
        "intro_hook": combo_proof.get("intro_hook") or city_proof.get("intro_hook") or city.intro_hook,
        "neighborhoods": city.neighborhoods,
    }
    merged["local_notes"] = [item for item in merged["local_notes"] if item]
    return merged


def build_jsonld(service: Service, city: City, proof: dict[str, Any], url: str) -> str:
    business_graph: dict[str, Any] = {
        "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
        "@id": f"{SITE}/#business",
        "name": BUSINESS,
        "alternateName": "All-Pro Metro East Construction",
        "url": SITE,
        "telephone": PHONE_E164,
        "areaServed": {
            "@type": "City",
            "name": f"{city.city}, {city.state}",
        },
        "address": {
            "@type": "PostalAddress",
            "addressLocality": city.city,
            "addressRegion": city.state,
            "addressCountry": "US",
        },
        "image": proof["image_urls"][:3],
    }

    if proof["review_excerpt"]:
        business_graph["review"] = {
            "@type": "Review",
            "reviewBody": proof["review_excerpt"],
            "author": {"@type": "Person", "name": proof["review_author"]},
        }

    graph = {
        "@context": "https://schema.org",
        "@graph": [
            business_graph,
            {
                "@type": "Service",
                "@id": f"{url}#service",
                "name": f"{service.service} in {city.city}, {city.state}",
                "serviceType": service.service_type,
                "provider": {"@id": f"{SITE}/#business"},
                "areaServed": {
                    "@type": "City",
                    "name": city.city,
                    "addressRegion": city.state,
                },
                "description": f"{service.service} in {city.city}, {city.state}, including {service.description}.",
                "url": url,
            },
            {
                "@type": "FAQPage",
                "mainEntity": render_faq_schema(service),
            },
            {
                "@type": "BreadcrumbList",
                "@id": f"{url}#breadcrumbs",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": service.service,
                        "item": url,
                    },
                    {
                        "@type": "ListItem",
                        "position": 3,
                        "name": f"{city.city}, {city.state}",
                        "item": url,
                    },
                ],
            },
        ],
    }
    return json.dumps(graph, ensure_ascii=False, indent=2)


def render_page(service: Service, city: City, proof: dict[str, Any]) -> str:
    url = page_url(service, city)
    page_name = filename(service, city)
    title = f"{service.service} in {city.city}, {city.state} | {BUSINESS}"
    description = (
        f"{BUSINESS} provides {service.service.lower()} services in {city.city}, {city.state}. "
        f"Request a free estimate for {service.service_type.lower()} work in {city.county}."
    )
    proof_links = [
        ("jobs-completed-metro-east.html", "Completed projects across Metro East"),
        (f"{city.slug}-il.html", f"{city.city} service area page"),
        ("reviews.html", "Read customer reviews"),
        ("metro-east-home-service-guide.html", "Use the Metro East Home Service Guide"),
        ("metro-east-contractor-match.html", "Start in the project match desk"),
        ("contact.html", "Request a quote through the contact form"),
    ]

    neighborhoods = ", ".join(proof["neighborhoods"])
    nearby = ", ".join(city.nearby)
    jsonld = build_jsonld(service, city, proof, url)

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(title)}</title>
  <meta name="description" content="{escape(description)}">
  <link rel="canonical" href="{escape(url)}">
  <meta property="og:title" content="{escape(title)}">
  <meta property="og:description" content="{escape(description)}">
  <meta property="og:url" content="{escape(url)}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="{escape(proof["image_urls"][0])}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <script defer src="lead-tracking.js?v=20260626d"></script>
  <script defer src="formsubmit-lead-tracking.js?v=20260629b"></script>
  <script type="application/ld+json">
{jsonld}
  </script>
  <style>
    body {{
      margin: 0;
      font-family: 'Manrope', sans-serif;
      background: #091019;
      color: #edf4ff;
      line-height: 1.65;
    }}
    .ld-shell {{
      max-width: 1160px;
      margin: 0 auto;
      padding: 0 24px;
    }}
    .ld-hero {{
      padding: 72px 0 36px;
      background:
        radial-gradient(circle at top right, rgba(200, 16, 46, .18), transparent 34%),
        linear-gradient(165deg, #091019 0%, #101827 55%, #091019 100%);
      border-bottom: 1px solid rgba(255,255,255,.08);
    }}
    .ld-eyebrow {{
      display: inline-block;
      margin-bottom: 14px;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(200,16,46,.12);
      border: 1px solid rgba(200,16,46,.3);
      color: #ff9ead;
      font-size: .76rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .08em;
    }}
    .ld-hero-grid {{
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(280px, .9fr);
      gap: 28px;
      align-items: start;
    }}
    .ld-hero h1 {{
      margin: 0 0 12px;
      font-size: clamp(2rem, 4vw, 3.35rem);
      line-height: 1.05;
      font-weight: 900;
    }}
    .ld-sub {{
      max-width: 720px;
      color: #aabbd3;
      font-size: 1rem;
      margin-bottom: 20px;
    }}
    .ld-actions {{
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 18px;
    }}
    .ld-btn {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 14px 18px;
      border-radius: 12px;
      font-weight: 800;
      text-decoration: none;
    }}
    .ld-btn-primary {{
      background: #c8102e;
      color: #fff;
    }}
    .ld-btn-secondary {{
      background: rgba(255,255,255,.03);
      border: 1px solid rgba(255,255,255,.1);
      color: #fff;
    }}
    .ld-bullets, .ld-proof-points, .ld-links {{
      display: grid;
      gap: 8px;
      padding-left: 18px;
    }}
    .ld-card, .ld-form-card {{
      background: linear-gradient(180deg, #141d28 0%, #1b2533 100%);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 22px;
      padding: 22px;
      box-shadow: 0 18px 46px rgba(0,0,0,.24);
    }}
    .ld-card h2, .ld-form-card h2 {{
      margin-top: 0;
      font-size: 1.28rem;
      font-weight: 900;
    }}
    .ld-card p, .ld-form-card p, .ld-note {{
      color: #aabbd3;
    }}
    .ld-main {{
      padding: 32px 0 64px;
    }}
    .ld-main-grid {{
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(320px, .92fr);
      gap: 24px;
      align-items: start;
    }}
    .ld-stack {{
      display: grid;
      gap: 24px;
    }}
    .ld-image {{
      width: 100%;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,.08);
      margin: 12px 0 16px;
    }}
    .ld-proof-meta {{
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 18px;
    }}
    .ld-proof-box {{
      background: rgba(255,255,255,.03);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 16px;
      padding: 14px;
    }}
    .ld-proof-box strong {{
      display: block;
      margin-bottom: 4px;
    }}
    .ld-faq details {{
      border-top: 1px solid rgba(255,255,255,.08);
      padding: 14px 0;
    }}
    .ld-faq summary {{
      cursor: pointer;
      font-weight: 800;
    }}
    .ld-form {{
      display: grid;
      gap: 14px;
    }}
    .ld-form-row {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }}
    .ld-field {{
      display: flex;
      flex-direction: column;
      gap: 6px;
    }}
    .ld-field label {{
      font-size: .78rem;
      color: #c3d0e5;
      font-weight: 800;
      letter-spacing: .06em;
      text-transform: uppercase;
    }}
    .ld-field input, .ld-field textarea, .ld-field select {{
      width: 100%;
      padding: 13px 14px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,.12);
      background: #0d1520;
      color: #fff;
      font: inherit;
    }}
    .ld-field textarea {{
      min-height: 120px;
      resize: vertical;
    }}
    .ld-consent {{
      display: flex;
      gap: 10px;
      align-items: flex-start;
      color: #aabbd3;
      font-size: .86rem;
    }}
    .ld-consent input {{
      margin-top: 3px;
      accent-color: #c8102e;
    }}
    .ld-submit {{
      width: 100%;
      padding: 15px 18px;
      border-radius: 14px;
      border: none;
      background: #c8102e;
      color: #fff;
      font-size: 1rem;
      font-weight: 900;
      cursor: pointer;
    }}
    .ld-footer {{
      padding: 0 0 46px;
      color: #7b8ca5;
      font-size: .82rem;
      text-align: center;
    }}
    .ld-footer a {{
      color: #9fc0ff;
    }}
    @media (max-width: 960px) {{
      .ld-hero-grid, .ld-main-grid, .ld-form-row, .ld-proof-meta {{
        grid-template-columns: 1fr;
      }}
    }}
  </style>
</head>
<body>
  <main>
    <section class="ld-hero">
      <div class="ld-shell ld-hero-grid">
        <div>
          <div class="ld-eyebrow">{escape(city.market)} service page</div>
          <h1>{escape(service.service)} in {escape(city.city)}, {escape(city.state)}</h1>
          <p class="ld-sub">{escape(proof["intro_hook"])} {escape(service.summary)}</p>
          <div class="ld-actions">
            <a href="#estimate-form" class="ld-btn ld-btn-primary">{escape(service.cta_label)}</a>
            <a href="tel:{escape(PHONE_E164)}" class="ld-btn ld-btn-secondary">Call Bill: {escape(PHONE)}</a>
          </div>
          <ul class="ld-bullets">
{render_list(service.bullets)}
          </ul>
        </div>
        <aside class="ld-card">
          <h2>Why this page exists</h2>
          <p>This page is built for homeowners in {escape(city.city)} who want a direct local next step instead of a vague service page. It stays compliant by targeting one real service in one real market with local proof, real contact details, and a first-party estimate path.</p>
          <ul class="ld-proof-points">
{render_list(proof["proof_points"])}
          </ul>
          <img class="ld-image" src="{escape(proof["image_urls"][0])}" alt="{escape(service.service)} project support image for {city.city}, {city.state}">
          <p><strong>Nearby homeowners:</strong> {escape(nearby)}</p>
          <p><strong>ZIP coverage focus:</strong> {escape(", ".join(city.postal_codes))}</p>
        </aside>
      </div>
    </section>

    <section class="ld-main">
      <div class="ld-shell ld-main-grid">
        <div class="ld-stack">
          <article class="ld-card">
            <h2>{escape(city.city)} homeowners call for this when:</h2>
            <p>{escape(city.local_notes)}</p>
            <p>{escape(service.summary)} We keep the estimate simple, the scope clear, and the next step obvious.</p>
            <div class="ld-proof-meta">
              <div class="ld-proof-box">
                <strong>Local context</strong>
                <span>{escape(city.county)} · {escape(city.market)}</span>
              </div>
              <div class="ld-proof-box">
                <strong>Neighborhood pull</strong>
                <span>{escape(neighborhoods)}</span>
              </div>
              <div class="ld-proof-box">
                <strong>Real CTA</strong>
                <span>Direct estimate request, direct phone call, or match desk handoff</span>
              </div>
              <div class="ld-proof-box">
                <strong>Proof path</strong>
                <span>Completed jobs, reviews, and contractor match flow all stay on one system</span>
              </div>
            </div>
          </article>

          <article class="ld-card">
            <h2>Real local proof</h2>
            <p>{escape(proof["review_excerpt"])}</p>
            <p class="ld-note">Review source label: {escape(proof["review_author"])}</p>
            <ul class="ld-proof-points">
{render_list(proof["local_notes"])}
            </ul>
          </article>

          <article class="ld-card ld-faq">
            <h2>Questions about {escape(service.service.lower())} in {escape(city.city)}</h2>
{render_faq_html(service)}
          </article>

          <article class="ld-card">
            <h2>Useful next pages</h2>
            <ul class="ld-links">
{render_links(proof_links)}
            </ul>
          </article>
        </div>

        <aside class="ld-form-card" id="estimate-form">
          <h2>{escape(service.cta_label)}</h2>
          <p>This first-party form captures service, city, source, page, and campaign data so the lead can be routed cleanly and followed up fast.</p>
          <form class="ld-form" action="{escape(FORM_ACTION)}" method="post" data-form="Local-Service-Page">
            <input type="hidden" name="_subject" value="🏗️ NEW LOCAL PAGE LEAD — {escape(service.service)} | {escape(city.city)}, {escape(city.state)}">
            <input type="hidden" name="_cc" value="tonybeal40@gmail.com,6185810676@tmomail.net,6185810676@txt.att.net,6185810676@vtext.com,6185810676@email.uscc.net">
            <input type="hidden" name="_captcha" value="false">
            <input type="hidden" name="_next" value="{escape(SITE)}/thank-you.html?src=form&form={escape(service.slug)}-{escape(city.slug)}">
            <input type="hidden" name="_template" value="table">
            <input type="hidden" name="lead_source" value="Local Service Page">
            <input type="hidden" name="page_template" value="local-service-page">
            <input type="hidden" name="service_slug" value="{escape(service.slug)}">
            <input type="hidden" name="city_slug" value="{escape(city.slug)}">
            <input type="hidden" name="landing_page" value="{escape(page_name)}">
            <input type="hidden" name="utm_source">
            <input type="hidden" name="utm_medium">
            <input type="hidden" name="utm_campaign">
            <input type="hidden" name="utm_term">
            <input type="hidden" name="utm_content">
            <input type="hidden" name="gclid">
            <input type="hidden" name="gbraid">
            <input type="hidden" name="wbraid">
            <input type="hidden" name="msclkid">
            <input type="hidden" name="referrer">
            <input type="hidden" name="consent_text_version" value="allpro-local-demand-v1">

            <div class="ld-form-row">
              <div class="ld-field">
                <label for="{escape(service.slug)}-{escape(city.slug)}-name">Name</label>
                <input id="{escape(service.slug)}-{escape(city.slug)}-name" name="full_name" required>
              </div>
              <div class="ld-field">
                <label for="{escape(service.slug)}-{escape(city.slug)}-phone">Phone</label>
                <input id="{escape(service.slug)}-{escape(city.slug)}-phone" name="phone" type="tel" required>
              </div>
            </div>

            <div class="ld-form-row">
              <div class="ld-field">
                <label for="{escape(service.slug)}-{escape(city.slug)}-email">Email</label>
                <input id="{escape(service.slug)}-{escape(city.slug)}-email" name="email" type="email">
              </div>
              <div class="ld-field">
                <label for="{escape(service.slug)}-{escape(city.slug)}-city">City</label>
                <input id="{escape(service.slug)}-{escape(city.slug)}-city" name="city" value="{escape(city.city)}" required>
              </div>
            </div>

            <div class="ld-form-row">
              <div class="ld-field">
                <label for="{escape(service.slug)}-{escape(city.slug)}-budget">Budget Range</label>
                <select id="{escape(service.slug)}-{escape(city.slug)}-budget" name="budget_range">
                  <option value="">Select budget</option>
                  <option>Under $1,500</option>
                  <option>$1,500 - $5,000</option>
                  <option>$5,000 - $15,000</option>
                  <option>$15,000 - $35,000</option>
                  <option>$35,000+</option>
                  <option>Need guidance</option>
                </select>
              </div>
              <div class="ld-field">
                <label for="{escape(service.slug)}-{escape(city.slug)}-timeline">Timeline</label>
                <select id="{escape(service.slug)}-{escape(city.slug)}-timeline" name="timeline">
                  <option value="">Select timeline</option>
                  <option>ASAP</option>
                  <option>Within 30 Days</option>
                  <option>1 to 3 Months</option>
                  <option>Just planning</option>
                </select>
              </div>
            </div>

            <div class="ld-field">
              <label for="{escape(service.slug)}-{escape(city.slug)}-details">Project Details</label>
              <textarea id="{escape(service.slug)}-{escape(city.slug)}-details" name="details" placeholder="Tell us what is going on, what part of the property needs work, and what outcome you want."></textarea>
            </div>

            <label class="ld-consent">
              <input type="checkbox" name="estimate_contact_consent" value="yes" required>
              <span>I agree to be contacted by phone, text, or email about my estimate request.</span>
            </label>

            <button class="ld-submit" type="submit">{escape(service.cta_label)}</button>
            <p class="ld-note">Source tracked · page tracked · first-party form capture · owner-led follow-up</p>
          </form>
        </aside>
      </div>
    </section>

    <div class="ld-shell ld-footer">
      <p>Published {escape(TODAY)} · <a href="index.html">All-Pro home</a> · <a href="metro-east-contractor-match.html">Project match</a> · <a href="get-quote.html">Direct quote page</a></p>
    </div>
  </main>
</body>
</html>
"""


def build_sitemap(urls: list[str]) -> str:
    rows = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url in urls:
        rows.append("  <url>")
        rows.append(f"    <loc>{escape(url)}</loc>")
        rows.append(f"    <lastmod>{TODAY}</lastmod>")
        rows.append("    <changefreq>weekly</changefreq>")
        rows.append("    <priority>0.74</priority>")
        rows.append("  </url>")
    rows.append("</urlset>")
    return "\n".join(rows) + "\n"


def main() -> None:
    OUTPUT_PAGES.mkdir(parents=True, exist_ok=True)

    cities = [City(**item) for item in load_json(DATA / "cities.json")]
    services = [Service(**item) for item in load_json(DATA / "services.json")]
    proofs = load_json(DATA / "proofs.json")

    urls: list[str] = []
    for city in cities:
        for service in services:
            proof = build_proof(service, city, proofs)
            html = render_page(service, city, proof)
            page_name = filename(service, city)
            (ROOT / page_name).write_text(html, encoding="utf-8")
            (OUTPUT_PAGES / page_name).write_text(html, encoding="utf-8")
            urls.append(page_url(service, city))

    sitemap = build_sitemap(urls)
    (ROOT / "sitemap-local.xml").write_text(sitemap, encoding="utf-8")
    (OUTPUT / "sitemap-local.xml").write_text(sitemap, encoding="utf-8")
    print(f"Generated {len(urls)} public local pages.")
    print(f"Updated {ROOT / 'sitemap-local.xml'}")


if __name__ == "__main__":
    main()
