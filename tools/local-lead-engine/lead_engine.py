#!/usr/bin/env python3
"""Build a privacy-conscious queue of public local project opportunities."""

from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parent
DEFAULT_OUTPUT = ROOT / "output"
EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
PHONE_RE = re.compile(r"(?<!\d)(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}(?!\d)")
TAG_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")


@dataclass
class Opportunity:
    id: str
    captured_at: str
    published_at: str
    source: str
    source_url: str
    city: str
    service: str
    title: str
    summary: str
    service_area_status: str
    contact_method: str
    status: str
    score: int
    match_reason: str
    reply_draft: str
    representative: str
    representative_phone: str
    representative_email: str
    landing_url: str


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def clean_text(value: object, limit: int = 700) -> str:
    text = html.unescape(TAG_RE.sub(" ", str(value or "")))
    text = EMAIL_RE.sub("[email removed]", text)
    text = PHONE_RE.sub("[phone removed]", text)
    return SPACE_RE.sub(" ", text).strip()[:limit]


def parse_date(value: str) -> datetime | None:
    value = (value or "").strip()
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = parsedate_to_datetime(value)
        except (TypeError, ValueError):
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def classify_service(text: str, config: dict) -> tuple[str, list[str]]:
    haystack = text.lower()
    matches: list[tuple[str, int, list[str]]] = []
    for service, keywords in config["service_keywords"].items():
        found = [keyword for keyword in keywords if keyword.lower() in haystack]
        if found:
            matches.append((service, len(found), found))
    if not matches:
        return "Unclassified", []
    matches.sort(key=lambda item: (-item[1], item[0]))
    return matches[0][0], matches[0][2]


def classify_city(text: str, config: dict) -> str:
    haystack = text.lower()
    candidates = list(config.get("preferred_cities") or []) + list(config.get("service_area_terms") or [])
    for city in candidates:
        if city.lower() in haystack:
            return city
    return "Location not confirmed"


def has_intent(text: str, config: dict) -> list[str]:
    haystack = text.lower()
    return [phrase for phrase in config.get("intent_phrases") or [] if phrase.lower() in haystack]


def make_id(source_url: str, title: str) -> str:
    return hashlib.sha256((source_url.strip().lower() + "|" + title.strip().lower()).encode("utf-8")).hexdigest()[:16]


def score_record(record: dict, config: dict, captured: datetime) -> tuple[int, str]:
    score = 5
    reasons: list[str] = []
    city = record.get("city", "")
    service = record.get("service", "")
    if any(item.lower() in city.lower() for item in config.get("preferred_cities") or []):
        score += 30
        reasons.append("priority city")
    elif any(item.lower() in city.lower() for item in config.get("service_area_terms") or []):
        score += 15
        reasons.append("broader service area")
    else:
        reasons.append("location needs confirmation")
    if service in config.get("priority_services", []):
        score += 25
        reasons.append("priority service")
    elif service != "Unclassified":
        score += 15
        reasons.append("matched service")
    published = parse_date(record.get("published_at", ""))
    if published:
        age_days = max(0, (captured - published).days)
        if age_days <= 7:
            score += 25
            reasons.append("posted within 7 days")
        elif age_days <= 30:
            score += 15
            reasons.append("posted within 30 days")
        elif age_days <= config.get("max_age_days", 60):
            score += 5
            reasons.append("older but within review window")
        else:
            reasons.append("older than review window")
    intent = has_intent(record.get("title", "") + " " + record.get("summary", ""), config)
    if intent:
        score += min(15, 5 + len(intent) * 2)
        reasons.append("explicit homeowner intent")
    if len(record.get("summary", "")) >= 120:
        score += 5
        reasons.append("useful project detail")
    return min(score, 100), ", ".join(reasons)


