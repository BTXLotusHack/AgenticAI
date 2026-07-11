from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

from src.clean import clean_rows, load_runs
from src.validate_outputs import main as validate_outputs_main


class CleanOutputTests(unittest.TestCase):
    def test_clean_writes_ai_dataset(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir_name:
            temp_dir = Path(temp_dir_name)
            run_dir = (
                temp_dir
                / "raw"
                / "discovery"
                / "20260711"
                / "04_phan_thiet_nha_trang"
                / "nha_trang"
                / "accommodation"
                / "run_001"
            )
            run_dir.mkdir(parents=True)

            metadata = {
                "crawl_id": "crawl_001",
                "crawl_stage": "discovery",
                "job_id": "job_001",
                "actor_id": "compass/crawler-google-places",
                "run_id": "actor_run_001",
                "dataset_id": "dataset_001",
                "corridor_id": "can_tho_hue",
                "segment_id": "04_phan_thiet_nha_trang",
                "segment_name": "Phan Thiet -> Nha Trang",
                "segment_order": 4,
                "location_id": "nha_trang",
                "location_query": "Nha Trang, Viet Nam",
                "location_center_lat": 12.2388,
                "location_center_lng": 109.1967,
                "validation_radius_km": 30,
                "query_group": "accommodation",
                "search_terms": ["khach san"],
            }
            (run_dir / "run_metadata.json").write_text(
                json.dumps(metadata),
                encoding="utf-8",
            )

            item = {
                "placeId": "place_001",
                "cid": "cid_001",
                "title": "Seaside Hotel",
                "categoryName": "Hotel",
                "categories": ["Hotel"],
                "description": "Hotel near the beach.",
                "address": "Tran Phu, Nha Trang",
                "city": "Nha Trang",
                "countryCode": "VN",
                "location": {"lat": 12.239, "lng": 109.197},
                "totalScore": 4.4,
                "reviewsCount": 120,
                "phone": "+84 123 456 789",
                "website": "https://example.test",
                "url": "https://maps.google.com/?cid=cid_001",
                "openingHours": ["Open 24 hours"],
                "reviews": [
                    {
                        "text": "Good overnight stop with parking.",
                        "stars": 5,
                        "name": "Reviewer Name",
                        "reviewerId": "private-profile",
                    }
                ],
                "temporarilyClosed": False,
                "permanentlyClosed": False,
                "scrapedAt": "2026-07-11T00:00:00Z",
            }
            (run_dir / "items.jsonl").write_text(
                json.dumps(item, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )

            rows = load_runs(temp_dir / "raw")
            summary = clean_rows(rows, temp_dir / "processed")

            self.assertEqual(summary["clean_unique_rows"], 1)
            self.assertEqual(summary["ai_dataset_rows"], 1)
            self.assertNotIn("knowledge_base_documents", summary)

            ai_jsonl = temp_dir / "processed" / "places_ai_suggestions.jsonl"
            self.assertTrue(ai_jsonl.exists())
            self.assertFalse(
                (temp_dir / "processed" / "places_knowledge_base.jsonl").exists()
            )
            self.assertFalse(
                (
                    temp_dir
                    / "processed"
                    / "places_knowledge_base_manifest.json"
                ).exists()
            )

            ai_record = json.loads(ai_jsonl.read_text(encoding="utf-8").strip())
            self.assertNotIn("raw_item", ai_record)
            self.assertNotIn("reviews", ai_record)
            self.assertNotIn("questions_and_answers", ai_record)
            self.assertIn("source_confidence", ai_record)
            self.assertEqual(
                ai_record["safety_validation_status"],
                "not_validated_by_routing_or_policy",
            )
            self.assertNotIn("Reviewer Name", ai_record["review_snippets"])
            self.assertNotIn("private-profile", ai_record["review_snippets"])

    def test_validate_outputs_accepts_clean_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir_name:
            temp_dir = Path(temp_dir_name)
            processed_dir = temp_dir / "processed"
            processed_dir.mkdir()

            ai_record = {
                "place_id": "place_001",
                "name": "Seaside Hotel",
                "place_type": "accommodation",
                "corridor_id": "can_tho_hue",
                "segment_id": "04_phan_thiet_nha_trang",
                "location_id": "nha_trang",
                "source_provider": "google_maps",
                "source_confidence": 0.8,
                "ai_use_cases": "[\"overnight_stay\",\"trip_planning\"]",
                "safety_validation_status": (
                    "not_validated_by_routing_or_policy"
                ),
            }
            with (processed_dir / "places_ai_suggestions.csv").open(
                "w",
                encoding="utf-8",
                newline="",
            ) as file:
                file.write(",".join(ai_record.keys()))
                file.write("\n")
                file.write(",".join(str(value) for value in ai_record.values()))
                file.write("\n")

            (processed_dir / "places_ai_suggestions.jsonl").write_text(
                json.dumps(ai_record, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            (processed_dir / "clean_summary.json").write_text(
                json.dumps({"ai_dataset_rows": 1}),
                encoding="utf-8",
            )
            (processed_dir / "places_clean.csv").write_text(
                "name\nSeaside Hotel\n",
                encoding="utf-8",
            )
            (processed_dir / "places_clean.jsonl").write_text(
                "{\"name\":\"Seaside Hotel\"}\n",
                encoding="utf-8",
            )

            original_argv = sys.argv
            try:
                sys.argv = [
                    "validate_outputs",
                    "--data-dir",
                    str(temp_dir),
                ]
                self.assertEqual(validate_outputs_main(), 0)
            finally:
                sys.argv = original_argv


if __name__ == "__main__":
    unittest.main()
