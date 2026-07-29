#!/usr/bin/env python3
from __future__ import annotations

import re
import subprocess
import xml.etree.ElementTree as ET
from datetime import date
from html import unescape
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parents[1]
SITE = "https://allprometroeastconstruction.com"
TODAY = date.today().isoformat()

EXCLUDED_PARTS = {
    ".git",
    ".github",
    ".vscode",
    "_site",
    ".firecrawl",
    "bill-docs-k7m2v9",
    "data",
    "demo-template",
    "leads-today",
    "lawnmex",
    "output",
    "outputs",
    "product",
    "server",
    "scripts",
    "sql",
    "test",
    "tmp",
    "tools",
    "workers",
}

EXCLUDED_FILES = {
    "404.html",
    "allpro-ads-replies-private-n8m4q1.html",
    "allpro-crm-private-a9k3r7.html",
    "allpro-email-outreach-private-r4h8.html",
    "allpro-leads-private-v7k9m2.html",
    "allpro-outreach-preview-b4s8w2.html",
    "branding-kit.html",
    "change-order-bj-floor.html",
    "googled8d60e1c6a2f88ee.html",
    "lawnmex-discovery-questions-m3t7k4.html",
    "lawnmex-news-kmov-jan2026.html",
    "lawnmex-news-kmov-nov2022.html",
    "lawnmex-news-kmov-winter-2022.html",
    "lawnmex-outreach-preview-m3t7k4.html",
    "lawnmex-pricing-m3t7k4.html",
    "linkedin-growth-system.html",
    "marketing-dashboard.html",
    "review-card.html",
    "unsubscribe-allpro-r4h8.html",
}

WEEKLY_KEYWORDS = (
    "index.html",
    "get-quote.html",
    "estimator.html",
    "metro-east-contractor-match.html",
    "metro-east-home-service-guide.html",
    "metro-east-pro-network.html",
    "work-with-all-pro.html",
    "construction-jobs-belleville-ofallon.html",
    "subcontractor-opportunities-metro-east.html",
    "bill-s-list-contractor-listing.html",
)

