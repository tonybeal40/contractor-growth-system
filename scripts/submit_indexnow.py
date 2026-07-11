#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
HOST = "allprometroeastconstruction.com"
SITE = f"https://{HOST}"
KEY_FILE = ROOT / "43e62d9ef6ce435a94594c0230c592a1.txt"
ENDPOINT = "https://api.indexnow.org/indexnow"
SHARED_ASSETS = {"styles.css", "brand-refresh.css", "site-shell.css", "script.js"}
PRIORITY_URLS = {
    f"{SITE}/",
    f"{SITE}/kitchen-remodel-belleville-il.html",
    f"{SITE}/bathroom-remodel-belleville-il.html",
    f"{SITE}/deck-builder-belleville-il.html",
    f"{SITE}/landscaping-ofallon-il.html",
    f"{SITE}/concrete-patio-cost-guide-metro-east.html",
    f"{SITE}/small-handyman-jobs-ofallon-il.html",
}


def sitemap_urls() -> set[str]:
    root = ET.parse(ROOT / "sitemap.xml").getroot()
    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    return {
        node.text.strip()
        for node in root.findall("sm:url/sm:loc", namespace)
        if node.text and urlparse(node.text.strip()).netloc == HOST
    }


def changed_files(base: str, head: str) -> list[str]:
    result = subprocess.run(
        ["git", "diff", "--name-only", base, head],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return [line.strip().replace("\\", "/") for line in result.stdout.splitlines() if line.strip()]


def changed_urls(files: list[str], available: set[str]) -> set[str]:
    urls: set[str] = set()
    for name in files:
        if name == "index.html":
            urls.add(f"{SITE}/")
        elif name.endswith(".html"):
            urls.add(f"{SITE}/{name}")
        elif Path(name).name in SHARED_ASSETS:
            urls.update(PRIORITY_URLS)
    return urls & available


def main() -> None:
    parser = argparse.ArgumentParser(description="Notify IndexNow about deployed All-Pro URLs.")
    parser.add_argument("--base")
    parser.add_argument("--head")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    available = sitemap_urls()
    if args.all:
        urls = available
    elif args.base and args.head and set(args.base) != {"0"}:
        urls = changed_urls(changed_files(args.base, args.head), available)
    else:
        urls = PRIORITY_URLS & available

    if not urls:
        print("No indexable changed URLs to submit.")
        return

    key = KEY_FILE.read_text(encoding="utf-8").strip()
    payload = {
        "host": HOST,
        "key": key,
        "keyLocation": f"{SITE}/{KEY_FILE.name}",
        "urlList": sorted(urls),
    }
    if args.dry_run:
        print(json.dumps(payload, indent=2))
        return

    request = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        print(f"IndexNow accepted {len(urls)} URLs (HTTP {response.status}).")


if __name__ == "__main__":
    main()
