#!/usr/bin/env python3
"""Build an isolated contractor website from approved client facts."""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import tempfile
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
DIST_ROOT = ROOT / "dist"
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
E164_RE = re.compile(r"^\+[1-9][0-9]{7,14}$")


class ConfigError(ValueError):
    pass


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def absolute_https(value: str, field: str) -> None:
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ConfigError(f"{field} must be an absolute https URL")


def image_reference(value: str, field: str) -> None:
    parsed = urlparse(value)
    if parsed.scheme == "https" and parsed.netloc:
        return
    path = Path(value)
    if (
        parsed.scheme
        or parsed.netloc
        or path.is_absolute()
        or ".." in path.parts
        or len(path.parts) != 2
        or path.parts[0] != "assets"
        or path.suffix.lower() not in {".avif", ".jpg", ".jpeg", ".png", ".webp"}
    ):
        raise ConfigError(f"{field} must be an absolute https URL or a safe assets/ image path")
    if not (ROOT / path).is_file():
        raise ConfigError(f"{field} references a missing bundled image: {value}")


def image_src(value: str, prefix: str = "") -> str:
    return value if value.startswith("https://") else prefix + value


def require_text(container: dict, field: str, context: str, minimum: int = 1) -> str:
    value = str(container.get(field, "")).strip()
    if len(value) < minimum:
        raise ConfigError(f"{context}.{field} must contain at least {minimum} characters")
    return value


def validate_config(config: dict) -> None:
    business = config.get("business") or {}
    for field in ("name", "short_name", "slug", "domain", "phone_display", "phone_e164", "email", "service_region", "description"):
        require_text(business, field, "business")
    if not SLUG_RE.fullmatch(business["slug"]):
        raise ConfigError("business.slug must use lowercase letters, numbers, and single hyphens")
    absolute_https(business["domain"], "business.domain")
    if not E164_RE.fullmatch(business["phone_e164"]):
        raise ConfigError("business.phone_e164 must use E.164 format, for example +16185550100")
    if "@" not in business["email"]:
        raise ConfigError("business.email must be an email address")
    trust_items = business.get("trust_items") or []
    if len(trust_items) < 3:
        raise ConfigError("business.trust_items must include at least three approved trust facts")
    for index, item in enumerate(trust_items):
        require_text(item, "title", f"business.trust_items[{index}]")
        require_text(item, "detail", f"business.trust_items[{index}]")

    brand = config.get("brand") or {}
    for field in ("charcoal", "cream", "green", "copper"):
        if not HEX_RE.fullmatch(str(brand.get(field, ""))):
            raise ConfigError(f"brand.{field} must be a six-digit hex color")

    hero = config.get("hero") or {}
    for field in ("headline", "summary", "image_url", "image_alt"):
        require_text(hero, field, "hero")
    image_reference(hero["image_url"], "hero.image_url")

    services = config.get("services") or []
    if not services:
        raise ConfigError("services must include at least one real service")
    service_slugs: set[str] = set()
    for index, service in enumerate(services):
        context = f"services[{index}]"
        slug = require_text(service, "slug", context)
        if not SLUG_RE.fullmatch(slug) or slug in service_slugs:
            raise ConfigError(f"{context}.slug must be unique and URL-safe")
        service_slugs.add(slug)
        require_text(service, "name", context)
        require_text(service, "summary", context, 70)
        if len(service.get("details") or []) < 3:
            raise ConfigError(f"{context}.details must include at least three scope details")
        image_reference(require_text(service, "image_url", context), f"{context}.image_url")
        require_text(service, "image_alt", context)
        for faq_index, faq in enumerate(service.get("faqs") or []):
            require_text(faq, "question", f"{context}.faqs[{faq_index}]")
            require_text(faq, "answer", f"{context}.faqs[{faq_index}]", 40)

    cities = config.get("cities") or []
    if not cities:
        raise ConfigError("cities must include at least one real service area")
    city_slugs: set[str] = set()
    summaries: set[str] = set()
    for index, city in enumerate(cities):
        context = f"cities[{index}]"
        slug = require_text(city, "slug", context)
        if not SLUG_RE.fullmatch(slug) or slug in city_slugs:
            raise ConfigError(f"{context}.slug must be unique and URL-safe")
        city_slugs.add(slug)
        require_text(city, "name", context)
        require_text(city, "region", context)
        summary = require_text(city, "summary", context, 120)
        normalized = re.sub(r"\s+", " ", summary.lower())
        if normalized in summaries:
            raise ConfigError(f"{context}.summary duplicates another city page")
        summaries.add(normalized)
        if len(city.get("local_notes") or []) < 2:
            raise ConfigError(f"{context}.local_notes must include at least two city-specific facts")
        unknown = set(city.get("service_slugs") or []) - service_slugs
        if unknown:
            raise ConfigError(f"{context}.service_slugs contains unknown services: {sorted(unknown)}")

    form = config.get("form") or {}
    for field in ("action", "success_url", "privacy_url"):
        absolute_https(require_text(form, field, "form"), f"form.{field}")
    legal = config.get("legal") or {}
    require_text(legal, "effective_date", "legal")
    if "@" not in require_text(legal, "privacy_contact", "legal"):
        raise ConfigError("legal.privacy_contact must be an email address")


