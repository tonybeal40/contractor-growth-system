#!/usr/bin/env python3
"""Keep local SEO coverage focused on All-Pro's priority Metro East markets."""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

PRIORITY_CITIES = {
    "belleville",
    "collinsville",
    "edwardsville",
    "fairview-heights",
    "glen-carbon",
    "granite-city",
    "highland",
    "maryville",
    "ofallon",
    "shiloh",
    "swansea",
    "troy",
}

NON_PRIORITY_CITIES = {
    "alton",
    "bethalto",
    "breese",
    "cahokia-heights",
    "caseyville",
    "centralia",
    "columbia",
    "dupo",
    "east-st-louis",
    "freeburg",
    "godfrey",
    "jerseyville",
    "lebanon",
    "mascoutah",
    "millstadt",
    "nashville",
    "new-baden",
    "okawville",
    "red-bud",
    "scott-afb",
    "smithton",
    "sparta",
    "trenton",
    "waterloo",
    "wood-river",
}

KNOWN_CITIES = PRIORITY_CITIES | NON_PRIORITY_CITIES

# These older page families were published for nearly every town in the region.
# Keep the priority markets indexable and leave the rest available to visitors
# without asking search engines to treat every combination as a landing page.
LOCAL_SERVICE_PREFIXES = (
    "bathroom-remodel",
    "kitchen-remodel",
    "shower-remodel",
    "deck-builder",
    "decks",
    "fence-company",
    "fencing",
    "concrete",
    "patios",
    "remodeling",
    "sunroom",
    "tree-service",
    "mulch-rock",
    "landscape-cleanup",
    "lawn-maintenance",
)

MANAGED_ATTRIBUTE = 'data-indexing-policy="local-service-cluster"'
INDEX_META = (
    '<meta name="robots" content="index, follow, max-snippet:-1, '
    'max-image-preview:large, max-video-preview:-1" />'
)
NOINDEX_META = (
    '<meta name="robots" content="noindex, follow, max-image-preview:large" '
    f'{MANAGED_ATTRIBUTE} />'
)
ROBOTS_META_RE = re.compile(
    r'<meta\s+name=["\']robots["\'][^>]*>', re.IGNORECASE
)


def split_local_page(path: Path) -> tuple[str, str] | None:
    name = path.name
    for prefix in LOCAL_SERVICE_PREFIXES:
        marker = f"{prefix}-"
        if name.startswith(marker) and name.endswith("-il.html"):
            city = name[len(marker) : -len("-il.html")]
            if city in KNOWN_CITIES:
                return prefix, city
    return None


def preferred_modern_page(prefix: str, city: str) -> bool:
    """Return False when a clearer modern page already owns the same intent."""
    replacements = {
        "concrete": f"concrete-contractor-{city}-il.html",
        "decks": f"deck-builder-{city}-il.html",
        "fencing": f"fence-company-{city}-il.html",
        "fence-company": f"fence-contractor-{city}-il.html",
        "landscape-cleanup": f"yard-cleanup-{city}-il.html",
        "patios": f"patio-contractor-{city}-il.html",
    }
    replacement = replacements.get(prefix)
    return not replacement or not (ROOT / replacement).is_file()


def should_index(prefix: str, city: str) -> bool:
    return city in PRIORITY_CITIES and preferred_modern_page(prefix, city)


def update_page(path: Path, index: bool) -> bool:
    html = path.read_text(encoding="utf-8", errors="replace")
    match = ROBOTS_META_RE.search(html)
    desired = INDEX_META if index else NOINDEX_META

    if index and match and MANAGED_ATTRIBUTE not in match.group(0):
        return False
    if match:
        updated = html[: match.start()] + desired + html[match.end() :]
    else:
        head_end = html.lower().find("</head>")
        if head_end == -1:
            raise RuntimeError(f"Missing </head> in {path.name}")
        updated = html[:head_end] + desired + "\n" + html[head_end:]

    if updated == html:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def main() -> int:
    managed = 0
    changed = 0
    indexable = 0
    noindex = 0
    restored = 0

    for path in sorted(ROOT.glob("*.html")):
        local_page = split_local_page(path)
        if not local_page:
            continue
        prefix, city = local_page
        index = should_index(prefix, city)
        managed += 1
        indexable += int(index)
        noindex += int(not index)
        changed += int(update_page(path, index))

    for path in sorted(ROOT.glob("*.html")):
        html = path.read_text(encoding="utf-8", errors="replace")
        if MANAGED_ATTRIBUTE in html and split_local_page(path) is None:
            restored += 1
            changed += int(update_page(path, True))

    print(
        f"Local indexing policy: {managed} managed, {indexable} indexable, "
        f"{noindex} noindex, {restored} restored, {changed} files changed."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
