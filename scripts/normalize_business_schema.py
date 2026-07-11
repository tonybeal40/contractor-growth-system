#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BUSINESS_TYPES = {"LocalBusiness", "HomeAndConstructionBusiness", "GeneralContractor"}
ADDRESS = (
    '{"@type":"PostalAddress","streetAddress":"1115 Priscilla Ct",'
    '"addressLocality":"New Athens","addressRegion":"IL",'
    '"postalCode":"62264","addressCountry":"US"}'
)
SCRIPT_RE = re.compile(
    r'(<script[^>]*type=["\']application/ld\+json["\'][^>]*>)(.*?)(</script>)',
    re.I | re.S,
)
ADDRESS_RE = re.compile(
    r'("address"\s*:\s*)\{(?=[^{}]*"@type"\s*:\s*"PostalAddress")[^{}]*\}',
    re.I | re.S,
)


def has_all_pro_business(value: object) -> bool:
    if isinstance(value, list):
        return any(has_all_pro_business(item) for item in value)
    if not isinstance(value, dict):
        return False

    raw_type = value.get("@type", [])
    types = set(raw_type if isinstance(raw_type, list) else [raw_type])
    if types & BUSINESS_TYPES and "all-pro" in str(value.get("name", "")).lower():
        return True
    return any(has_all_pro_business(item) for item in value.values())


def normalize_script(match: re.Match[str]) -> str:
    opening, payload, closing = match.groups()
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        return match.group(0)
    if not has_all_pro_business(data):
        return match.group(0)

    updated, count = ADDRESS_RE.subn(rf'\1{ADDRESS}', payload)
    if count == 0:
        return match.group(0)
    return f"{opening}{updated}{closing}"


def main() -> None:
    updated_files: list[str] = []
    for path in sorted(ROOT.glob("*.html")):
        html = path.read_text(encoding="utf-8", errors="replace")
        normalized = SCRIPT_RE.sub(normalize_script, html)
        if normalized != html:
            path.write_text(normalized, encoding="utf-8")
            updated_files.append(path.name)
    print(f"Normalized All-Pro business schema in {len(updated_files)} pages.")


if __name__ == "__main__":
    main()