def load_config(path: Path) -> dict:
    try:
        config = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ConfigError(f"Configuration file not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ConfigError(f"Invalid JSON in {path}: {exc}") from exc
    validate_config(config)
    return config


def canonical(domain: str, relative_path: str) -> str:
    base = domain.rstrip("/")
    return f"{base}/" if relative_path == "index.html" else f"{base}/{relative_path}"


def schema_tag(items: list[dict]) -> str:
    return "\n".join(
        '<script type="application/ld+json">' + json.dumps(item, ensure_ascii=True, separators=(",", ":")) + "</script>"
        for item in items
    )


def local_business_schema(config: dict) -> dict:
    business = config["business"]
    schema: dict = {
        "@context": "https://schema.org",
        "@type": "HomeAndConstructionBusiness",
        "@id": business["domain"].rstrip("/") + "/#business",
        "name": business["name"],
        "url": business["domain"],
        "telephone": business["phone_e164"],
        "email": business["email"],
        "description": business["description"],
        "areaServed": [city["name"] + ", " + city["region"] for city in config["cities"]],
        "sameAs": business.get("same_as") or [],
    }
    return schema


def breadcrumbs(config: dict, crumbs: list[tuple[str, str]]) -> dict:
    domain = config["business"]["domain"].rstrip("/")
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": index, "name": name, "item": domain + "/" + path.lstrip("/")}
            for index, (name, path) in enumerate(crumbs, start=1)
        ],
    }


def header(config: dict, prefix: str = "") -> str:
    business = config["business"]
    return f"""
<a class="skip-link" href="#main">Skip to main content</a>
<header class="site-header">
  <div class="nav-wrap">
    <a class="brand" href="{prefix}index.html" aria-label="{esc(business['name'])} home">
      <span class="brand-mark" aria-hidden="true">H</span>
      <span>{esc(business['short_name'])}<small>{esc(business['service_region'])}</small></span>
    </a>
    <button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="site-nav" aria-label="Open navigation">&#9776;</button>
    <nav class="site-nav" id="site-nav" data-site-nav aria-label="Primary navigation" hidden>
      <a href="{prefix}index.html#services">Services</a>
      <a href="{prefix}index.html#areas">Areas</a>
      <a href="{prefix}index.html#process">How it works</a>
      <a href="tel:{esc(business['phone_e164'])}">Call {esc(business['short_name'])}</a>
      <a class="button" href="{prefix}estimate.html">Free estimate</a>
    </nav>
  </div>
</header>"""


