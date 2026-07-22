#!/usr/bin/env python3
"""Remove marketplace promotion and internal-facing copy from public pages."""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
PLATFORM_RE = re.compile(r"(?:\bangi\b|home\s*advisor|homeadvisor)", re.IGNORECASE)
PLATFORM_ANCHOR_RE = re.compile(
    r"<a\b[^>]*href=[\"'][^\"']*(?:angi\.com|homeadvisor\.com)[^\"']*[\"'][^>]*>.*?</a>",
    re.IGNORECASE | re.DOTALL,
)
PLATFORM_URL_RE = re.compile(
    r"https?://(?:www\.)?(?:angi|homeadvisor)\.com/[^\"'\s<>)]+",
    re.IGNORECASE,
)


def public_pages() -> list[Path]:
    tree = ET.parse(ROOT / "sitemap.xml")
    pages: set[Path] = set()
    for node in tree.findall(".//sm:loc", SITEMAP_NS):
        if not node.text:
            continue
        url_path = urlparse(node.text).path
        relative = url_path.lstrip("/") or "index.html"
        if url_path.endswith("/") and relative != "index.html":
            relative = f"{relative.rstrip('/')}/index.html"
        path = ROOT / relative
        if path.suffix.lower() == ".html" and path.exists():
            pages.add(path)

    for extra in ("404.html", "review-card.html", "review.html", "thank-you.html"):
        path = ROOT / extra
        if path.exists():
            pages.add(path)
    return sorted(pages)


def review_href(path: Path) -> str:
    return "../reviews.html" if path.parent != ROOT else "reviews.html"


def clean_page(path: Path, text: str) -> str:
    replacement_link = f'<a href="{review_href(path)}">Customer Reviews</a>'
    text = PLATFORM_ANCHOR_RE.sub(replacement_link, text)
    text = PLATFORM_URL_RE.sub(
        "https://allprometroeastconstruction.com/reviews.html", text
    )
    text = re.sub(
        r"qr-(?:angi|homeadvisor)\.png", "qr-review.png", text, flags=re.IGNORECASE
    )

    precise_replacements = (
        (
            "4.5 out of 5 from 65 Angi reviews when checked July 15, 2026",
            "Customer feedback is available on the All-Pro reviews page",
        ),
        ("4.5 Stars · 65 Angi Reviews (checked July 2026)", "Local Customer Reviews"),
        ("4.5 &middot; 65 Reviews &middot; Angi (checked July 2026)", "Local Customer Reviews"),
        ("Free estimates listed on the current Angi profile", "Free estimates are available"),
        ("Free estimates listed on Angi", "Free estimates available"),
        ("Current BBB and Angi public records", "Current public business records"),
        ("current BBB and Angi records", "current public business records"),
        ("BBB and Angi records", "public business records"),
        ("Angi/HomeAdvisor", "Customer Reviews"),
        ("Angi &amp; HomeAdvisor", "Customer Reviews"),
        ("HomeAdvisor &amp; Angi", "Customer Reviews"),
        ("Angi and HomeAdvisor", "Customer Reviews"),
        ("HomeAdvisor and Angi", "Customer Reviews"),
        ("Home Advisor", "Customer Reviews"),
        ("HomeAdvisor", "All-Pro customer"),
        ("Angi", "customer reviews"),
    )
    for old, new in precise_replacements:
        text = text.replace(old, new)

    cleanup_replacements = (
        ("Public Reviews &middot; Customer Reviews", "Customer Reviews"),
        ("Public Reviews · Customer Reviews", "Customer Reviews"),
        ("Public Reviews: Customer Reviews", "Customer Reviews"),
        ("Public review profiles: Customer Reviews", "Customer Reviews"),
        ("Public reviews on Customer Reviews", "Customer Reviews"),
        ("public reviews on Customer Reviews", "customer reviews"),
        ("customer reviews reviews", "customer reviews"),
        ("Customer Reviews reviews", "Customer Reviews"),
        ("Source: customer reviews", "All-Pro customer"),
        ("Source: All-Pro customer", "All-Pro customer"),
        ("All-Pro customer reviews", "customer reviews"),
        ("public review profiles on Customer Reviews", "customer feedback from Metro East projects"),
        ("Public review profiles on Customer Reviews", "Customer feedback from Metro East projects"),
        ("Customer Reviews across Google and All-Pro customer", "Customer Reviews"),
        ("4.5 · 65 Reviews · customer reviews (checked July 2026)", "Local Customer Reviews"),
        ("a public review profile on All-Pro customer", "customer feedback"),
        ("All-Pro's All-Pro customer profile", "completed All-Pro projects"),
        ("All-Pro customer Rating", "Customer Feedback"),
        ("public review profiles on All-Pro customer", "Customer feedback from Metro East projects"),
        ("All-Pro customer Verified", "Customer Review"),
        ("Check Google, All-Pro customer, and customer reviews.", "Check public reviews and ask for recent local references."),
        ("Google, All-Pro customer, and customer reviews all show verified reviews.", "Public reviews and recent local references can help you compare contractors."),
    )
    for old, new in cleanup_replacements:
        text = text.replace(old, new)

    visible_replacements = (
        (
            "This first-party form captures service, city, source, page, and campaign data so the lead can be routed cleanly and followed up fast.",
            "Tell us what you need, where the project is located, and when you would like to begin. All-Pro will follow up about the next step.",
        ),
        (
            "Source tracked · page tracked · first-party form capture · owner-led follow-up",
            "Free estimate request · Photos welcome · Local follow-up",
        ),
        (
            "Repair pages support the &#x27;small projects welcome&#x27; positioning inside TonyOS.",
            "Small repair projects are welcome alongside larger construction work.",
        ),
        (
            "Handyman pages reinforce the &#x27;small projects welcome&#x27; message from TonyOS instead of burying those jobs.",
            "Small repairs and handyman projects are welcome, not treated as an afterthought.",
        ),
        (
            "The local service page feeds the same quote system as the rest of the site, which keeps routing clean.",
            "The same simple estimate process is available across every local service page.",
        ),
        (
            "The estimate path goes straight to first-party capture instead of sending people into someone else&#x27;s marketplace.",
            "The estimate request goes directly to the local All-Pro team.",
        ),
    )
    for old, new in visible_replacements:
        text = text.replace(old, new)
    text = text.replace(
        '<li><a href="linkedin-growth-system.html">LinkedIn Growth System →</a></li>',
        '<li><a href="reviews.html">Customer Reviews →</a></li>',
    )
    text = re.sub(
        r"documentation available on request", "Written Estimates", text, flags=re.IGNORECASE
    )
    text = re.sub(
        r"public review profiles?", "Customer Reviews", text, flags=re.IGNORECASE
    )
    text = text.replace("â€”", "&mdash;")
    text = re.sub(
        r"formsubmit-lead-tracking\.js\?v=\d{8}[a-z]",
        "formsubmit-lead-tracking.js?v=20260722a",
        text,
    )
    return text


def main() -> int:
    changed = 0
    pages = public_pages()
    for path in pages:
        original = path.read_text(encoding="utf-8")
        updated = clean_page(path, original)
        if updated != original:
            path.write_text(updated, encoding="utf-8", newline="")
            changed += 1

    remaining = []
    for path in pages:
        if PLATFORM_RE.search(path.read_text(encoding="utf-8", errors="ignore")):
            remaining.append(path.relative_to(ROOT).as_posix())

    if remaining:
        print("Platform references remain in public pages:")
        for name in remaining:
            print(f"- {name}")
        return 1

    print(f"Cleaned {changed} of {len(pages)} public HTML pages.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