def create_opportunity(raw: dict, config: dict, captured: datetime) -> Opportunity | None:
    source_url = str(raw.get("source_url", "")).strip()
    parsed_url = urllib.parse.urlparse(source_url)
    if parsed_url.scheme != "https" or not parsed_url.netloc:
        return None
    title = clean_text(raw.get("title"), 180)
    summary = clean_text(raw.get("summary"), 700)
    combined = title + " " + summary
    service = clean_text(raw.get("service"), 80)
    matched_terms: list[str] = []
    if not service:
        service, matched_terms = classify_service(combined, config)
    city = clean_text(raw.get("city"), 80) or classify_city(combined, config)
    if service == "Unclassified" or not has_intent(combined, config):
        return None
    published = parse_date(str(raw.get("published_at", "")))
    if not published:
        published = captured
    record = {
        "city": city,
        "service": service,
        "published_at": published.isoformat(),
        "title": title,
        "summary": summary,
    }
    score, reason = score_record(record, config, captured)
    if matched_terms:
        reason += ", matched: " + "/".join(matched_terms[:3])
    business = config["business_name"]
    representative = config.get("representative") or {}
    representative_name = clean_text(representative.get("name") or "All-Pro team", 100)
    # These values come from reviewed business configuration, not scraped content.
    representative_phone = str(representative.get("phone") or "").strip()[:40]
    representative_email = str(representative.get("email") or "").strip()[:120]
    landing_url = str(config.get("estimate_url") or config.get("website") or "").strip()
    reply = (
        f"Hi, this is {representative_name} with {business}. If you are still looking and the property is inside our service area, "
        f"we can review the project details and tell you whether it fits our schedule. Project page: {landing_url}"
    )
    return Opportunity(
        id=make_id(source_url, title),
        captured_at=captured.isoformat(),
        published_at=published.isoformat(),
        source=clean_text(raw.get("source") or parsed_url.netloc, 100),
        source_url=source_url,
        city=city,
        service=service,
        title=title,
        summary=summary,
        service_area_status=clean_text(raw.get("service_area_status") or "Confirm the address before replying", 180),
        contact_method="Reply on source",
        status="Needs human review",
        score=score,
        match_reason=reason,
        reply_draft=reply,
        representative=representative_name,
        representative_phone=representative_phone,
        representative_email=representative_email,
        landing_url=landing_url,
    )


def load_seed(path: Path | None) -> list[dict]:
    if not path:
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("Seed file must contain a JSON list")
    return [item for item in data if isinstance(item, dict)]