def footer(config: dict, prefix: str = "") -> str:
    business = config["business"]
    service_links = "".join(
        f'<a href="{prefix}services/{esc(service["slug"])}.html">{esc(service["name"])}</a>'
        for service in config["services"]
    )
    city_links = "".join(
        f'<a href="{prefix}{esc(city["slug"])}.html">{esc(city["name"])}</a>' for city in config["cities"]
    )
    return f"""
<section class="cta-band" aria-label="Estimate call to action">
  <div class="cta-inner"><div><h2>Ready for a clear next step?</h2><p>Tell us what you want to improve and where the project is located.</p></div>
  <div class="cta-actions"><a class="button" href="{prefix}estimate.html">Request an estimate</a><a class="button secondary" href="tel:{esc(business['phone_e164'])}">Call {esc(business['phone_display'])}</a></div></div>
</section>
<footer class="site-footer">
  <div class="footer-grid">
    <div><h2>{esc(business['name'])}</h2><p>{esc(business['description'])}</p><p><a href="tel:{esc(business['phone_e164'])}">{esc(business['phone_display'])}</a><br><a href="mailto:{esc(business['email'])}">{esc(business['email'])}</a></p></div>
    <div><h3>Services</h3><div class="footer-links">{service_links}</div></div>
    <div><h3>Service areas</h3><div class="footer-links">{city_links}<a href="{prefix}privacy.html">Privacy</a><a href="{prefix}terms.html">Terms</a></div></div>
  </div>
  <div class="footer-bottom">&copy; {esc(config['legal']['effective_date'][:4])} {esc(business['name'])}. Service availability is confirmed before scheduling.</div>
</footer>
<div class="mobile-actions"><a href="tel:{esc(business['phone_e164'])}">Call now</a><a href="{prefix}estimate.html">Estimate</a></div>"""


def document(config: dict, *, title: str, description: str, path: str, body: str, schemas: list[dict], prefix: str = "") -> str:
    business = config["business"]
    url = canonical(business["domain"], path)
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(description)}">
  <link rel="canonical" href="{esc(url)}">
  <link rel="icon" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=">
  <meta property="og:type" content="website"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:url" content="{esc(url)}">
  <link rel="stylesheet" href="{prefix}assets/site.css"><link rel="stylesheet" href="{prefix}assets/theme.css">
  {schema_tag(schemas)}
</head>
<body>
{header(config, prefix)}
<main id="main">{body}</main>
{footer(config, prefix)}
<script src="{prefix}assets/site.js" defer></script>
</body>
</html>
"""


def home_body(config: dict) -> str:
    business, hero = config["business"], config["hero"]
    trust = "".join(
        f'<div class="trust-item">{esc(item["title"])}<small>{esc(item["detail"])}</small></div>'
        for item in business["trust_items"][:4]
    )
    services = "".join(
        f'''<article class="card"><img src="{esc(image_src(service['image_url']))}" alt="{esc(service['image_alt'])}" width="800" height="500" loading="lazy"><div class="card-body"><h3>{esc(service['name'])}</h3><p>{esc(service['summary'])}</p><a class="text-link" href="services/{esc(service['slug'])}.html">Explore {esc(service['name'])} &rarr;</a></div></article>'''
        for service in config["services"]
    )
    areas = "".join(
        f'<article class="card"><div class="card-body"><h3>{esc(city["name"])}</h3><p>{esc(city["summary"])}</p><a class="text-link" href="{esc(city["slug"])}.html">Projects in {esc(city["name"])} &rarr;</a></div></article>'
        for city in config["cities"]
    )
    return f"""
