#!/usr/bin/env python3
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from datetime import date
from html import unescape
from pathlib import Path
from urllib.parse import urlparse


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


def build_urls() -> list[str]:
    urls: set[str] = set()
    for path in sorted(ROOT.rglob("*.html")):
        if is_excluded(path):
            continue
        html = read_text(path)
        if has_noindex(html):
            continue
        url = canonical_url(path, html)
        parsed = urlparse(url)
        if parsed.netloc == "allprometroeastconstruction.com":
            urls.add(url)
    return sorted(urls, key=lambda item: (item != SITE + "/", item))


def write_sitemap(urls: list[str]) -> None:
    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    for url in urls:
        node = ET.SubElement(urlset, "url")
        ET.SubElement(node, "loc").text = url
        ET.SubElement(node, "lastmod").text = TODAY
        ET.SubElement(node, "changefreq").text = changefreq_for(url)
        ET.SubElement(node, "priority").text = priority_for(url)
    tree = ET.ElementTree(urlset)
    ET.indent(tree, space="  ", level=0)
    tree.write(ROOT / "sitemap.xml", encoding="utf-8", xml_declaration=True)


def refresh_local_sitemap() -> int:
    path = ROOT / "sitemap-local.xml"
    if not path.exists():
        return 0
    ET.register_namespace("", "http://www.sitemaps.org/schemas/sitemap/0.9")
    tree = ET.parse(path)
    nodes = tree.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}lastmod")
    for node in nodes:
        node.text = TODAY
    ET.indent(tree, space="  ", level=0)
    tree.write(path, encoding="utf-8", xml_declaration=True)
    return len(nodes)


def main() -> None:
    urls = build_urls()
    write_sitemap(urls)
    local_urls = refresh_local_sitemap()
    print(f"Wrote sitemap.xml with {len(urls)} URLs; refreshed {local_urls} local sitemap URLs")


if __name__ == "__main__":
    main()
