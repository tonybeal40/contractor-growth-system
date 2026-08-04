import importlib.util
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "apply_indexing_policy", ROOT / "scripts" / "apply_indexing_policy.py"
)
apply_indexing_policy = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = apply_indexing_policy
SPEC.loader.exec_module(apply_indexing_policy)


class IndexingPolicyTests(unittest.TestCase):
    def test_recognizes_a_real_city_service_combination(self):
        result = apply_indexing_policy.split_local_page(
            Path("concrete-belleville-il.html")
        )
        self.assertEqual(result, ("concrete", "belleville"))

    def test_recognizes_a_managed_specialty_service(self):
        self.assertEqual(
            apply_indexing_policy.split_local_page(
                Path("concrete-contractor-belleville-il.html")
            ),
            ("concrete-contractor", "belleville"),
        )

    def test_does_not_treat_a_problem_page_as_a_city_service_page(self):
        self.assertIsNone(
            apply_indexing_policy.split_local_page(
                Path("concrete-patio-drainage-problem-belleville-il.html")
            )
        )

    def test_limits_full_service_clusters_to_core_cities(self):
        self.assertTrue(
            apply_indexing_policy.should_index("kitchen-remodel", "belleville")
        )
        self.assertTrue(
            apply_indexing_policy.should_index("kitchen-remodel", "ofallon")
        )
        self.assertFalse(
            apply_indexing_policy.should_index("kitchen-remodel", "edwardsville")
        )


if __name__ == "__main__":
    unittest.main()
