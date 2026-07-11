from __future__ import annotations

from types import SimpleNamespace
import unittest

from src.crawl import build_jobs


def base_args() -> SimpleNamespace:
    return SimpleNamespace(
        segment=None,
        location=None,
        group=None,
        max_results=None,
        details=False,
        max_charge_usd=None,
        pilot=False,
        limit_jobs=None,
        force=False,
    )


def base_config(use_custom_geolocation: bool = True) -> dict:
    return {
        "corridor": {"id": "test", "name": "Test"},
        "actor": {
            "id": "compass/crawler-google-places",
            "language": "vi",
            "skip_closed_places": True,
            "use_custom_geolocation_from_center": use_custom_geolocation,
        },
        "query_groups": {
            "food": {
                "enabled": True,
                "max_places_per_search": 5,
                "search_terms": ["restaurant"],
            }
        },
        "segments": [
            {
                "id": "segment_1",
                "order": 1,
                "name": "Segment 1",
                "locations": [
                    {
                        "id": "loc_1",
                        "query": "Example City, Vietnam",
                        "center": [10.0, 106.0],
                        "validation_radius_km": 12,
                    }
                ],
            }
        ],
    }


class CrawlJobTests(unittest.TestCase):
    def test_build_jobs_uses_custom_geolocation_from_center(self) -> None:
        jobs = build_jobs(base_config(), base_args())

        actor_input = jobs[0].actor_input

        self.assertIn("customGeolocation", actor_input)
        self.assertNotIn("locationQuery", actor_input)
        self.assertEqual(actor_input["customGeolocation"]["type"], "Polygon")
        first_coordinate = actor_input["customGeolocation"]["coordinates"][0][0]
        self.assertEqual(len(first_coordinate), 2)

    def test_build_jobs_keeps_location_query_when_custom_geolocation_disabled(
        self,
    ) -> None:
        jobs = build_jobs(base_config(use_custom_geolocation=False), base_args())

        actor_input = jobs[0].actor_input

        self.assertNotIn("customGeolocation", actor_input)
        self.assertEqual(actor_input["locationQuery"], "Example City, Vietnam")


if __name__ == "__main__":
    unittest.main()