<section class="hero"><div class="hero-grid"><div class="hero-copy"><div class="eyebrow">Local home improvement in {esc(business['service_region'])}</div><h1>{esc(hero['headline'])}</h1><p>{esc(hero['summary'])}</p><div class="hero-actions"><a class="button" href="estimate.html">Get a free estimate</a><a class="button secondary" href="tel:{esc(business['phone_e164'])}">Call {esc(business['phone_display'])}</a></div></div><div class="hero-media"><img src="{esc(image_src(hero['image_url']))}" alt="{esc(hero['image_alt'])}" width="1600" height="900" fetchpriority="high"></div></div></section>
<section class="trust-bar" aria-label="Business facts"><div class="trust-grid">{trust}</div></section>
<section class="section" id="services"><div class="section-inner"><div class="section-heading"><div class="eyebrow">Services</div><h2>Start with the project you need done</h2><p>Each page explains the likely scope, useful first questions, and the next step for an estimate.</p></div><div class="card-grid">{services}</div></div></section>
<section class="section dark" id="process"><div class="section-inner"><div class="section-heading"><div class="eyebrow">How it works</div><h2>A practical path from question to written estimate</h2></div><div class="steps"><div class="step"><span class="step-number">1</span><h3>Share the project</h3><p>Send the address, service, timing, description, and photos when available.</p></div><div class="step"><span class="step-number">2</span><h3>Confirm the fit</h3><p>The team reviews the request, confirms the service area, and identifies the next useful question.</p></div><div class="step"><span class="step-number">3</span><h3>Plan the estimate</h3><p>If the project fits, arrange the appropriate visit and document the proposed scope.</p></div></div></div></section>
<section class="section cream" id="areas"><div class="section-inner"><div class="section-heading"><div class="eyebrow">Service areas</div><h2>Local project information for the communities we serve</h2><p>These pages are published only for active service areas and contain client-approved local notes.</p></div><div class="card-grid">{areas}</div></div></section>"""


def service_body(config: dict, service: dict) -> str:
    detail_items = "".join(f"<li>{esc(item)}</li>" for item in service["details"])
    faq_html = "".join(f'<details><summary>{esc(item["question"])}</summary><p>{esc(item["answer"])}</p></details>' for item in service.get("faqs") or [])
    city_links = "".join(
        f'<li><a href="../{esc(city["slug"])}.html">{esc(service["name"])} in {esc(city["name"])}</a></li>'
        for city in config["cities"] if service["slug"] in city["service_slugs"]
    )
    return f"""
<section class="page-hero"><div class="page-hero-inner"><div class="breadcrumbs"><a href="../index.html">Home</a> / {esc(service['name'])}</div><div class="eyebrow">{esc(config['business']['service_region'])}</div><h1>{esc(service['name'])}</h1><p>{esc(service['summary'])}</p><div class="hero-actions"><a class="button" href="../estimate.html?service={esc(service['slug'])}">Request an estimate</a><a class="button secondary" href="tel:{esc(config['business']['phone_e164'])}">Call {esc(config['business']['phone_display'])}</a></div></div></section>
<section class="section"><div class="section-inner split"><div><img src="{esc(image_src(service['image_url'], '../'))}" alt="{esc(service['image_alt'])}" width="900" height="700" loading="eager"></div><div><div class="eyebrow">Project scope</div><h2>What to discuss before work begins</h2><ul class="check-list">{detail_items}</ul></div></div></section>
<section class="section cream"><div class="section-inner split"><div><div class="section-heading"><div class="eyebrow">Service areas</div><h2>Local {esc(service['name']).lower()} pages</h2></div><ul>{city_links}</ul></div><div class="faq"><div class="section-heading"><div class="eyebrow">Questions</div><h2>Helpful first answers</h2></div>{faq_html or '<p>Send the project details and the team will identify the next useful question.</p>'}</div></div></section>"""


def city_body(config: dict, city: dict) -> str:
    services_by_slug = {item["slug"]: item for item in config["services"]}
    service_cards = "".join(
        f'<article class="card"><img src="{esc(image_src(services_by_slug[slug]["image_url"]))}" alt="{esc(services_by_slug[slug]["image_alt"])}" width="800" height="500" loading="lazy"><div class="card-body"><h3>{esc(services_by_slug[slug]["name"])}</h3><p>{esc(services_by_slug[slug]["summary"])}</p><a class="text-link" href="services/{esc(slug)}.html">Project details &rarr;</a></div></article>'
        for slug in city["service_slugs"]
    )
    notes = "".join(f"<li>{esc(note)}</li>" for note in city["local_notes"])
    return f"""
