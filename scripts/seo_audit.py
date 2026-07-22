#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import posixpath
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from dataclasses import dataclass, asdict
from html import unescape
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
SITE = "https://allprometroeastconstruction.com"
SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

PRIVATE_PATTERNS = (
    ".firecrawl/",
    "private",
    "unsubscribe",
    "branding-kit",
    "review-card",
    "change-order",
    "marketing-dashboard",
    "linkedin-growth-system",
    "lawnmex-",
    "lawnmex/",
    "bill-docs-k7m2v9/",
    "demo-template/",
    "output/",
    "outputs/",
    "tmp/",
    "404.html",
    "googled8d60e1c6a2f88ee.html",
)

CRAWLABLE_EXTENSIONS = {".html"}


@dataclass
class PageAudit:
    path: str
    title: str
    description: str
    canonical: str
    h1_count: int
    jsonld_blocks: int
    jsonld_errors: int
    image_count: int
    missing_alt: int
    internal_links: int
    broken_internal_links: list[str]
    inlinks: int
    in_sitemap: bool
    noindex: bool
    private: bool
    score: int
    issues: list[str]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def match_one(pattern: str, text: str) -> str:
    match = re.search(pattern, text, re.I | re.S)
    return unescape(match.group(1).strip()) if match else ""


def strip_domain(href: str) -> str:
    try:
        parsed = urlparse(href)
    except ValueError:
        return ""
    if parsed.netloc and parsed.netloc != "allprometroeastconstruction.com":
        return ""
    path = parsed.path.lstrip("/")
    if not path:
        return "index.html"
    return path


def is_private(path: str) -> bool:
    lowered = path.lower()
    return any(pattern in lowered for pattern in PRIVATE_PATTERNS)


def sitemap_urls(root: Path) -> set[str]:
    urls: set[str] = set()
    for sitemap in ("sitemap.xml", "sitemap-local.xml"):
        path = root / sitemap
        if not path.exists():
            continue
        tree = ET.parse(path)
        for loc in tree.findall(".//sm:loc", SITEMAP_NS):
            if loc.text:
                local = strip_domain(loc.text.strip())
                if local:
                    urls.add(local)
    return urls


def extract_internal_links(html: str, base_path: str) -> list[str]:
    links: list[str] = []
    base_dir = posixpath.dirname(base_path)
    for match in re.finditer(r"""href=["']([^"']+)["']""", html, re.I):
        href = match.group(1).split("#", 1)[0].strip()
        if not href or href.startswith(("mailto:", "tel:", "javascript:")):
            continue
        local = strip_domain(href)
        if local and Path(local).suffix in CRAWLABLE_EXTENSIONS:
            if not href.startswith("/") and not urlparse(href).netloc:
                local = posixpath.normpath(posixpath.join(base_dir, local))
            links.append(local.replace("\\", "/"))
    return links


def validate_jsonld(html: str) -> tuple[int, int]:
    blocks = re.findall(
        r"""<script[^>]+type=["']application/ld\+json["'][^>]*>(.*?)</script>""",
        html,
        re.I | re.S,
    )
    errors = 0
    for block in blocks:
        try:
            json.loads(unescape(block).strip())
        except json.JSONDecodeError:
            errors += 1
    return len(blocks), errors


def score_page(page: dict[str, object], issues: list[str]) -> int:
    score = 100
    penalties = {
        "missing_title": 18,
        "long_title": 5,
        "missing_description": 15,
        "weak_description": 5,
        "bad_h1_count": 12,
        "missing_canonical": 14,
        "missing_jsonld": 8,
        "invalid_jsonld": 15,
        "missing_sitemap": 8,
        "broken_internal_links": 10,
        "thin_internal_links": 5,
        "orphan": 8,
        "missing_alt": 5,
    }
    for issue in issues:
        score -= penalties.get(issue, 4)
    return max(score, 0)


