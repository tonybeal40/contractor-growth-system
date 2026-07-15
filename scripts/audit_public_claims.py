#!/usr/bin/env python3
from __future__ import annotations

import html
import json
import re
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable

from clean_public_claims import ADDRESS, BUSINESS_TYPES, ROOT, target_paths


IGNORED_TAGS = {"script", "style", "svg", "template"}
RATING_RE = re.compile(
    r"(?:\b4\.7\b.{0,60}(?:HomeAdvisor|Angi|stars?|reviews?)|"
    r"(?:40|105|200\+)\s+(?:verified\s+)?reviews?)",
    re.I,
)
TEXT_RULES = (
    (
        "awkward legacy wording",
        re.compile(
            r"(?:Metro East and Metro East|service dating to 2002|"
            r"service since 2002 (?:of|building|doing|serving)|"
            r"has served Metro East since 2002 and works on every|"
            r"All-Pro Construction (?:&|&amp;) Available scopes|"
            r"All-Pro handles all trades and permits|All-Pro manages all permit applications|"
            r"We carry full liability and workers(?:'| ) comp|"
            r"Are you documentation available|All-Pro is Current documentation|"
            r"We(?:'re| are) current documentation available|a public review profiles)",
            re.I,
        ),
    ),
    ("lowercase sentence start", re.compile(r"\. serving Metro East since 2002")),
    ("old start year", re.compile(r"\b(?:since|founded|established)(?:\s+in)?\s+2001\b", re.I)),
    ("stale 23-year claim", re.compile(r"\b23(?:\+\s*years|[- ]year(?:s)?)\b", re.I)),
    ("fixed service radius", re.compile(r"\b(?:50|60)[ -]mile\b", re.I)),
    (
        "owner-every-job claim",
        re.compile(
            r"(?:owner.{0,35}(?:on|at|handles|manages|reviews).{0,25}every (?:job|estimate|project)|"
            r"personally (?:handles|manages|reviews).{0,45}every (?:job|estimate|project)|"
            r"on site for every .{0,30}job)",
            re.I,
        ),
    ),
    ("no-subcontractor claim", re.compile(r"\b(?:no subcontract(?:or|ors|ing)|no subs|our own crew from start to finish)\b", re.I)),
    (
        "absolute permit-handling claim",
        re.compile(
            r"(?:Permits and inspections handled by All-Pro|"
            r"(?:All-Pro\s+(?:(?:determines? what is required|checks local requirements)\s+and\s+)?"
            r"(?:handles|pulls|manages)|We\s+(?:handle|pull|manage))\s+"
            r"(?:all\s+|every\s+|any needed\s+|the\s+)?(?:necessary\s+)?permits?)",
            re.I,
        ),
    ),
    (
        "uncorroborated workmanship promise",
        re.compile(r"(?:backed by a workmanship guarantee|full workmanship warranty|guaranteed workmanship)", re.I),
    ),
)
INSURANCE_RE = re.compile(
    r"(?:\blicensed\s*(?:,|and|&|&amp;)?\s*insured\b|"
    r"\binsured\s*(?:,|and|&|&amp;)?\s*licensed\b|"
    r"\bfull liability and workers comp(?:ensation)?\b)",
    re.I,
)
INSURANCE_CUES = re.compile(
    r"(?:ask|before|check|confirm|current|documentation|if|may|required|request|should|verify|whether)",
    re.I,
)


@dataclass(frozen=True)
class Finding:
    path: Path
    rule: str
    context: str


class PublicTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.public_strings: list[str] = []
        self.json_payloads: list[str] = []
        self._json_parts: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        self.stack.append(tag)
        attributes = {key.lower(): value or "" for key, value in attrs}
        if tag == "meta":
            key = (attributes.get("name") or attributes.get("property") or "").lower()
            if key in {"description", "og:description", "twitter:description"}:
                self.public_strings.append(attributes.get("content", ""))
        if tag == "script" and attributes.get("type", "").lower() == "application/ld+json":
            self._json_parts = []

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "script" and self._json_parts is not None:
            self.json_payloads.append("".join(self._json_parts))
            self._json_parts = None
        if tag in self.stack:
            while self.stack:
                current = self.stack.pop()
                if current == tag:
                    break

    def handle_data(self, data: str) -> None:
        if self._json_parts is not None:
            self._json_parts.append(data)
            return
        if not any(tag in IGNORED_TAGS for tag in self.stack):
            value = " ".join(data.split())
            if value:
                self.public_strings.append(value)


