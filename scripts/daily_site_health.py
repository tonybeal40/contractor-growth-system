#!/usr/bin/env python3
"""Run a small, dependency-free health audit against the live All-Pro site."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


DEFAULT_BASE_URL = "https://allprometroeastconstruction.com"
FORM_HANDLER_URL = (
    "https://script.google.com/macros/s/"
    "AKfycbwXlYCGiy_SCFsZE5lnujH3iKeslueXoTQ54DLFdt-UDvP7ldixk12-WG5owCgy9oLMIQ/exec"
)
CONCIERGE_HEALTH_PATH = "/api/lead-concierge/health"
EXPECTED_PHONE = "tel:6185810676"
EXPECTED_FORM_ACTION = "https://formsubmit.co/williamosessionallpro@gmail.com"
EXPECTED_FORM_HANDLER_RELEASE = "2026-07-23-hiring-resume-v1"
REQUIRED_FORM_HANDLER_CAPABILITIES = {
    "homeowner-leads",
    "applicant-resumes",
    "website-reviews",
    "openai-attribution",
}
CRAWLER_CHECK_PATH = "/kitchen-remodel-belleville-il.html"
SEARCH_CRAWLERS = (
    "Googlebot",
    "bingbot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "PerplexityBot",
    "Perplexity-User",
    "Claude-SearchBot",
    "Claude-User",
    "Applebot",
    "DuckAssistBot",
)
BLOCKED_TRAINING_CRAWLERS = ("GPTBot", "ClaudeBot")


@dataclass(frozen=True)
class PageSpec:
    path: str
    label: str
    needs_form: bool = False


PAGES = (
    PageSpec("/", "Homepage"),
    PageSpec("/get-quote.html", "Free estimate", True),
    PageSpec("/contact.html", "Contact", True),
    PageSpec("/kitchen-remodel-belleville-il.html", "Belleville kitchen", True),
    PageSpec("/bathroom-remodel-belleville-il.html", "Belleville bathroom", True),
    PageSpec("/kitchen-remodel-ofallon-il.html", "O'Fallon kitchen", True),
    PageSpec("/bathroom-remodel-ofallon-il.html", "O'Fallon bathroom", True),
    PageSpec("/reviews.html", "Reviews"),
    PageSpec("/review-request.html", "Website review form", True),
    PageSpec("/josh-barber-highland-il.html", "Josh Highland", True),
    PageSpec("/metro-east-contractor-match.html", "Metro East project match", True),
    PageSpec("/nextdoor.html", "Nextdoor estimate", True),
)


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title_parts: list[str] = []
        self.in_title = False
        self.h1_count = 0
        self.meta_description = ""
        self.canonical = ""
        self.form_actions: list[str] = []
        self.phone_links: list[str] = []
        self.images: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key.lower(): (value or "") for key, value in attrs}
        tag = tag.lower()
        if tag == "title":
            self.in_title = True
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "meta" and values.get("name", "").lower() == "description":
            self.meta_description = values.get("content", "").strip()
        elif tag == "link" and "canonical" in values.get("rel", "").lower().split():
            self.canonical = values.get("href", "").strip()
        elif tag == "form":
            self.form_actions.append(values.get("action", "").strip())
        elif tag == "a" and values.get("href", "").lower().startswith("tel:"):
            self.phone_links.append(values.get("href", "").lower())
        elif tag == "img":
            self.images.append((values.get("src", "").strip(), values.get("alt", "").strip()))

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)

    @property
    def title(self) -> str:
        return " ".join("".join(self.title_parts).split())


@dataclass
class CheckResult:
    label: str
    url: str
    status: str
    details: str


def fetch(
    url: str,
    timeout: int = 25,
    user_agent: str = "AllProDailyHealth/1.0 (+https://allprometroeastconstruction.com/)",
) -> tuple[int, str, str]:
    request = Request(
        url,
        headers={"User-Agent": user_agent},
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            charset = response.headers.get_content_charset() or "utf-8"
            body = response.read(5_000_000).decode(charset, errors="replace")
            return response.status, response.geturl(), body
    except HTTPError as error:
        body = error.read(100_000).decode("utf-8", errors="replace")
        return error.code, error.geturl(), body
    except (URLError, TimeoutError, OSError) as error:
        raise RuntimeError(f"request failed: {error}") from error


def live_page_result(base_url: str, spec: PageSpec) -> CheckResult:
    url = urljoin(base_url.rstrip("/") + "/", spec.path.lstrip("/"))
    problems: list[str] = []
    try:
        status, final_url, body = fetch(url)
    except RuntimeError as error:
        return CheckResult(spec.label, url, "FAIL", str(error))

    if status != 200:
        problems.append(f"HTTP {status}")
    parser = PageParser()
    parser.feed(body)
    if not parser.title:
        problems.append("missing title")
    if not parser.meta_description:
        problems.append("missing meta description")
    if parser.h1_count != 1:
        problems.append(f"expected one H1, found {parser.h1_count}")
    if not parser.canonical:
        problems.append("missing canonical")
    else:
        canonical = urlparse(urljoin(final_url, parser.canonical))
        if canonical.scheme != "https" or canonical.netloc != urlparse(base_url).netloc:
            problems.append("canonical is not on the HTTPS production domain")
    if EXPECTED_PHONE not in parser.phone_links:
        problems.append("missing primary phone link")
    if spec.needs_form:
        if not parser.form_actions:
            problems.append("missing form")
        elif EXPECTED_FORM_ACTION not in parser.form_actions:
            problems.append("form action does not use the approved FormSubmit route")
        if "formsubmit-lead-tracking.js" not in body:
            problems.append("missing lead routing script")
    empty_alt = sum(1 for source, alt in parser.images if source and not alt)
    if empty_alt:
        problems.append(f"{empty_alt} image(s) have empty alt text")

    details = (
        "; ".join(problems)
        if problems
        else f"HTTP 200; one H1; title, meta, canonical and phone route present"
    )
    return CheckResult(spec.label, final_url, "FAIL" if problems else "PASS", details)


def text_asset_result(base_url: str, path: str, required: Iterable[str]) -> CheckResult:
    url = urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))
    try:
        status, final_url, body = fetch(url)
    except RuntimeError as error:
        return CheckResult(path, url, "FAIL", str(error))
    missing = [value for value in required if value not in body]
    problems = ([] if status == 200 else [f"HTTP {status}"]) + [
        f"missing {value}" for value in missing
    ]
    return CheckResult(
        path,
        final_url,
        "FAIL" if problems else "PASS",
        "; ".join(problems) if problems else "HTTP 200; required production references present",
    )


def json_health_result(
    label: str,
    url: str,
    expected_service: str | None = None,
    expected_release: str | None = None,
    required_capabilities: set[str] | None = None,
    version_drift_is_warning: bool = False,
) -> CheckResult:
    try:
        status, final_url, body = fetch(url)
    except RuntimeError as error:
        return CheckResult(label, url, "FAIL", str(error))
    failures = [] if status == 200 else [f"HTTP {status}"]
    warnings: list[str] = []
    try:
        payload = json.loads(body)
        if payload.get("ok") is not True:
            failures.append("JSON did not report ok=true")
        if expected_service and payload.get("service") != expected_service:
            failures.append("unexpected service name")
        if expected_release and payload.get("release") != expected_release:
            (warnings if version_drift_is_warning else failures).append(
                f"stale deployment (expected release {expected_release}, "
                f"received {payload.get('release') or 'none'})"
            )
        if required_capabilities:
            capabilities = set(payload.get("capabilities") or [])
            missing = sorted(required_capabilities - capabilities)
            if missing:
                (warnings if version_drift_is_warning else failures).append(
                    "missing capabilities: " + ", ".join(missing)
                )
    except (json.JSONDecodeError, AttributeError):
        failures.append("response was not valid health JSON")
    status_label = "FAIL" if failures else "WARN" if warnings else "PASS"
    details = failures + warnings
    return CheckResult(
        label,
        final_url,
        status_label,
        "; ".join(details) if details else "HTTP 200; health JSON reports ok=true",
    )


def crawler_policy_result(base_url: str) -> CheckResult:
    url = urljoin(base_url.rstrip("/") + "/", CRAWLER_CHECK_PATH.lstrip("/"))
    problems: list[str] = []
    allowed = 0
    blocked = 0

    for user_agent in SEARCH_CRAWLERS:
        try:
            status, _, _ = fetch(url, user_agent=user_agent)
        except RuntimeError as error:
            problems.append(f"{user_agent}: {error}")
            continue
        if status != 200:
            problems.append(f"{user_agent}: HTTP {status}, expected 200")
        else:
            allowed += 1

    for user_agent in BLOCKED_TRAINING_CRAWLERS:
        try:
            status, _, _ = fetch(url, user_agent=user_agent)
        except RuntimeError as error:
            problems.append(f"{user_agent}: {error}")
            continue
        if status != 403:
            problems.append(f"{user_agent}: HTTP {status}, expected 403")
        else:
            blocked += 1

    details = (
        "; ".join(problems)
        if problems
        else f"{allowed} search/user crawlers allowed; {blocked} training crawlers blocked"
    )
    return CheckResult(
        "Search and AI crawler access",
        url,
        "FAIL" if problems else "PASS",
        details,
    )


def render_markdown(results: list[CheckResult]) -> str:
    failures = [result for result in results if result.status == "FAIL"]
    warnings = [result for result in results if result.status == "WARN"]
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    overall = "FAIL" if failures else "WARN" if warnings else "PASS"
    lines = [
        "# All-Pro Daily Site Health",
        "",
        f"Generated: {generated}",
        f"Result: {overall} ({len(results) - len(failures) - len(warnings)} passed, "
        f"{len(warnings)} warning, {len(failures)} failed)",
        "",
        "| Check | Status | Details |",
        "|---|---:|---|",
    ]
    for result in results:
        details = result.details.replace("|", "\\|")
        lines.append(f"| [{result.label}]({result.url}) | **{result.status}** | {details} |")
    lines.extend(
        [
            "",
            "This audit verifies public delivery paths without creating a fake customer lead. "
            "The separate Apps Script morning digest checks the prior 24 hours of Sheet delivery records.",
        ]
    )
    return "\n".join(lines) + "\n"


def run(base_url: str) -> list[CheckResult]:
    results = [live_page_result(base_url, spec) for spec in PAGES]
    priority_paths = [spec.path.lstrip("/") for spec in PAGES if "remodel" in spec.path]
    results.extend(
        [
            text_asset_result(base_url, "/sitemap.xml", priority_paths),
            text_asset_result(
                base_url,
                "/robots.txt",
                ["Sitemap:", "OAI-SearchBot", "PerplexityBot", "ChatGPT-User"],
            ),
            text_asset_result(
                base_url,
                "/llms.txt",
                [
                    "Kitchen Remodel Belleville IL",
                    "Bathroom Remodel O'Fallon IL",
                    "review-request.html",
                ],
            ),
            crawler_policy_result(base_url),
            json_health_result(
                "Apps Script form handler",
                FORM_HANDLER_URL,
                "All-Pro Form Handler",
                EXPECTED_FORM_HANDLER_RELEASE,
                REQUIRED_FORM_HANDLER_CAPABILITIES,
                version_drift_is_warning=True,
            ),
            json_health_result(
                "Cloudflare lead concierge", urljoin(base_url, CONCIERGE_HEALTH_PATH)
            ),
        ]
    )
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--output", type=Path, default=Path("tmp/daily-site-health.md"))
    parser.add_argument("--json-output", type=Path, default=Path("tmp/daily-site-health.json"))
    args = parser.parse_args()

    results = run(args.base_url)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.json_output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(render_markdown(results), encoding="utf-8")
    args.json_output.write_text(
        json.dumps([asdict(result) for result in results], indent=2) + "\n", encoding="utf-8"
    )
    print(render_markdown(results))
    return 1 if any(result.status == "FAIL" for result in results) else 0


if __name__ == "__main__":
    sys.exit(main())
