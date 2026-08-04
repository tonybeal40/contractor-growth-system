import json
import re
import unittest
from html import unescape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "contractor-estimate-comparison.html"
SCRIPT = ROOT / "contractor-estimate-comparison.js"
STYLES = ROOT / "contractor-estimate-comparison.css"


class ContractorEstimateComparisonTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = PAGE.read_text(encoding="utf-8")
        cls.script = SCRIPT.read_text(encoding="utf-8")
        cls.styles = STYLES.read_text(encoding="utf-8")

    def test_page_has_complete_indexable_metadata(self):
        title = re.search(r"<title>(.*?)</title>", self.html, re.I | re.S).group(1)
        description = re.search(
            r'<meta\s+name="description"\s+content="([^"]+)"', self.html, re.I
        ).group(1)
        self.assertLessEqual(len(title), 60)
        self.assertGreaterEqual(len(description), 90)
        self.assertLessEqual(len(description), 160)
        self.assertEqual(len(re.findall(r"<h1\b", self.html, re.I)), 1)
        self.assertIn(
            '<link rel="canonical" href="https://allprometroeastconstruction.com/contractor-estimate-comparison.html">',
            self.html,
        )
        self.assertNotRegex(self.html, r'<meta\s+name="robots"[^>]*noindex')

    def test_structured_data_is_valid_and_describes_the_tool(self):
        blocks = re.findall(
            r'<script\s+type="application/ld\+json">(.*?)</script>',
            self.html,
            re.I | re.S,
        )
        self.assertTrue(blocks)
        types = set()
        for block in blocks:
            data = json.loads(unescape(block).strip())
            nodes = data.get("@graph", [data]) if isinstance(data, dict) else data
            for node in nodes:
                node_type = node.get("@type")
                if isinstance(node_type, list):
                    types.update(node_type)
                elif node_type:
                    types.add(node_type)
        self.assertTrue(
            {"WebApplication", "FAQPage", "BreadcrumbList"}.issubset(types)
        )

    def test_tool_is_private_by_default_and_not_a_lead_form(self):
        self.assertNotIn("<form", self.html.lower())
        self.assertIn("Your entries stay in this browser", self.html)
        self.assertIn("does not verify contractors", self.html)
        self.assertIn("allpro-contractor-estimate-comparison-v1", self.script)
        self.assertIn("window.localStorage.setItem", self.script)
        self.assertNotIn("fetch(", self.script)
        self.assertNotIn("XMLHttpRequest", self.script)

    def test_tool_supports_three_estimates_and_safe_rendering(self):
        self.assertEqual(
            len(re.findall(r'<fieldset\s+class="estimate-card"', self.html)), 3
        )
        self.assertIn('const IDS = ["a", "b", "c"]', self.script)
        self.assertIn("replaceChildren", self.script)
        self.assertIn("textContent", self.script)
        self.assertNotIn("innerHTML", self.script)

    def test_responsive_and_print_styles_exist(self):
        self.assertIn("@media (max-width: 780px)", self.styles)
        self.assertIn("@media (max-width: 520px)", self.styles)
        self.assertIn("@media print", self.styles)
        self.assertIn("prefers-reduced-motion", self.styles)
        self.assertRegex(
            self.styles,
            r"@media \(max-width: 780px\)[\s\S]*?#ap-float\s*\{[\s\S]*?display:\s*none\s*!important",
        )
        self.assertNotRegex(self.styles, r"letter-spacing:\s*-")

    def test_local_links_and_assets_exist(self):
        paths = set(
            re.findall(r'(?:href|src)="([^"#?]+)', self.html, re.I)
        )
        for value in paths:
            if value.startswith(("http://", "https://", "tel:", "mailto:")):
                continue
            self.assertTrue((ROOT / value.lstrip("/")).exists(), value)


if __name__ == "__main__":
    unittest.main()