def json_values(value: object) -> Iterable[str]:
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from json_values(item)
    elif isinstance(value, dict):
        for item in value.values():
            yield from json_values(item)


def json_entities(value: object) -> Iterable[dict[str, object]]:
    if isinstance(value, dict):
        yield value
        for item in value.values():
            yield from json_entities(item)
    elif isinstance(value, list):
        for item in value:
            yield from json_entities(item)


def is_allpro_business(value: dict[str, object]) -> bool:
    raw_type = value.get("@type", [])
    types = set(raw_type if isinstance(raw_type, list) else [raw_type])
    name = str(value.get("name", "")).lower()
    entity_id = str(value.get("@id", "")).lower()
    return bool(types & BUSINESS_TYPES and ("all-pro" in name or "#business" in entity_id))


def short_context(value: str) -> str:
    value = " ".join(html.unescape(value).split())
    return value if len(value) <= 180 else f"{value[:177]}..."


def scan_text(path: Path, value: str) -> list[Finding]:
    findings: list[Finding] = []
    for rule, pattern in TEXT_RULES:
        if pattern.search(value):
            findings.append(Finding(path, rule, short_context(value)))
    if RATING_RE.search(value):
        findings.append(Finding(path, "stale review claim", short_context(value)))
    if INSURANCE_RE.search(value) and not INSURANCE_CUES.search(value):
        findings.append(Finding(path, "unverified licensing/insurance claim", short_context(value)))
    return findings


def audit_file(path: Path, source: str | None = None) -> list[Finding]:
    parser = PublicTextParser()
    parser.feed(source if source is not None else path.read_text(encoding="utf-8", errors="replace"))
    findings: list[Finding] = []
    for value in parser.public_strings:
        findings.extend(scan_text(path, value))

    for payload in parser.json_payloads:
        try:
            data = json.loads(payload)
        except json.JSONDecodeError as exc:
            findings.append(Finding(path, "invalid JSON-LD", str(exc)))
            continue
        for value in json_values(data):
            findings.extend(scan_text(path, value))
        for entity in json_entities(data):
            if not is_allpro_business(entity):
                continue
            if entity.get("foundingDate") != "2002":
                findings.append(Finding(path, "business foundingDate must be 2002", str(entity.get("foundingDate"))))
            if entity.get("address") != ADDRESS:
                findings.append(Finding(path, "business address is inconsistent", short_context(str(entity.get("address")))))
            if "aggregateRating" in entity:
                findings.append(Finding(path, "self-published aggregateRating", "Remove aggregateRating from first-party business schema."))
    return findings


def audit_generator(path: Path) -> list[Finding]:
    findings: list[Finding] = []
    text = path.read_text(encoding="utf-8", errors="replace")
    rules = (
        ("old generator start year", r"\b2001\b"),
        ("old generator experience claim", r"\b23\+?\s+years\b"),
        ("old generator rating claim", r"aggregateRating|\b4\.7\b|40 Reviews"),
        ("old generator owner claim", r"owner on every|personally (?:handles|manages|reviews)"),
        ("old generator crew claim", r"no subcontract|no subs|our own crew from start to finish"),
        ("old generator permit promise", r"(?:All-Pro|We)\s+(?:handles?|pulls|manages?)\s+(?:all\s+|any needed\s+|the\s+)?(?:necessary\s+)?permits?|Permits and inspections handled by All-Pro"),
        ("old generator hyphenated experience claim", r"\b23-year\b"),
        ("old generator radius", r"\b(?:50|60)[ -]mile\b"),
        ("old generator licensing claim", r"licensed.{0,25}insured|insured.{0,25}licensed"),
    )
    for rule, pattern in rules:
        match = re.search(pattern, text, re.I)
        if match:
            findings.append(Finding(path, rule, short_context(match.group(0))))
    return findings


def main() -> int:
    findings: list[Finding] = []
    for path in target_paths():
        findings.extend(audit_file(path))
    findings.extend(audit_generator(ROOT / "generate-city-pages.ps1"))

    unique = sorted(set(findings), key=lambda item: (item.path.as_posix(), item.rule, item.context))
    if unique:
        print(f"Public claim audit failed with {len(unique)} finding(s).")
        for finding in unique[:100]:
            rel = finding.path.relative_to(ROOT).as_posix()
            print(f"{rel}: {finding.rule}: {finding.context}")
        if len(unique) > 100:
            print(f"... and {len(unique) - 100} more")
        return 1
    print(f"Public claim audit passed for {len(target_paths())} public HTML files and the page generator.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