def audit(root: Path) -> tuple[list[PageAudit], dict[str, object]]:
    pages = sorted(root.glob("**/*.html"))
    pages = [p for p in pages if ".git" not in p.parts]
    existing = {p.relative_to(root).as_posix() for p in pages}
    sitemap = sitemap_urls(root)

    outbound: dict[str, list[str]] = {}
    inbound: Counter[str] = Counter()
    raw: dict[str, dict[str, object]] = {}

    for page in pages:
        rel = page.relative_to(root).as_posix()
        html = read_text(page)
        links = extract_internal_links(html, rel)
        outbound[rel] = links
        for link in links:
            inbound[link] += 1

        title = match_one(r"<title>(.*?)</title>", html)
        description = match_one(
            r"""<meta\s+name=["']description["']\s+content=["'](.*?)["']""", html
        )
        canonical = match_one(
            r"""<link\s+rel=["']canonical["']\s+href=["'](.*?)["']""", html
        )
        sitemap_key = strip_domain(canonical) if canonical else rel
        h1_count = len(re.findall(r"<h1\b", html, re.I))
        jsonld_blocks, jsonld_errors = validate_jsonld(html)
        image_count = len(re.findall(r"<img\b", html, re.I))
        missing_alt = len(re.findall(r"<img\b(?![^>]*\salt=)", html, re.I))
        noindex = bool(re.search(r"""<meta\s+name=["']robots["'][^>]+noindex""", html, re.I))

        raw[rel] = {
            "title": title,
            "description": description,
            "canonical": canonical,
            "sitemap_key": sitemap_key,
            "h1_count": h1_count,
            "jsonld_blocks": jsonld_blocks,
            "jsonld_errors": jsonld_errors,
            "image_count": image_count,
            "missing_alt": missing_alt,
            "noindex": noindex,
            "private": is_private(rel),
            "internal_links": len(links),
            "broken_internal_links": sorted({link for link in links if link not in existing}),
        }

    audits: list[PageAudit] = []
    issue_counts: Counter[str] = Counter()
    for rel, data in raw.items():
        private = bool(data["private"])
        noindex = bool(data["noindex"])
        indexable = not private and not noindex
        issues: list[str] = []

        title = str(data["title"])
        description = str(data["description"])
        if indexable and not title:
            issues.append("missing_title")
        if indexable and len(title) > 70:
            issues.append("long_title")
        if indexable and not description:
            issues.append("missing_description")
        if indexable and description and len(description) < 90:
            issues.append("weak_description")
        if indexable and int(data["h1_count"]) != 1:
            issues.append("bad_h1_count")
        if indexable and not data["canonical"]:
            issues.append("missing_canonical")
        if indexable and int(data["jsonld_blocks"]) == 0:
            issues.append("missing_jsonld")
        if indexable and int(data["jsonld_errors"]) > 0:
            issues.append("invalid_jsonld")
        sitemap_key = str(data["sitemap_key"])
        if indexable and sitemap_key not in sitemap:
            issues.append("missing_sitemap")
        if indexable and data["broken_internal_links"]:
            issues.append("broken_internal_links")
        if indexable and int(data["internal_links"]) < 5:
            issues.append("thin_internal_links")
        if indexable and inbound[rel] == 0 and rel != "index.html":
            issues.append("orphan")
        if indexable and int(data["missing_alt"]) > 0:
            issues.append("missing_alt")

        issue_counts.update(issues)
        score = score_page(data, issues)
        audits.append(
            PageAudit(
                path=rel,
                title=title,
                description=description,
                canonical=str(data["canonical"]),
                h1_count=int(data["h1_count"]),
                jsonld_blocks=int(data["jsonld_blocks"]),
                jsonld_errors=int(data["jsonld_errors"]),
                image_count=int(data["image_count"]),
                missing_alt=int(data["missing_alt"]),
                internal_links=int(data["internal_links"]),
                broken_internal_links=list(data["broken_internal_links"]),
                inlinks=inbound[rel],
                in_sitemap=sitemap_key in sitemap,
                noindex=noindex,
                private=private,
                score=score,
                issues=issues,
            )
        )

    indexable_pages = [page for page in audits if not page.private and not page.noindex]
    summary = {
        "site": SITE,
        "html_pages": len(audits),
        "indexable_pages": len(indexable_pages),
        "average_score": round(sum(p.score for p in indexable_pages) / max(len(indexable_pages), 1), 1),
        "issue_counts": dict(issue_counts.most_common()),
        "critical_pages": [p.path for p in sorted(indexable_pages, key=lambda p: p.score)[:20]],
    }
    return sorted(audits, key=lambda p: (p.score, p.path)), summary


def write_markdown(path: Path, audits: list[PageAudit], summary: dict[str, object]) -> None:
    issue_counts = summary["issue_counts"]
    lines = [
        "# All-Pro SEO Engine Audit",
        "",
        f"Site: {summary['site']}",
        f"HTML pages scanned: {summary['html_pages']}",
        f"Indexable pages scored: {summary['indexable_pages']}",
        f"Average indexable score: {summary['average_score']}/100",
        "",
        "## Issue Counts",
        "",
    ]
    if issue_counts:
        for issue, count in issue_counts.items():
            lines.append(f"- {issue}: {count}")
    else:
        lines.append("- No indexable-page issues found.")

    lines.extend(["", "## Lowest-Scoring Indexable Pages", ""])
    for page in [p for p in audits if not p.private and not p.noindex][:40]:
        issue_text = ", ".join(page.issues) if page.issues else "clean"
        lines.append(f"- {page.score}/100 `{page.path}`: {issue_text}")

    lines.extend(
        [
            "",
            "## Operating Rules",
            "",
            "- Every indexable page should have one title, one meta description, one H1, a self-canonical, valid JSON-LD, and sitemap coverage.",
            "- Every money page should have visible local proof: completed job detail, city context, review language, owner note, and related service links.",
            "- Pages with low inlinks need hub links before publishing, otherwise they are effectively hidden from crawlers and customers.",
            "- Private tools and client previews should stay `noindex` and out of navigation.",
        ]
    )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit All-Pro local SEO pages.")
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--json", type=Path, default=None, help="Optional JSON report path.")
    parser.add_argument("--markdown", type=Path, default=None, help="Optional Markdown report path.")
    parser.add_argument("--fail-under", type=int, default=80, help="Fail if average score is below this.")
    args = parser.parse_args()

    audits, summary = audit(args.root)

    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(
            json.dumps(
                {"summary": summary, "pages": [asdict(page) for page in audits]},
                indent=2,
                ensure_ascii=False,
            )
            + "\n",
            encoding="utf-8",
        )
    if args.markdown:
        args.markdown.parent.mkdir(parents=True, exist_ok=True)
        write_markdown(args.markdown, audits, summary)

    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 1 if float(summary["average_score"]) < args.fail_under else 0


if __name__ == "__main__":
    sys.exit(main())
