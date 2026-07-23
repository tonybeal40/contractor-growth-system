import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("contractor_growth_builder", ROOT / "build.py")
builder = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(builder)


class BuilderTests(unittest.TestCase):
    def setUp(self):
        self.config = json.loads((ROOT / "config.example.json").read_text(encoding="utf-8"))

    def tearDown(self):
        output = ROOT / "dist" / self.config["business"]["slug"]
        if output.exists():
            shutil.rmtree(output)

    def test_example_build_is_complete_and_contains_no_tokens(self):
        with tempfile.TemporaryDirectory() as temp:
            config_path = Path(temp) / "client.json"
            config_path.write_text(json.dumps(self.config), encoding="utf-8")
            output = builder.build(config_path)
            expected = {
                "assets/demo-hero.jpg",
                "assets/demo-kitchen.webp",
                "assets/demo-bathroom.webp",
                "index.html",
                "estimate.html",
                "exampleville.html",
                "services/kitchen-remodeling.html",
                "services/bathroom-remodeling.html",
                "privacy.html",
                "terms.html",
                "sitemap.xml",
                "robots.txt",
                "llms.txt",
            }
            actual = {path.relative_to(output).as_posix() for path in output.rglob("*") if path.is_file()}
            self.assertTrue(expected.issubset(actual))
            for html_path in output.rglob("*.html"):
                content = html_path.read_text(encoding="utf-8")
                self.assertNotIn("[[", content)
                self.assertNotIn("guaranteed ranking", content.lower())
                self.assertIn('name="viewport"', content)
                self.assertEqual(content.count("<h1>"), 1, html_path)
            estimate = (output / "estimate.html").read_text(encoding="utf-8")
            self.assertIn(self.config["form"]["action"], estimate)
            self.assertIn('name="contact_consent"', estimate)
            self.assertIn('name="email_opt_in"', estimate)
            home = (output / "index.html").read_text(encoding="utf-8")
            service = (output / "services" / "kitchen-remodeling.html").read_text(encoding="utf-8")
            self.assertIn('src="assets/demo-hero.jpg"', home)
            self.assertIn('src="../assets/demo-kitchen.webp"', service)

    def test_duplicate_city_copy_is_rejected(self):
        duplicate = dict(self.config["cities"][0])
        duplicate["slug"] = "second-city"
        duplicate["name"] = "Second City"
        self.config["cities"].append(duplicate)
        with self.assertRaises(builder.ConfigError):
            builder.validate_config(self.config)

    def test_non_https_form_endpoint_is_rejected(self):
        self.config["form"]["action"] = "http://example.com/form"
        with self.assertRaises(builder.ConfigError):
            builder.validate_config(self.config)


if __name__ == "__main__":
    unittest.main()