HIGH_VALUE_PATTERNS = (
    "belleville",
    "ofallon",
    "o'fallon",
    "deck-repair",
    "deck-builder",
    "fence",
    "handyman",
    "pressure-washing",
    "yard-cleanup",
    "landscaping",
    "bathroom-remodel",
    "kitchen-remodel",
)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def is_excluded(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    parts = set(rel.parts)
    if parts & EXCLUDED_PARTS:
        return True
    return path.name in EXCLUDED_FILES or "private" in path.name.lower()


def has_noindex(html: str) -> bool:
    return bool(re.search(r"""<meta\s+name=["']robots["'][^>]+noindex""", html, re.I))


def canonical_url(path: Path, html: str) -> str:
    match = re.search(r"""<link\s+rel=["']canonical["']\s+href=["'](.*?)["']""", html, re.I | re.S)
    if match:
        href = unescape(match.group(1).strip())
        parsed = urlparse(href)
        if parsed.netloc == "allprometroeastconstruction.com":
            return href
    rel = path.relative_to(ROOT).as_posix()
    if rel == "index.html":
        return SITE + "/"
    if rel == "blog/index.html":
        return SITE + "/blog/"
    return f"{SITE}/{rel}"


def git_last_modified_dates() -> dict[str, str]:
    """Return the newest committed date for each tracked path using one git call."""
    try:
        result = subprocess.run(
            [
                "git",
                "log",
                "--format=__ALLPRO_DATE__%cs",
                "--name-only",
                "--diff-filter=ACMRT",
                "--",
            ],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    except (OSError, subprocess.CalledProcessError):
        return {}

    dates: dict[str, str] = {}
    current_date = ""
    for raw_line in result.stdout.splitlines():
        line = raw_line.strip()
        if line.startswith("__ALLPRO_DATE__"):
            current_date = line.removeprefix("__ALLPRO_DATE__")
        elif line and current_date:
            dates.setdefault(line.replace("\\", "/"), current_date)
    return dates


def working_tree_paths() -> set[str]:
    """Treat meaningful uncommitted page changes as modified today for local builds."""
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain", "--untracked-files=all"],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    except (OSError, subprocess.CalledProcessError):
        return set()

    paths: set[str] = set()
    for raw_line in result.stdout.splitlines():
        value = raw_line[3:].strip() if len(raw_line) > 3 else ""
        if " -> " in value:
            value = value.rsplit(" -> ", 1)[-1]
        if value:
            paths.add(value.strip('"').replace("\\", "/"))
    return paths


def last_modified(path: Path, committed: dict[str, str], changed: set[str]) -> str:
    rel = path.relative_to(ROOT).as_posix()
    if rel in changed:
        return TODAY
    if rel in committed:
        return committed[rel]
    if path.exists():
        return date.fromtimestamp(path.stat().st_mtime).isoformat()
    return TODAY


def source_path_for_url(url: str) -> Path:
    parsed = urlparse(url)
    relative = unquote(parsed.path).lstrip("/")
    if not relative:
        relative = "index.html"
    elif relative.endswith("/"):
        relative += "index.html"
    return ROOT / relative


def priority_for(url: str) -> str:
    slug = url.rsplit("/", 1)[-1].lower()
    if url == SITE + "/":
        return "1.00"
    if slug in {"get-quote.html", "metro-east-contractor-match.html", "metro-east-pro-network.html"}:
        return "0.92"
    if any(term in slug for term in HIGH_VALUE_PATTERNS):
        return "0.82"
    if "/blog/" in url or "guide" in slug or "cost" in slug:
        return "0.72"
    return "0.64"


def changefreq_for(url: str) -> str:
    slug = url.rsplit("/", 1)[-1].lower()
    if slug in WEEKLY_KEYWORDS or url == SITE + "/":
        return "weekly"
    return "monthly"


def build_pages() -> dict[str, Path]:
    pages: dict[str, Path] = {}
    for path in sorted(ROOT.rglob("*.html")):
        if is_excluded(path):
            continue
        html = read_text(path)
        if has_noindex(html):
            continue
        url = canonical_url(path, html)
        parsed = urlparse(url)
        if parsed.netloc == "allprometroeastconstruction.com":
            pages.setdefault(url, path)
    return dict(sorted(pages.items(), key=lambda item: (item[0] != SITE + "/", item[0])))


def write_sitemap(
    pages: dict[str, Path], committed: dict[str, str], changed: set[str]
) -> None:
    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    for url, source in pages.items():
        node = ET.SubElement(urlset, "url")
        ET.SubElement(node, "loc").text = url
        ET.SubElement(node, "lastmod").text = last_modified(source, committed, changed)
        ET.SubElement(node, "changefreq").text = changefreq_for(url)
        ET.SubElement(node, "priority").text = priority_for(url)
    tree = ET.ElementTree(urlset)
    ET.indent(tree, space="  ", level=0)
    tree.write(ROOT / "sitemap.xml", encoding="utf-8", xml_declaration=True)


def refresh_local_sitemap(committed: dict[str, str], changed: set[str]) -> int:
    path = ROOT / "sitemap-local.xml"
    if not path.exists():
        return 0
    ET.register_namespace("", "http://www.sitemaps.org/schemas/sitemap/0.9")
    tree = ET.parse(path)
    namespace = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
    urls = tree.findall(f".//{namespace}url")
    for node in urls:
        location = node.find(f"{namespace}loc")
        modified = node.find(f"{namespace}lastmod")
        if location is None or not location.text:
            continue
        if modified is None:
            modified = ET.SubElement(node, "lastmod")
        modified.text = last_modified(
            source_path_for_url(location.text.strip()), committed, changed
        )
    ET.indent(tree, space="  ", level=0)
    tree.write(path, encoding="utf-8", xml_declaration=True)
    return len(urls)


def main() -> None:
    pages = build_pages()
    committed = git_last_modified_dates()
    changed = working_tree_paths()
    write_sitemap(pages, committed, changed)
    local_urls = refresh_local_sitemap(committed, changed)
    print(
        f"Wrote sitemap.xml with {len(pages)} URLs and accurate lastmod dates; "
        f"refreshed {local_urls} local sitemap URLs"
    )


if __name__ == "__main__":
    main()
