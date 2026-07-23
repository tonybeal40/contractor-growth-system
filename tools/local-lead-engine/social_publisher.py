#!/usr/bin/env python3
"""Render or publish approved posts to business-owned social profiles."""

from __future__ import annotations

import argparse
import csv
import html
import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PLATFORMS = ("facebook", "google-business-profile", "nextdoor", "yelp")


def tracked_url(url: str, platform: str, campaign_id: str) -> str:
    parsed = urllib.parse.urlsplit(url)
    query = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    query.extend([
        ("utm_source", platform),
        ("utm_medium", "organic-social"),
        ("utm_campaign", "local-demand-2026"),
        ("utm_content", campaign_id),
    ])
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urllib.parse.urlencode(query), parsed.fragment))


def render_queue(campaigns: list[dict]) -> list[dict]:
    queue: list[dict] = []
    for campaign in campaigns:
        for platform in PLATFORMS:
            url = tracked_url(campaign["landing_url"], platform, campaign["id"])
            message = campaign["message"]
            if platform in ("facebook", "nextdoor"):
                message = message + "\n\n" + url
            queue.append({
                "id": f"{campaign['id']}--{platform}",
                "campaign_id": campaign["id"],
                "platform": platform,
                "title": campaign["title"],
                "city": campaign["city"],
                "service": campaign["service"],
                "message": message,
                "landing_url": url,
                "image_url": campaign.get("image_url", ""),
                "proof_note": campaign.get("proof_note", ""),
                "status": "Needs approval",
            })
    return queue


