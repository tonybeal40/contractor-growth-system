#!/usr/bin/env python3
"""Fail deployment when a priority remodel page loses lead or SEO essentials."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PAGES = (
    "kitchen-remodel-belleville-il.html",
    "bathroom-remodel-belleville-il.html",
    "kitchen-remodel-ofallon-il.html",
    "bathroom-remodel-ofallon-il.html",
)
HOMEOWNER_GUIDE_PAGES = (
    "metro-east-home-service-guide.html",
    "metro-east-project-estimate-checklist.html",
)
PROJECT_INTAKE_PAGE = "kitchen-bath-project-review-belleville-ofallon.html"
FORM_ACTION = "https://formsubmit.co/williamosessionallpro@gmail.com"
ANALYTICS_LOADER = "analytics-loader.js?v=20260714a"
LEAD_TRACKING_LOADER = "lead-tracking.js?v=20260723c"
REMODEL_STYLESHEET = "remodel-lead-pages.css?v=20260801b"
CONCIERGE_LOADER = "lead-concierge-loader.js?v=20260723a"
CURRENT_FORM_ROUTER = "formsubmit-lead-tracking.js?v=20260726a"
ACCEPTED_FORM_ROUTER = re.compile(
    r"formsubmit-lead-tracking\.js\?v=202607(?:26a|30a)",
    re.IGNORECASE,
)


def value(pattern: str, html: str) -> str:
    match = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
    return re.sub(r"\s+", " ", match.group(1)).strip() if match else ""


def check_page(filename: str) -> list[str]:
    html = (ROOT / filename).read_text(encoding="utf-8")
    errors: list[str] = []
    title = value(r"<title>(.*?)</title>", html)
    description = value(r'<meta\s+name="description"\s+content="([^"]*)"', html)

    if not 30 <= len(title) <= 65:
        errors.append(f"title length is {len(title)}")
    if not 90 <= len(description) <= 160:
        errors.append(f"description length is {len(description)}")
    if len(re.findall(r"<h1\b", html, re.IGNORECASE)) != 1:
        errors.append("must contain exactly one H1")
    if f'action="{FORM_ACTION}"' not in html:
        errors.append("missing the approved FormSubmit action")
    if not re.search(r"<form\b[^>]*\bmethod=\"post\"", html, re.IGNORECASE):
        errors.append("lead form must use POST")
    if not re.search(r"<form\b[^>]*\bdata-form=\"[^\"]+\"", html, re.IGNORECASE):
        errors.append("lead form is missing data-form label")
    for field in (
        "full_name",
        "phone",
        "email",
        "project_zip",
        "contact_method",
        "budget_range",
        "project_photo",
        "estimate_contact_consent",
    ):
        if not re.search(rf'\bname="{field}"', html, re.IGNORECASE):
            errors.append(f"missing {field} field")
    if 'enctype="multipart/form-data"' not in html:
        errors.append("lead form must support an optional project photo")
    permit_url = (
        "https://www.belleville.net/345/Health-Housing-Building"
        if "belleville" in filename
        else "https://www.ofallon.org/200/Residential-Construction-Home-Improvement-Permit-Applications"
    )
    if permit_url not in html:
        errors.append("missing official city permit guidance")
    if CURRENT_FORM_ROUTER not in html:
        errors.append("missing current shared form tracking script")
    if REMODEL_STYLESHEET not in html:
        errors.append("missing current shared remodel stylesheet")
    if CONCIERGE_LOADER not in html:
        errors.append("missing lazy project concierge loader")
    if "lead-concierge.css" in html:
        errors.append("loads the full concierge stylesheet before interaction")
    if ANALYTICS_LOADER not in html:
        errors.append("missing deferred analytics loader")
    if LEAD_TRACKING_LOADER not in html:
        errors.append("missing current lead tracking loader")
    if "googletagmanager.com/gtag/js" in html or "clarity.ms/tag/" in html:
        errors.append("contains a render-blocking vendor analytics loader")
    if "fonts.googleapis.com" in html:
        errors.append("contains a render-blocking Google Fonts request")
    if html.find(ANALYTICS_LOADER) > html.find(LEAD_TRACKING_LOADER):
        errors.append("analytics loader must run before lead tracking")
    if html.count("<svg") != html.count("</svg>"):
        errors.append("contains unbalanced SVG markup")
    if 'href="tel:6185810676"' not in html:
        errors.append("missing primary telephone link")

    for block in re.findall(
        r'<script\s+type="application/ld\+json">(.*?)</script>',
        html,
        re.IGNORECASE | re.DOTALL,
    ):
        try:
            json.loads(block)
        except json.JSONDecodeError as exc:
            errors.append(f"invalid JSON-LD: {exc.msg}")

    return errors


def check_all_form_routes() -> list[str]:
    errors: list[str] = []
    retired_gateways = (
        "@tmomail.net",
        "@txt.att.net",
        "@vtext.com",
        "@email.uscc.net",
    )

    for path in ROOT.glob("*.html"):
        html = path.read_text(encoding="utf-8")

        if "formsubmit.co/" not in html:
            continue

        if any(gateway in html for gateway in retired_gateways):
            errors.append(f"{path.name}: contains a retired carrier gateway")
        if not ACCEPTED_FORM_ROUTER.search(html):
            errors.append(f"{path.name}: does not load an approved form router")

    return errors


def check_project_intake() -> list[str]:
    html = (ROOT / PROJECT_INTAKE_PAGE).read_text(encoding="utf-8")
    errors: list[str] = []
    form_name = value(r'<form\b[^>]*\bdata-form="([^"]+)"', html)
    review_pattern = re.compile(
        r"testimonial|review\s+request|(?:customer|website)\s+review",
        re.IGNORECASE,
    )

    if f'action="{FORM_ACTION}"' not in html:
        errors.append("missing the approved Bill FormSubmit action")
    if not form_name:
        errors.append("missing data-form label")
    elif review_pattern.search(form_name):
        errors.append("data-form label would route this homeowner request as a customer review")
    for field in (
        "full_name",
        "phone",
        "email",
        "city",
        "service",
        "details",
        "project_photo",
        "estimate_contact_consent",
    ):
        if not re.search(rf'\bname="{field}"', html, re.IGNORECASE):
            errors.append(f"missing {field} field")
    if "formsubmit-lead-tracking.js?v=20260730a" not in html:
        errors.append("missing the project-intake form router version")

    for linking_page in ("index.html", *PAGES):
        linking_html = (ROOT / linking_page).read_text(encoding="utf-8")
        if PROJECT_INTAKE_PAGE not in linking_html:
            errors.append(f"{linking_page} does not link to the project intake")

    return errors


def check_homeowner_guide(filename: str) -> list[str]:
    html = (ROOT / filename).read_text(encoding="utf-8")
    errors: list[str] = []
    title = value(r"<title>(.*?)</title>", html)
    description = value(r'<meta\s+name="description"\s+content="([^"]*)"', html)
    insider_copy = re.compile(
        r"research layer|what this becomes|fresh local service clusters|"
        r"want the system to sort it|guide layer",
        re.IGNORECASE,
    )

    if not 30 <= len(title) <= 65:
        errors.append(f"title length is {len(title)}")
    if not 90 <= len(description) <= 160:
        errors.append(f"description length is {len(description)}")
    if len(re.findall(r"<h1\b", html, re.IGNORECASE)) != 1:
        errors.append("must contain exactly one H1")
    for priority_page in PAGES:
        if f'href="{priority_page}"' not in html:
            errors.append(f"missing direct link to {priority_page}")
    if ANALYTICS_LOADER not in html:
        errors.append("missing deferred analytics loader")
    if LEAD_TRACKING_LOADER not in html:
        errors.append("missing current lead tracking loader")
    if html.find(ANALYTICS_LOADER) > html.find(LEAD_TRACKING_LOADER):
        errors.append("analytics loader must run before lead tracking")
    if "googletagmanager.com/gtag/js" in html or "clarity.ms/tag/" in html:
        errors.append("contains a render-blocking vendor analytics loader")
    if "fonts.googleapis.com" in html:
        errors.append("contains a render-blocking Google Fonts request")
    if insider_copy.search(html):
        errors.append("contains internal strategy wording")
    if 'href="tel:6185810676"' not in html:
        errors.append("missing primary telephone link")

    json_blocks = re.findall(
        r'<script\s+type="application/ld\+json">(.*?)</script>',
        html,
        re.IGNORECASE | re.DOTALL,
    )
    if not json_blocks:
        errors.append("missing JSON-LD")
    for block in json_blocks:
        try:
            json.loads(block)
        except json.JSONDecodeError as exc:
            errors.append(f"invalid JSON-LD: {exc.msg}")

    return errors


def main() -> int:
    failures = {page: check_page(page) for page in PAGES}
    failures.update({page: check_homeowner_guide(page) for page in HOMEOWNER_GUIDE_PAGES})
    project_intake_errors = check_project_intake()
    if project_intake_errors:
        failures[PROJECT_INTAKE_PAGE] = project_intake_errors
    failures = {page: errors for page, errors in failures.items() if errors}
    route_errors = check_all_form_routes()

    if failures or route_errors:
        for page, errors in failures.items():
            print(f"{page}:")
            for error in errors:
                print(f"  - {error}")
        for error in route_errors:
            print(f"  - {error}")
        return 1

    print(
        f"Validated {len(PAGES)} priority remodel pages, {len(HOMEOWNER_GUIDE_PAGES)} homeowner guides, "
        "the project intake, and all FormSubmit routes."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
