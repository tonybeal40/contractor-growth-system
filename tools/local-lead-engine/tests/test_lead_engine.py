import importlib.util
import json
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("local_lead_engine", ROOT / "lead_engine.py")
engine = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
sys.modules[SPEC.name] = engine
SPEC.loader.exec_module(engine)


class LeadEngineTests(unittest.TestCase):
    def setUp(self):
        self.config = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))

    def test_contact_data_is_redacted(self):
        cleaned = engine.clean_text("Email homeowner@example.com or call (618) 555-0199")
        self.assertNotIn("homeowner@example.com", cleaned)
        self.assertNotIn("618", cleaned)
        self.assertIn("[email removed]", cleaned)
        self.assertIn("[phone removed]", cleaned)

    def test_priority_city_and_service_score_high(self):
        captured = datetime(2026, 7, 23, tzinfo=timezone.utc)
        raw = {
            "source": "Public community",
            "source_url": "https://community.example.test/post/1",
            "published_at": "2026-07-22T12:00:00Z",
            "title": "Looking for a kitchen remodel contractor in Belleville",
            "summary": "We want to remodel our kitchen and need an estimate for cabinets, countertops, flooring, and lighting this summer.",
        }
        item = engine.create_opportunity(raw, self.config, captured)
        self.assertIsNotNone(item)
        self.assertEqual(item.city, "Belleville")
        self.assertEqual(item.service, "Kitchen Remodeling")
        self.assertGreaterEqual(item.score, 80)
        self.assertEqual(item.representative, "Bill Session")
        self.assertIn("get-quote.html", item.reply_draft)

    def test_rss_scan_writes_private_safe_queue(self):
        fixture_uri = (ROOT / "tests" / "fixtures" / "public-feed.xml").resolve().as_uri()
        self.config["rss_feeds"] = [{"name": "Fixture", "url": fixture_uri}]
        self.config["nextdoor"]["enabled"] = False
        with tempfile.TemporaryDirectory() as temp:
            temp_path = Path(temp)
            config_path = temp_path / "config.json"
            config_path.write_text(json.dumps(self.config), encoding="utf-8")
            items = engine.scan(config_path, None, temp_path / "out")
            self.assertEqual(len(items), 1)
            output = (temp_path / "out" / "opportunities.json").read_text(encoding="utf-8")
            self.assertNotIn("homeowner@example.test", output)
            self.assertNotIn("618-555-0199", output)
            self.assertIn("Reply on source", output)

    def test_highland_lane_routes_public_opportunity_to_josh(self):
        config = json.loads((ROOT / "config.josh-highland.json").read_text(encoding="utf-8"))
        captured = datetime(2026, 7, 23, tzinfo=timezone.utc)
        raw = {
            "source": "Public community",
            "source_url": "https://community.example.test/highland-project",
            "published_at": "2026-07-23T10:00:00Z",
            "title": "Looking for a bathroom remodel estimate in Highland",
            "summary": "Need a contractor to review a shower, vanity, flooring, and ventilation project.",
        }
        item = engine.create_opportunity(raw, config, captured)
        self.assertIsNotNone(item)
        self.assertEqual(item.representative, "Josh Barber")
        self.assertEqual(item.representative_phone, "618-402-8775")
        self.assertEqual(item.representative_email, "JoshBarber23@yahoo.com")
        self.assertIn("josh-barber-highland-il.html#estimate", item.reply_draft)

    def test_same_public_url_is_deduplicated_when_titles_differ(self):
        captured = datetime(2026, 7, 23, tzinfo=timezone.utc)
        base = {
            "source": "Public community",
            "source_url": "https://community.example.test/project/1/",
            "published_at": "2026-07-22T12:00:00Z",
            "summary": "A Belleville homeowner is looking for a contractor for a kitchen remodel estimate.",
        }
        first = engine.create_opportunity({**base, "title": "Kitchen remodeling help"}, self.config, captured)
        second = engine.create_opportunity({**base, "source_url": base["source_url"].rstrip("/"), "title": "Looking for kitchen contractor recommendations"}, self.config, captured)
        self.assertEqual(len(engine.dedupe([first, second])), 1)


if __name__ == "__main__":
    unittest.main()
