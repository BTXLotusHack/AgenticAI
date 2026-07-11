from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from src.build_serving_dataset import (
    MANIFEST_NAME,
    SLIM_CSV_NAME,
    SLIM_JSONL_NAME,
    main,
    parse_json_list,
    slim_row,
    validate_rows,
)
from src.common import read_jsonl, write_jsonl


class ServingDatasetTests(unittest.TestCase):
    def test_parse_json_list_accepts_json_strings(self) -> None:
        self.assertEqual(parse_json_list('["meal_stop","trip_planning"]'), [
            "meal_stop",
            "trip_planning",
        ])
        self.assertEqual(parse_json_list("food"), ["food"])
        self.assertEqual(parse_json_list(None), [])

    def test_slim_row_keeps_only_serving_fields(self) -> None:
        row = valid_source_row()
        row["reviews"] = "[]"
        row["phone"] = "0900000000"

        slim = slim_row(row)

        self.assertNotIn("reviews", slim)
        self.assertNotIn("phone", slim)
        self.assertEqual(slim["ai_use_cases"], ["meal_stop", "trip_planning"])

    def test_validate_rows_requires_candidate_contract(self) -> None:
        row = slim_row(valid_source_row())

        self.assertEqual(validate_rows([row], min_rows=1), [])

        broken = {**row, "place_id": ""}
        errors = validate_rows([broken], min_rows=1)

        self.assertTrue(any("place_id" in error for error in errors))

    def test_main_writes_serving_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as temp_root:
            data_dir = Path(temp_root) / "data"
            processed_dir = data_dir / "processed"
            write_jsonl(
                processed_dir / "places_ai_suggestions.jsonl",
                [valid_source_row()],
            )

            import sys

            original_argv = sys.argv
            try:
                sys.argv = [
                    "build_serving_dataset",
                    "--data-dir",
                    str(data_dir),
                    "--min-rows",
                    "1",
                ]
                self.assertEqual(main(), 0)
            finally:
                sys.argv = original_argv

            rows = read_jsonl(processed_dir / SLIM_JSONL_NAME)
            self.assertEqual(len(rows), 1)
            self.assertTrue((processed_dir / SLIM_CSV_NAME).exists())
            self.assertTrue((processed_dir / MANIFEST_NAME).exists())


def valid_source_row() -> dict[str, object]:
    return {
        "place_id": "place-1",
        "name": "Sample Cafe",
        "normalized_name": "sample cafe",
        "place_type": "food",
        "query_group": "food",
        "ai_use_cases": '["meal_stop","trip_planning"]',
        "corridor_id": "can_tho_hue",
        "segment_id": "01_can_tho_vinh_long",
        "segment_name": "Can Tho to Vinh Long",
        "segment_order": 1,
        "location_id": "can_tho",
        "search_location": "Can Tho, Vietnam",
        "location_center_lat": 10.0452,
        "location_center_lng": 105.7469,
        "validation_radius_km": 30,
        "distance_from_search_center_km": 2.5,
        "latitude": 10.04,
        "longitude": 105.79,
        "address": "Sample address",
        "city": "Can Tho",
        "state": "Can Tho",
        "country_code": "VN",
        "category_name": "Restaurant",
        "categories": '["Restaurant"]',
        "rating": 4.5,
        "reviews_count": 120,
        "opening_hours": "[]",
        "has_opening_hours": True,
        "is_24_hours": False,
        "temporarily_closed": False,
        "permanently_closed": False,
        "website": "https://example.com",
        "google_maps_url": "https://maps.google.com/?q=sample",
        "image_url": "https://example.com/image.jpg",
        "source_provider": "google_maps",
        "source_confidence": 0.9,
        "source_confidence_reasons": '["stable_place_id"]',
        "completeness_score": 8,
        "eligible_for_ai_destination_suggestions": True,
        "regroup_seed_eligible": False,
        "route_enrichment_status": "optional_for_trip_planning",
        "safety_validation_status": "not_validated_by_routing_or_policy",
    }


if __name__ == "__main__":
    unittest.main()
