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
FORM_ACTION = "https://formsubmit.co/williamosessionallpro@gmail.com"
ANALYTICS_LOADER = "analytics-loader.js?v=20260714a"
REMODEL_STYLESHEET = "remodel-lead-pages.css?v=20260714b"


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
    for field in ("full_name", "phone", "email", "estimate_contact_consent"):
        if not re.search(rf'\bname="{field}"', html, re.IGNORECASE):
            errors.append(f"missing {field} field")
    if "formsubmit-lead-tracking.js" not in html:
        errors.append("missing shared form tracking script")
    if REMODEL_STYLESHEET not in html:
        errors.append("missing current shared remodel stylesheet")
    if ANALYTICS_LOADER not in html:
        errors.append("missing deferred analytics loader")
    if "googletagmanager.com/gtag/js" in html or "clarity.ms/tag/" in html:
        errors.append("contains a render-blocking vendor analytics loader")
    if "fonts.googleapis.com" in html:
        errors.append("contains a render-blocking Google Fonts request")
    if html.find(ANALYTICS_LOADER) > html.find("lead-tracking.js?v=20260714a"):
        errors.append("analytics loader must run before lead tracking")
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
        if "formsubmit-lead-tracking.js?v=20260714a" not in html:
            errors.append(f"{path.name}: does not load the current form router")

    return errors


def main() -> int:
    failures = {page: check_page(page) for page in PAGES}
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

    print(f"Validated {len(PAGES)} priority remodel pages and all FormSubmit routes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
