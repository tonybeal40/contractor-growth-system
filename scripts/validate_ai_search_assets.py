#!/usr/bin/env python3
"""Validate the public All-Pro entity and AI-search discovery layer."""

from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FACTS_PAGE = ROOT / "all-pro-company-facts.html"
BUSINESS_ID = "https://allprometroeastconstruction.com/#business"
FACTS_URL = "https://allprometroeastconstruction.com/all-pro-company-facts.html"
FACTS_LINK = "all-pro-company-facts.html"
PRIORITY_PAGES = (
    "kitchen-remodel-belleville-il.html",
    "bathroom-remodel-belleville-il.html",
    "kitchen-remodel-ofallon-il.html",
    "bathroom-remodel-ofallon-il.html",
)
REQUIRED_PROFILES = (
    "https://www.google.com/maps/search/?api=1&query=All-Pro%20Landscape%20Construction&query_place_id=ChIJKzqCfZ8idogRP03O0_iO2U8",
    "https://www.angi.com/companylist/us/il/new-athens/all-pro-construction-and-landscape-reviews-6233409.htm",
    "https://www.bbb.org/us/il/new-athens/profile/landscape-contractors/all-pro-construction-landscape-llc-0734-310038833",
    "https://reviews.birdeye.com/all-pro-landscape-construction-167051434418294",
    "https://www.facebook.com/metroeastconstructionIL",
    "https://www.linkedin.com/company/all-pro-metro-metro-east-construction/",
    "https://www.houzz.com/pro/tony-beal35/all-pro-construction",
    "https://yelp.com/biz/all-pro-construction-and-landscape-new-athens-2",
    "https://nextdoor.com/page/all-pro-landscape-construction-belleville-il",
)
REQUIRED_CRAWLERS = (
    "OAI-SearchBot",
    "ChatGPT-User",
    "PerplexityBot",
    "Perplexity-User",
    "Claude-SearchBot",
    "Claude-User",
    "Applebot",
    "DuckAssistBot",
)


class JsonLdParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_json_ld = False
        self.parts: list[str] = []
        self.blocks: list[str] = []
        self.h1_count = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {name.lower(): (value or "") for name, value in attrs}
        if tag.lower() == "h1":
            self.h1_count += 1
        if tag.lower() == "script" and values.get("type", "").lower() == "application/ld+json":
            self.in_json_ld = True
            self.parts = []

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "script" and self.in_json_ld:
            self.blocks.append("".join(self.parts))
            self.parts = []
            self.in_json_ld = False

    def handle_data(self, data: str) -> None:
        if self.in_json_ld:
            self.parts.append(data)


def load_page(path: Path) -> tuple[str, JsonLdParser, list[object]]:
    html = path.read_text(encoding="utf-8")
    parser = JsonLdParser()
    parser.feed(html)
    payloads: list[object] = []
    for block in parser.blocks:
        payloads.append(json.loads(block))
    return html, parser, payloads


def flattened_types(value: object) -> set[str]:
    found: set[str] = set()
    if isinstance(value, dict):
        item_type = value.get("@type")
        if isinstance(item_type, str):
            found.add(item_type)
        elif isinstance(item_type, list):
            found.update(item for item in item_type if isinstance(item, str))
        for child in value.values():
            found.update(flattened_types(child))
    elif isinstance(value, list):
        for child in value:
            found.update(flattened_types(child))
    return found


def validate() -> list[str]:
    errors: list[str] = []

    facts_html, facts_parser, facts_payloads = load_page(FACTS_PAGE)
    facts_types = set().union(*(flattened_types(payload) for payload in facts_payloads))
    if facts_parser.h1_count != 1:
        errors.append(f"company facts page has {facts_parser.h1_count} H1 elements")
    for required_type in ("AboutPage", "GeneralContractor", "WebSite", "FAQPage"):
        if required_type not in facts_types:
            errors.append(f"company facts schema is missing {required_type}")
    for value in (BUSINESS_ID, FACTS_URL, "All Pro Construction & Landscape, LLC", "+1-618-581-0676"):
        if value not in facts_html:
            errors.append(f"company facts page is missing {value}")
    for profile in REQUIRED_PROFILES:
        if profile not in facts_html:
            errors.append(f"company facts page is missing profile {profile}")
    for page in PRIORITY_PAGES:
        if page not in facts_html:
            errors.append(f"company facts page is missing priority link {page}")
    if re.search(r"994\s*31\s*4644", facts_html):
        errors.append("company facts page exposes the private tax identifier")

    homepage, _, homepage_payloads = load_page(ROOT / "index.html")
    if FACTS_LINK not in homepage:
        errors.append("homepage does not link to the company facts page")
    if "GeneralContractor" not in set().union(
        *(flattened_types(payload) for payload in homepage_payloads)
    ):
        errors.append("homepage schema is missing GeneralContractor")
    for profile in REQUIRED_PROFILES:
        if profile not in homepage:
            errors.append(f"homepage entity schema is missing profile {profile}")

    for relative in PRIORITY_PAGES:
        html, parser, payloads = load_page(ROOT / relative)
        types = set().union(*(flattened_types(payload) for payload in payloads))
        if parser.h1_count != 1:
            errors.append(f"{relative} has {parser.h1_count} H1 elements")
        for required_type in ("GeneralContractor", "Service", "WebPage"):
            if required_type not in types:
                errors.append(f"{relative} schema is missing {required_type}")
        for value in (BUSINESS_ID, FACTS_LINK, '"dateModified": "2026-08-06"'):
            if value not in html:
                errors.append(f"{relative} is missing {value}")

    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    for crawler in REQUIRED_CRAWLERS:
        if crawler not in robots:
            errors.append(f"robots.txt is missing {crawler}")

    llms = (ROOT / "llms.txt").read_text(encoding="utf-8")
    for value in ("Last fact review: 2026-08-06", FACTS_URL):
        if value not in llms:
            errors.append(f"llms.txt is missing {value}")

    return errors


def main() -> int:
    errors = validate()
    if errors:
        print("AI-search asset validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print(
        "AI-search assets validated: canonical entity page, nine public profiles, "
        "four priority service pages, crawler policy, and llms.txt."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