<section class="page-hero"><div class="page-hero-inner"><div class="breadcrumbs"><a href="index.html">Home</a> / {esc(city['name'])}</div><div class="eyebrow">{esc(city['region'])}</div><h1>Home Improvement Contractor in {esc(city['name'])}</h1><p>{esc(city['summary'])}</p><div class="hero-actions"><a class="button" href="estimate.html?city={esc(city['slug'])}">Request an estimate</a><a class="button secondary" href="tel:{esc(config['business']['phone_e164'])}">Call {esc(config['business']['phone_display'])}</a></div></div></section>
<section class="section"><div class="section-inner"><div class="section-heading"><div class="eyebrow">Available services</div><h2>Projects we discuss with {esc(city['name'])} homeowners</h2></div><div class="card-grid">{service_cards}</div></div></section>
<section class="section cream"><div class="section-inner split"><div><div class="section-heading"><div class="eyebrow">Local planning</div><h2>What matters before an estimate</h2></div><ul class="check-list">{notes}</ul></div><div><div class="section-heading"><div class="eyebrow">Start here</div><h2>Send useful project details once</h2><p>Include the project address, service, timing, goals, and photos. The team will confirm that the request is inside the active service area before scheduling.</p></div><a class="button" href="estimate.html?city={esc(city['slug'])}">Tell us about the project</a></div></div></section>"""


def estimate_body(config: dict) -> str:
    business, form = config["business"], config["form"]
    service_options = "".join(f'<option value="{esc(item["name"])}">{esc(item["name"])}</option>' for item in config["services"])
    city_options = "".join(f'<option value="{esc(item["name"])}">{esc(item["name"])}</option>' for item in config["cities"])
    return f"""
