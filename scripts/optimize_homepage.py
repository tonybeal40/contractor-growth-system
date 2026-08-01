#!/usr/bin/env python3
"""Remove superseded homepage sections while preserving lead and proof content."""

from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HOMEPAGE = ROOT / "index.html"

REMOVALS = (
    (
        '  <section class="estimate-banner pricing-anchors">',
        '<section class="photo-section bath-feature-section">',
    ),
    (
        '<section class="money-pages" id="belleville-projects">',
        '<section class="decision-engine" id="project-routes">',
    ),
    (
        '<section class="decision-engine" id="project-routes">',
        '<!-- FAST TRACK -->',
    ),
    (
        '<!-- FAST TRACK -->',
        '<!-- PROCESS -->',
    ),
    (
        '<!-- SERVICE AREA MAP -->',
        '<!-- HOMEOWNER GUIDES STRIP -->',
    ),
    (
        '<!-- HOMEOWNER GUIDES STRIP -->',
        '<!-- LEAD FORM -->',
    ),
)


def remove_between(html: str, start: str, end: str) -> str:
    start_at = html.find(start)
    if start_at == -1:
        return html
    end_at = html.find(end, start_at)
    if end_at == -1:
        raise RuntimeError(f"Homepage end marker not found: {end}")
    return html[:start_at] + end + html[end_at + len(end) :]


def main() -> int:
    html = HOMEPAGE.read_text(encoding="utf-8")
    original = html
    for start, end in REMOVALS:
        html = remove_between(html, start, end)

    if html != original:
        HOMEPAGE.write_text(html, encoding="utf-8")
        print("Removed superseded homepage sections.")
    else:
        print("Homepage already optimized.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
