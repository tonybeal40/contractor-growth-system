#!/usr/bin/env python3
"""Build the GitHub Pages artifact from an explicit public allowlist."""

from __future__ import annotations

import re
import shutil
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = (ROOT / "_site").resolve()
SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
PUBLIC_ROOT_ASSET_SUFFIXES = {
    ".css",
    ".ico",
    ".jpeg",
    ".jpg",
    ".js",
    ".pdf",
    ".png",
    ".svg",
    ".webmanifest",
    ".webp",
    ".xml",
}
PUBLIC_TEXT_FILES = {
    "robots.txt",
    "llms.txt",
    "43e62d9ef6ce435a94594c0230c592a1.txt",
    "d572a4ce6cd84a499d4c761de6f83d80.txt",
}
PUBLIC_SPECIAL_FILES = {".nojekyll", "CNAME", "_headers", "_redirects"}
PUBLIC_EXTRA_HTML = {
    "404.html",
    "index.html",
    "review-card.html",
    "review.html",
    "thank-you.html",
    "unsubscribe-allpro-r4h8.html",
}
PUBLIC_DIRECTORIES = {".well-known", "downloads", "images"}
BLOCKED_FILENAMES = {
    "allpro-ads-replies-private-n8m4q1.html",
    "allpro-crm-private-a9k3r7.html",
    "allpro-email-outreach-private-r4h8.html",
    "allpro-leads-private-v7k9m2.html",
    "allpro-outreach-preview-b4s8w2.html",
    "marketing-dashboard.html",
}
BLOCKED_PUBLIC_TEXT = re.compile(
    r"(?:\bAngi\b|HomeAdvisor|Home Advisor|TonyOS|AllProOnly-|"
    r"LinkedIn Growth System|Documentation Available on Request|Public Review Profiles|"
    r"@tmomail\.net|@txt\.att\.net|@vtext\.com|@email\.uscc\.net)",
    re.IGNORECASE,
)
APPROVED_FORM_ROUTERS = {
    "formsubmit-lead-tracking.js?v=20260722a",
    "formsubmit-lead-tracking.js?v=20260723c",
}
LOCAL_REFERENCE_ATTRS = {
    "a": "href",
    "audio": "src",
    "iframe": "src",
    "img": "src",
    "link": "href",
    "script": "src",
    "source": "src",
    "video": "src",
}


class PublicPageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.references: list[str] = []
        self.script_sources: list[str] = []
        self.formsubmit_forms: list[dict[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {name.lower(): value or "" for name, value in attrs}
        attr_name = LOCAL_REFERENCE_ATTRS.get(tag.lower())
        if attr_name and values.get(attr_name):
            self.references.append(values[attr_name].strip())
        if tag.lower() == "script" and values.get("src"):
            self.script_sources.append(values["src"].strip())
        if tag.lower() == "form" and "formsubmit.co/" in values.get("action", ""):
            self.formsubmit_forms.append(values)


def sitemap_paths() -> set[Path]:
    tree = ET.parse(ROOT / "sitemap.xml")
    paths: set[Path] = set()
    for node in tree.findall(".//sm:loc", SITEMAP_NS):
        if not node.text:
            continue
        url_path = urlparse(node.text).path
        relative = url_path.lstrip("/") or "index.html"
        if url_path.endswith("/") and relative != "index.html":
            relative = f"{relative.rstrip('/')}/index.html"
        paths.add(Path(relative))
    return paths


def copy_file(relative: Path) -> None:
    source = ROOT / relative
    if not source.is_file():
        raise FileNotFoundError(f"Required public file is missing: {relative.as_posix()}")
    destination = OUTPUT / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def reset_output() -> None:
    if OUTPUT.parent != ROOT.resolve() or OUTPUT.name != "_site":
        raise RuntimeError(f"Refusing to reset unexpected output path: {OUTPUT}")
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir(parents=True)


def build() -> tuple[set[Path], int]:
    reset_output()
    indexed = sitemap_paths()
    html_files = {path for path in indexed if path.suffix.lower() == ".html"}
    html_files.update(Path(name) for name in PUBLIC_EXTRA_HTML)
    html_files.update(path.relative_to(ROOT) for path in (ROOT / "blog").glob("*.html"))

    for relative in sorted(html_files):
        copy_file(relative)

    for source in ROOT.iterdir():
        if not source.is_file() or source.name in {"qr-angi.png", "qr-homeadvisor.png"}:
            continue
        if source.suffix.lower() in PUBLIC_ROOT_ASSET_SUFFIXES:
            copy_file(Path(source.name))
        elif source.name in PUBLIC_TEXT_FILES or source.name in PUBLIC_SPECIAL_FILES:
            copy_file(Path(source.name))

    for directory in PUBLIC_DIRECTORIES:
        source = ROOT / directory
        if not source.exists():
            continue
        shutil.copytree(source, OUTPUT / directory, dirs_exist_ok=True)

    return indexed, sum(1 for path in OUTPUT.rglob("*") if path.is_file())


def validate(indexed: set[Path]) -> None:
    missing = [path.as_posix() for path in sorted(indexed) if not (OUTPUT / path).is_file()]
    if missing:
        raise RuntimeError("Sitemap files missing from artifact:\n" + "\n".join(missing))

    leaked = [name for name in BLOCKED_FILENAMES if (OUTPUT / name).exists()]
    if leaked:
        raise RuntimeError("Private files leaked into artifact: " + ", ".join(sorted(leaked)))

    forbidden_dirs = [".firecrawl", "scripts", "workers", "tmp", "leads-today", "product", "tools"]
    leaked_dirs = [name for name in forbidden_dirs if (OUTPUT / name).exists()]
    if leaked_dirs:
        raise RuntimeError("Internal directories leaked into artifact: " + ", ".join(leaked_dirs))

    findings: list[str] = []
    for path in OUTPUT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in {".html", ".js", ".txt"}:
            continue
        if BLOCKED_PUBLIC_TEXT.search(path.read_text(encoding="utf-8", errors="ignore")):
            findings.append(path.relative_to(OUTPUT).as_posix())
    if findings:
        raise RuntimeError("Internal/platform wording remains in artifact:\n" + "\n".join(findings))

    broken_references: list[str] = []
    form_errors: list[str] = []
    mobile_errors: list[str] = []
    tracking_errors: list[str] = []
    for path in OUTPUT.rglob("*.html"):
        parser = PublicPageParser()
        html = path.read_text(encoding="utf-8", errors="ignore")
        parser.feed(html)
        relative_page = path.relative_to(OUTPUT).as_posix()

        if not re.search(r'<meta\s+name=["\']viewport["\']', html, re.IGNORECASE):
            mobile_errors.append(f"{relative_page}: missing viewport metadata")
        if path.relative_to(OUTPUT) in indexed:
            uses_delayed_analytics = "analytics-loader.js" in html
            if "G-35DEM1MGDT" not in html and not uses_delayed_analytics:
                tracking_errors.append(f"{relative_page}: missing Google Analytics")
            if "weti9tqt5q" not in html and not uses_delayed_analytics:
                tracking_errors.append(f"{relative_page}: missing Microsoft Clarity")

        if parser.formsubmit_forms and not any(
            router in source
            for source in parser.script_sources
            for router in APPROVED_FORM_ROUTERS
        ):
            form_errors.append(f"{relative_page}: missing current form router")
        for form in parser.formsubmit_forms:
            if form.get("method", "get").lower() != "post":
                form_errors.append(f"{relative_page}: FormSubmit form must use POST")
            if not form.get("data-form"):
                form_errors.append(f"{relative_page}: FormSubmit form needs a data-form label")

        for raw in parser.references:
            if not raw or raw.startswith((
                "#", "//", "data:", "http://", "https://", "javascript:",
                "mailto:", "sms:", "tel:", "${",
            )):
                continue
            parsed = urlparse(raw)
            local_path = unquote(parsed.path)
            if not local_path:
                continue
            target = OUTPUT / local_path.lstrip("/") if local_path.startswith("/") else path.parent / local_path
            candidates = [target]
            if not target.suffix:
                candidates.extend((target.with_suffix(".html"), target / "index.html"))
            try:
                valid = any(
                    candidate.resolve().is_relative_to(OUTPUT) and candidate.resolve().is_file()
                    for candidate in candidates
                )
            except (OSError, ValueError):
                valid = False
            if not valid:
                broken_references.append(f"{relative_page}: {raw}")

    if form_errors:
        raise RuntimeError("Public form validation failed:\n" + "\n".join(form_errors))
    if mobile_errors:
        raise RuntimeError("Public mobile validation failed:\n" + "\n".join(mobile_errors))
    if tracking_errors:
        raise RuntimeError("Public analytics validation failed:\n" + "\n".join(tracking_errors))
    if broken_references:
        raise RuntimeError("Broken local references remain:\n" + "\n".join(broken_references))


def main() -> int:
    indexed, file_count = build()
    validate(indexed)
    print(f"Built {file_count} public files in {OUTPUT.name}; {len(indexed)} sitemap URLs verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