<section class="page-hero"><div class="page-hero-inner"><div class="breadcrumbs"><a href="index.html">Home</a> / Estimate</div><div class="eyebrow">Project request</div><h1>Tell us what you want to improve</h1><p>Share enough detail for {esc(business['short_name'])} to confirm the service area and prepare the right next question.</p></div></section>
<section class="section"><div class="section-inner"><form class="lead-form" action="{esc(form['action'])}" method="post" data-lead-form><input type="hidden" name="page_source" value="estimate"><input type="hidden" name="success_url" value="{esc(form['success_url'])}"><div class="honeypot" aria-hidden="true"><label>Leave this field empty<input name="company_website" tabindex="-1" autocomplete="off"></label></div>
<div class="field"><label for="full_name">Name</label><input id="full_name" name="full_name" autocomplete="name" required></div>
<div class="field"><label for="phone">Phone</label><input id="phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required></div>
<div class="field"><label for="email">Email <span class="form-note">(optional)</span></label><input id="email" name="email" type="email" autocomplete="email"></div>
<div class="field"><label for="city">Project city</label><select id="city" name="city" required><option value="">Select a city</option>{city_options}<option value="Other">Another nearby city</option></select></div>
<div class="field full"><label for="service">Service</label><select id="service" name="service" required><option value="">Select a service</option>{service_options}<option value="Other">Other home project</option></select></div>
<div class="field full"><label for="details">Project description</label><textarea id="details" name="details" placeholder="What needs to change, what problem are you solving, and when would you like to start?" required></textarea></div>
<div class="field full consent"><input id="contact_consent" name="contact_consent" type="checkbox" value="yes" required><label class="consent-label" for="contact_consent">I agree that {esc(business['name'])} may contact me by phone, text, or email about this request. Consent is not a condition of purchase. Message and data rates may apply.</label></div>
<div class="field full consent"><input id="email_opt_in" name="email_opt_in" type="checkbox" value="yes"><label class="consent-label" for="email_opt_in">Email me occasional project tips and service updates. I can unsubscribe at any time.</label></div>
<div class="field full"><button class="button" type="submit">Send project request</button><p class="form-note">By submitting, you acknowledge the <a href="{esc(form['privacy_url'])}">privacy policy</a>. For urgent safety issues, contact the appropriate emergency or utility service.</p></div></form></div></section>"""


def legal_body(config: dict, kind: str) -> str:
    business, legal = config["business"], config["legal"]
    if kind == "privacy":
        heading = "Privacy Policy"
        copy = f"""<h2>Information we collect</h2><p>When you submit a project request, {esc(business['name'])} may receive the contact and project information you choose to provide, along with basic page-source and analytics data.</p><h2>How information is used</h2><p>Information is used to review your request, respond, schedule estimates, improve the website, prevent abuse, and comply with legal obligations. Marketing email is sent only when you separately opt in.</p><h2>Sharing and retention</h2><p>Data may be processed by the configured website host, form provider, email provider, analytics provider, and customer-management tools. It is not sold as a consumer contact list. Records are retained only as needed for operations, disputes, and legal requirements.</p><h2>Your choices</h2><p>To request access, correction, or deletion, contact <a href="mailto:{esc(legal['privacy_contact'])}">{esc(legal['privacy_contact'])}</a>. Some records may need to be retained where required by law.</p>"""
    else:
        heading = "Website Terms"
        copy = f"""<h2>Website information</h2><p>This website provides general service information and a way to request contact. A submission is not a contract, price quote, appointment, or promise that a project will be accepted.</p><h2>Estimates and project agreements</h2><p>Scope, price, schedule, materials, permits, warranties, and payment terms must be stated in the applicable written estimate or project agreement.</p><h2>Service area and availability</h2><p>Service availability is confirmed for each address. Website content may change and does not guarantee scheduling, ranking, lead volume, or project results.</p><h2>Contact</h2><p>Questions may be sent to <a href="mailto:{esc(business['email'])}">{esc(business['email'])}</a>.</p>"""
    return f'<section class="page-hero"><div class="page-hero-inner"><div class="eyebrow">Effective {esc(legal["effective_date"])}</div><h1>{heading}</h1></div></section><section class="section"><div class="section-inner" style="max-width:850px">{copy}</div></section>'


def write_site(config: dict, target: Path) -> list[str]:
    business = config["business"]
    target.mkdir(parents=True, exist_ok=True)
    shutil.copytree(ROOT / "assets", target / "assets")
    brand = config["brand"]
    (target / "assets" / "theme.css").write_text(
        f':root{{--charcoal:{brand["charcoal"]};--cream:{brand["cream"]};--green:{brand["green"]};--copper:{brand["copper"]}}}\n',
        encoding="utf-8",
    )

    paths: list[str] = []
    home_description = business["description"][:155]
    home_schema = local_business_schema(config)
    (target / "index.html").write_text(document(config, title=f"{business['name']} | {business['service_region']}", description=home_description, path="index.html", body=home_body(config), schemas=[home_schema]), encoding="utf-8")
    paths.append("index.html")

    services_dir = target / "services"
    services_dir.mkdir()
    for service in config["services"]:
        relative = f"services/{service['slug']}.html"
        faq_schema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": item["question"], "acceptedAnswer": {"@type": "Answer", "text": item["answer"]}} for item in service.get("faqs") or []],
        }
        service_schema = {"@context": "https://schema.org", "@type": "Service", "name": service["name"], "description": service["summary"], "provider": {"@id": business["domain"].rstrip("/") + "/#business"}, "areaServed": [city["name"] for city in config["cities"] if service["slug"] in city["service_slugs"]]}
        schemas = [home_schema, service_schema, breadcrumbs(config, [("Home", ""), (service["name"], relative)])]
        if faq_schema["mainEntity"]:
            schemas.append(faq_schema)
        (target / relative).write_text(document(config, title=f"{service['name']} | {business['service_region']}", description=service["summary"][:155], path=relative, body=service_body(config, service), schemas=schemas, prefix="../"), encoding="utf-8")
        paths.append(relative)

    for city in config["cities"]:
        relative = f"{city['slug']}.html"
        (target / relative).write_text(document(config, title=f"Home Improvement Contractor in {city['name']} | {business['short_name']}", description=city["summary"][:155], path=relative, body=city_body(config, city), schemas=[home_schema, breadcrumbs(config, [("Home", ""), (city["name"], relative)])]), encoding="utf-8")
        paths.append(relative)

    (target / "estimate.html").write_text(document(config, title=f"Free Project Estimate | {business['name']}", description=f"Request a project estimate from {business['name']} in {business['service_region']}. Share your city, service, timing, and project details.", path="estimate.html", body=estimate_body(config), schemas=[home_schema, breadcrumbs(config, [("Home", ""), ("Estimate", "estimate.html")])]), encoding="utf-8")
    paths.append("estimate.html")
    for kind in ("privacy", "terms"):
        relative = f"{kind}.html"
        title = "Privacy Policy" if kind == "privacy" else "Website Terms"
        (target / relative).write_text(document(config, title=f"{title} | {business['name']}", description=f"{title} for the {business['name']} website.", path=relative, body=legal_body(config, kind), schemas=[home_schema, breadcrumbs(config, [("Home", ""), (title, relative)])]), encoding="utf-8")
        paths.append(relative)

    not_found = '<section class="page-hero"><div class="page-hero-inner"><div class="eyebrow">404</div><h1>Page not found</h1><p>The address may have changed. Use the links below to continue.</p><div class="hero-actions"><a class="button" href="index.html">Go home</a><a class="button secondary" href="estimate.html">Request an estimate</a></div></div></section>'
    (target / "404.html").write_text(document(config, title=f"Page Not Found | {business['name']}", description="The requested page could not be found.", path="404.html", body=not_found, schemas=[home_schema]), encoding="utf-8")

    sitemap_urls = "".join(f"<url><loc>{esc(canonical(business['domain'], path))}</loc></url>" for path in paths)
    (target / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{sitemap_urls}</urlset>\n', encoding="utf-8")
    (target / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {business['domain'].rstrip('/')}/sitemap.xml\n", encoding="utf-8")
    service_names = ", ".join(item["name"] for item in config["services"])
    city_names = ", ".join(item["name"] + ", " + item["region"] for item in config["cities"])
    (target / "llms.txt").write_text(f"# {business['name']}\n\nOfficial website: {business['domain']}\nPhone: {business['phone_display']}\nService region: {business['service_region']}\nServices: {service_names}\nActive service areas: {city_names}\n\nUse the official service and city pages for current details. Website submissions are requests for contact, not confirmed appointments or quotes.\n", encoding="utf-8")
    return paths


def build(config_path: Path) -> Path:
    config = load_config(config_path)
    DIST_ROOT.mkdir(parents=True, exist_ok=True)
    slug = config["business"]["slug"]
    destination = DIST_ROOT / slug
    if destination.parent.resolve() != DIST_ROOT.resolve():
        raise ConfigError("Unsafe output path")
    with tempfile.TemporaryDirectory(prefix=f".{slug}-", dir=DIST_ROOT) as temp_name:
        temp_target = Path(temp_name) / slug
        write_site(config, temp_target)
        if destination.exists():
            shutil.rmtree(destination)
        shutil.move(str(temp_target), str(destination))
    return destination


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("config", type=Path, help="Path to the client JSON configuration")
    args = parser.parse_args()
    try:
        destination = build(args.config.resolve())
    except ConfigError as exc:
        parser.error(str(exc))
    print(f"Built client site: {destination}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
