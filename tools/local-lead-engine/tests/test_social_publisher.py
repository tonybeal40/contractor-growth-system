import importlib.util
import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("social_publisher", ROOT / "social_publisher.py")
publisher = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
sys.modules[SPEC.name] = publisher
SPEC.loader.exec_module(publisher)


class SocialPublisherTests(unittest.TestCase):
    def setUp(self):
        self.campaigns = json.loads((ROOT / "campaigns.json").read_text(encoding="utf-8"))
        self.queue = publisher.render_queue(self.campaigns)

    def test_each_campaign_has_all_platform_variants(self):
        self.assertEqual(len(self.queue), len(self.campaigns) * 4)
        platforms = {item["platform"] for item in self.queue if item["campaign_id"] == self.campaigns[0]["id"]}
        self.assertEqual(platforms, set(publisher.PLATFORMS))

    def test_tracking_parameters_are_added(self):
        item = next(item for item in self.queue if item["platform"] == "facebook")
        self.assertIn("utm_source=facebook", item["landing_url"])
        self.assertIn("utm_campaign=local-demand-2026", item["landing_url"])

    def test_publish_defaults_to_dry_run_and_never_needs_token(self):
        item = next(item for item in self.queue if item["platform"] == "facebook")
        with patch.dict(os.environ, {"META_PAGE_ID": "123", "META_PAGE_ACCESS_TOKEN": "super-secret-token"}, clear=True):
            result = publisher.publish(item, confirm=False)
        self.assertTrue(result["dry_run"])
        self.assertEqual(result["token_env"], "META_PAGE_ACCESS_TOKEN")
        self.assertNotIn("super-secret-token", json.dumps(result))

    def test_yelp_is_manual(self):
        item = next(item for item in self.queue if item["platform"] == "yelp")
        with self.assertRaisesRegex(RuntimeError, "manually"):
            publisher.publish(item, confirm=False)


if __name__ == "__main__":
    unittest.main()