def rss_records(feed: dict, timeout: int = 15) -> list[dict]:
    url = feed["url"]
    request = urllib.request.Request(url, headers={"User-Agent": "AllProPublicOpportunityMonitor/1.0 (+https://allprometroeastconstruction.com/)"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        content = response.read(2_000_000)
    root = ET.fromstring(content)
    records: list[dict] = []
    items = root.findall(".//item")
    if items:
        for item in items:
            records.append({
                "source": feed.get("name") or urllib.parse.urlparse(url).netloc,
                "source_url": item.findtext("link", "").strip(),
                "published_at": item.findtext("pubDate", ""),
                "title": item.findtext("title", ""),
                "summary": item.findtext("description", ""),
            })
        return records
    atom = "{http://www.w3.org/2005/Atom}"
    for entry in root.findall(f".//{atom}entry"):
        link_element = entry.find(f"{atom}link")
        records.append({
            "source": feed.get("name") or urllib.parse.urlparse(url).netloc,
            "source_url": link_element.get("href", "") if link_element is not None else "",
            "published_at": entry.findtext(f"{atom}published", "") or entry.findtext(f"{atom}updated", ""),
            "title": entry.findtext(f"{atom}title", ""),
            "summary": entry.findtext(f"{atom}summary", "") or entry.findtext(f"{atom}content", ""),
        })
    return records


def nextdoor_records(config: dict, timeout: int = 20) -> list[dict]:
    nextdoor = config.get("nextdoor") or {}
    if not nextdoor.get("enabled"):
        return []
    token = os.getenv(nextdoor.get("token_env", "NEXTDOOR_ACCESS_TOKEN"), "").strip()
    if not token:
        return []
    endpoint = nextdoor["endpoint"]
    queries = sorted({keyword for terms in config["service_keywords"].values() for keyword in terms})
    records: list[dict] = []
    for center in nextdoor.get("centers") or []:
        for query in queries:
            params = urllib.parse.urlencode({"query": query, "lat": center["lat"], "lon": center["lon"], "radius": center["radius_miles"], "include_comments": "false"})
            request = urllib.request.Request(endpoint + "?" + params, headers={"Authorization": "Bearer " + token, "Accept": "application/json", "User-Agent": "AllProPublicOpportunityMonitor/1.0"})
            try:
                with urllib.request.urlopen(request, timeout=timeout) as response:
                    payload = json.load(response)
            except Exception as exc:  # keep one failed query from losing the rest of the scan
                print(f"Nextdoor query failed for {center['name']} / {query}: {exc}", file=sys.stderr)
                continue
            if isinstance(payload, list):
                posts = payload
            else:
                posts = payload.get("posts") or payload.get("results") or payload.get("data") or []
            for post in posts:
                records.append({
                    "source": "Nextdoor public content API",
                    "source_url": post.get("url") or post.get("embed_url") or "",
                    "published_at": datetime.fromtimestamp(post.get("creation_date_epoch_seconds", 0), tz=timezone.utc).isoformat() if post.get("creation_date_epoch_seconds") else "",
                    "city": center["name"] + " area",
                    "title": post.get("title") or query,
                    "summary": post.get("body") or post.get("description") or "",
                })
    return records


def dedupe(items: Iterable[Opportunity]) -> list[Opportunity]:
    by_id: dict[str, Opportunity] = {}
    for item in items:
        current = by_id.get(item.id)
        if current is None or item.score > current.score:
            by_id[item.id] = item
    return sorted(by_id.values(), key=lambda item: (-item.score, item.published_at, item.source_url))


def write_outputs(items: list[Opportunity], output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    rows = [asdict(item) for item in items]
    (output / "opportunities.json").write_text(json.dumps(rows, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    fields = list(asdict(items[0]).keys()) if items else list(Opportunity.__dataclass_fields__.keys())
    with (output / "opportunities.csv").open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    cards = "".join(
        f'''<article><div class="score">{item.score}</div><div><p class="meta">{html.escape(item.service)} · {html.escape(item.city)} · {html.escape(item.published_at[:10])}</p><h2>{html.escape(item.title)}</h2><p>{html.escape(item.summary)}</p><p class="status">{html.escape(item.service_area_status)}</p><p><strong>Assigned:</strong> {html.escape(item.representative)}{(" · " + html.escape(item.representative_phone)) if item.representative_phone else ""}</p><p><strong>Why matched:</strong> {html.escape(item.match_reason)}</p><a href="{html.escape(item.source_url, quote=True)}" target="_blank" rel="noopener noreferrer">Open original source</a></div></article>'''
        for item in items
    ) or "<p>No public opportunities met the configured service and intent rules.</p>"
    page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>All-Pro Public Opportunity Queue</title><style>*{{box-sizing:border-box}}body{{margin:0;background:#f7f3ea;color:#1f2933;font-family:system-ui,sans-serif;line-height:1.55}}main{{max-width:980px;margin:auto;padding:36px 18px 80px}}h1{{font-family:Georgia,serif;font-size:clamp(2rem,5vw,3.5rem);letter-spacing:0}}.notice{{background:#fff;border-left:5px solid #c96a26;padding:16px;margin:20px 0 30px}}article{{display:grid;grid-template-columns:64px 1fr;gap:18px;background:#fff;border:1px solid #d9dedb;border-radius:8px;padding:22px;margin:16px 0}}.score{{width:54px;height:54px;display:grid;place-items:center;border-radius:50%;background:#2f5d50;color:#fff;font-weight:900}}.meta{{color:#52606d;font-weight:700}}h2{{letter-spacing:0;line-height:1.2}}.status{{background:#f7f3ea;padding:9px 12px}}a{{color:#2f5d50;font-weight:800}}@media(max-width:560px){{article{{grid-template-columns:1fr}}}}</style></head><body><main><h1>Public Opportunity Queue</h1><div class="notice">These are public requests for human review, not confirmed leads. Open the source, verify it is current and in range, follow community rules, and identify yourself as All-Pro.</div>{cards}</main></body></html>'''
    (output / "index.html").write_text(page, encoding="utf-8")


def scan(config_path: Path, seed_path: Path | None, output: Path, no_network: bool = False) -> list[Opportunity]:
    config = json.loads(config_path.read_text(encoding="utf-8"))
    captured = now_utc()
    raw = load_seed(seed_path)
    if not no_network:
        for feed in config.get("rss_feeds") or []:
            if not feed.get("enabled", True):
                continue
            try:
                raw.extend(rss_records(feed))
            except Exception as exc:
                print(f"RSS feed failed for {feed.get('name', feed.get('url'))}: {exc}", file=sys.stderr)
        raw.extend(nextdoor_records(config))
    items = [item for item in (create_opportunity(record, config, captured) for record in raw) if item is not None]
    items = dedupe(items)
    write_outputs(items, output)
    return items


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    scan_parser = sub.add_parser("scan", help="Build the public opportunity queue")
    scan_parser.add_argument("--config", type=Path, default=ROOT / "config.json")
    scan_parser.add_argument("--seed", type=Path)
    scan_parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    scan_parser.add_argument("--no-network", action="store_true")
    args = parser.parse_args()
    if args.command == "scan":
        items = scan(args.config.resolve(), args.seed.resolve() if args.seed else None, args.output.resolve(), args.no_network)
        print(f"Wrote {len(items)} public opportunities to {args.output.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