def write_queue(queue: list[dict], output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    (output / "social-post-queue.json").write_text(json.dumps(queue, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    with (output / "social-post-queue.csv").open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(queue[0].keys()) if queue else [])
        if queue:
            writer.writeheader()
            writer.writerows(queue)
    cards = "".join(
        f'''<article><p class="meta">{html.escape(item['platform'])} · {html.escape(item['city'])} · {html.escape(item['service'])}</p><h2>{html.escape(item['title'])}</h2><pre>{html.escape(item['message'])}</pre><p><strong>Image/proof:</strong> {html.escape(item['proof_note'])}</p><p><strong>Status:</strong> {html.escape(item['status'])}</p></article>'''
        for item in queue
    )
    page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>All-Pro Social Post Queue</title><style>*{{box-sizing:border-box}}body{{margin:0;background:#f7f3ea;color:#1f2933;font-family:system-ui,sans-serif;line-height:1.55}}main{{max-width:980px;margin:auto;padding:36px 18px 80px}}h1{{font-family:Georgia,serif;font-size:clamp(2rem,5vw,3.5rem);letter-spacing:0}}.notice,article{{background:#fff;border:1px solid #d9dedb;border-radius:8px;padding:22px;margin:16px 0}}.notice{{border-left:5px solid #c96a26}}.meta{{color:#2f5d50;font-weight:800;text-transform:capitalize}}pre{{white-space:pre-wrap;font:inherit;background:#f7f3ea;padding:15px;border-radius:6px;overflow-wrap:anywhere}}</style></head><body><main><h1>Owned-Channel Post Queue</h1><div class="notice">Review every fact and image before publishing. API publishing requires OAuth and an explicit confirmation flag.</div>{cards}</main></body></html>'''
    (output / "social-post-queue.html").write_text(page, encoding="utf-8")


def request_json(url: str, *, token: str, payload: dict, form_encoded: bool = False) -> dict:
    if form_encoded:
        data = urllib.parse.urlencode(payload).encode("utf-8")
        content_type = "application/x-www-form-urlencoded"
    else:
        data = json.dumps(payload).encode("utf-8")
        content_type = "application/json"
    headers = {"Authorization": "Bearer " + token, "Content-Type": content_type, "Accept": "application/json", "User-Agent": "AllProOwnedChannelPublisher/1.0"}
    request = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def publish_payload(item: dict) -> tuple[str, dict, bool, str]:
    platform = item["platform"]
    if platform == "facebook":
        page_id = os.getenv("META_PAGE_ID", "").strip()
        version = os.getenv("META_GRAPH_VERSION", "v25.0").strip()
        if not page_id:
            raise RuntimeError("META_PAGE_ID is required")
        return f"https://graph.facebook.com/{version}/{page_id}/feed", {"message": item["message"], "link": item["landing_url"]}, True, "META_PAGE_ACCESS_TOKEN"
    if platform == "google-business-profile":
        account = os.getenv("GOOGLE_BUSINESS_ACCOUNT_ID", "").strip()
        location = os.getenv("GOOGLE_BUSINESS_LOCATION_ID", "").strip()
        if not account or not location:
            raise RuntimeError("GOOGLE_BUSINESS_ACCOUNT_ID and GOOGLE_BUSINESS_LOCATION_ID are required")
        payload = {"languageCode": "en-US", "summary": item["message"], "callToAction": {"actionType": "LEARN_MORE", "url": item["landing_url"]}, "topicType": "STANDARD"}
        if item.get("image_url"):
            payload["media"] = [{"mediaFormat": "PHOTO", "sourceUrl": item["image_url"]}]
        return f"https://mybusiness.googleapis.com/v4/accounts/{account}/locations/{location}/localPosts", payload, False, "GOOGLE_BUSINESS_ACCESS_TOKEN"
    if platform == "nextdoor":
        payload = {"body_text": item["message"], "smartlink_url": item["landing_url"]}
        profile = os.getenv("NEXTDOOR_SECURE_PROFILE_ID", "").strip()
        if profile:
            payload["secure_profile_id"] = profile
        if item.get("image_url"):
            payload["media_attachments"] = [item["image_url"]]
        return "https://nextdoor.com/external/api/partner/v1/post/create/", payload, False, "NEXTDOOR_ACCESS_TOKEN"
    raise RuntimeError("Yelp does not offer a general self-serve social-post API; publish this item manually in Yelp for Business")


def publish(item: dict, confirm: bool) -> dict:
    url, payload, form_encoded, token_env = publish_payload(item)
    if not confirm:
        return {"dry_run": True, "platform": item["platform"], "url": url, "payload": payload, "token_env": token_env}
    token = os.getenv(token_env, "").strip()
    if not token:
        raise RuntimeError(f"{token_env} is required for publishing")
    result = request_json(url, token=token, payload=payload, form_encoded=form_encoded)
    return {"dry_run": False, "platform": item["platform"], "published_at": datetime.now(timezone.utc).isoformat(), "result": result}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    render = sub.add_parser("render", help="Create platform-ready copy without publishing")
    render.add_argument("--campaigns", type=Path, default=ROOT / "campaigns.json")
    render.add_argument("--output", type=Path, default=ROOT / "output")
    publish_parser = sub.add_parser("publish", help="Dry-run or publish one approved queue item")
    publish_parser.add_argument("--queue", type=Path, default=ROOT / "output" / "social-post-queue.json")
    publish_parser.add_argument("--id", required=True)
    publish_parser.add_argument("--confirm-publish", action="store_true")
    args = parser.parse_args()
    if args.command == "render":
        campaigns = json.loads(args.campaigns.read_text(encoding="utf-8"))
        queue = render_queue(campaigns)
        write_queue(queue, args.output)
        print(f"Wrote {len(queue)} platform-ready posts to {args.output.resolve()}")
        return 0
    queue = json.loads(args.queue.read_text(encoding="utf-8"))
    item = next((candidate for candidate in queue if candidate["id"] == args.id), None)
    if item is None:
        parser.error(f"Queue item not found: {args.id}")
    if item.get("status") != "Approved" and args.confirm_publish:
        parser.error("Set the queue item's status to Approved before publishing")
    print(json.dumps(publish(item, args.confirm_publish), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
