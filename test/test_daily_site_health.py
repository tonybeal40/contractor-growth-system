import importlib.util
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "daily_site_health", ROOT / "scripts" / "daily_site_health.py"
)
daily_site_health = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = daily_site_health
SPEC.loader.exec_module(daily_site_health)


class DailySiteHealthTests(unittest.TestCase):
    def test_stale_but_working_handler_is_a_warning(self):
        payload = json.dumps({"ok": True, "service": "All-Pro Form Handler"})
        with patch.object(
            daily_site_health, "fetch", return_value=(200, "https://example.test", payload)
        ):
            result = daily_site_health.json_health_result(
                "Apps Script",
                "https://example.test",
                expected_service="All-Pro Form Handler",
                expected_release="new-release",
                required_capabilities={"homeowner-leads"},
                version_drift_is_warning=True,
            )

        self.assertEqual(result.status, "WARN")
        self.assertIn("stale deployment", result.details)
        self.assertIn("missing capabilities", result.details)

    def test_unhealthy_handler_still_fails(self):
        payload = json.dumps({"ok": False, "service": "All-Pro Form Handler"})
        with patch.object(
            daily_site_health, "fetch", return_value=(200, "https://example.test", payload)
        ):
            result = daily_site_health.json_health_result(
                "Apps Script",
                "https://example.test",
                expected_service="All-Pro Form Handler",
                version_drift_is_warning=True,
            )

        self.assertEqual(result.status, "FAIL")
        self.assertIn("ok=true", result.details)

    def test_report_surfaces_warning_without_calling_it_a_failure(self):
        report = daily_site_health.render_markdown(
            [
                daily_site_health.CheckResult("Site", "https://example.test", "PASS", "ok"),
                daily_site_health.CheckResult("Handler", "https://example.test", "WARN", "stale"),
            ]
        )

        self.assertIn("Result: WARN", report)
        self.assertIn("1 passed, 1 warning, 0 failed", report)


if __name__ == "__main__":
    unittest.main()
