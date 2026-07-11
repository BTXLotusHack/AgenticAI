from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Any

from .common import read_jsonl, write_json, write_jsonl


DEFAULT_DATA_DIR = Path("data")
SOURCE_NAME = "places_ai_suggestions.jsonl"
SLIM_JSONL_NAME = "places_trip_planning_slim.jsonl"
SLIM_CSV_NAME = "places_trip_planning_slim.csv"
MANIFEST_NAME = "trip_planning_serving_manifest.json"

SLIM_FIELDS = [
    "place_id",
    "name",
    "normalized_name",
    "place_type",
    "query_group",
    "ai_use_cases",
    "corridor_id",
    "segment_id",
    "segment_name",
    "segment_order",
    "location_id",
    "search_location",
    "location_center_lat",
    "location_center_lng",
    "validation_radius_km",
    "distance_from_search_center_km",
    "latitude",
    "longitude",
    "address",
    "city",
    "state",
    "country_code",
    "category_name",
    "categories",
    "rating",
    "reviews_count",
    "opening_hours",
    "has_opening_hours",
    "is_24_hours",
    "temporarily_closed",
    "permanently_closed",
    "website",
    "google_maps_url",
    "image_url",
    "source_provider",
    "source_confidence",
    "source_confidence_reasons",
    "completeness_score",
    "eligible_for_ai_destination_suggestions",
    "regroup_seed_eligible",
    "route_enrichment_status",
    "safety_validation_status",
]

REQUIRED_FIELDS = {
    "place_id",
    "name",
    "place_type",
    "query_group",
    "ai_use_cases",
    "corridor_id",
    "segment_id",
    "location_id",
    "latitude",
    "longitude",
    "source_provider",
    "source_confidence",
    "eligible_for_ai_destination_suggestions",
    "safety_validation_status",
}

JSON_LIST_FIELDS = {
    "ai_use_cases",
    "categories",
    "source_confidence_reasons",
}

DISALLOWED_FIELDS = {
    "raw_item",
    "reviews",
    "questions_and_answers",
    "people_also_search",
    "recent_review_text",
    "recent_review_texts",
    "review_snippets",
    "phone",
    "phone_e164",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build and validate the slim AI trip-planning serving dataset."
    )
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--min-rows", type=int, default=1)
    return parser.parse_args()


def parse_json_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return []
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            return [text]
        if isinstance(parsed, list):
            return parsed
        return [parsed]
    return [value]


def compact_value(value: Any) -> Any:
    if value == "":
        return None
    return value


def slim_row(row: dict[str, Any]) -> dict[str, Any]:
    slim: dict[str, Any] = {}
    for field in SLIM_FIELDS:
        value = compact_value(row.get(field))
        if field in JSON_LIST_FIELDS:
            value = parse_json_list(value)
        slim[field] = value
    return slim


def is_missing(value: Any) -> bool:
    return value is None or value == "" or value == []


def validate_rows(rows: list[dict[str, Any]], min_rows: int) -> list[str]:
    errors: list[str] = []

    if len(rows) < min_rows:
        errors.append(f"Serving dataset row count {len(rows)} is below {min_rows}.")

    seen_place_ids: set[str] = set()
    for index, row in enumerate(rows, start=1):
        leaked = sorted(DISALLOWED_FIELDS.intersection(row))
        if leaked:
            errors.append(f"Row {index} contains disallowed fields: {', '.join(leaked)}")

        missing = sorted(
            field for field in REQUIRED_FIELDS if is_missing(row.get(field))
        )
        if missing:
            errors.append(f"Row {index} missing required fields: {', '.join(missing)}")

        if row.get("eligible_for_ai_destination_suggestions") is not True:
            errors.append(f"Row {index} is not eligible for AI destination suggestions.")

        if row.get("safety_validation_status") != "not_validated_by_routing_or_policy":
            errors.append(f"Row {index} has unexpected safety_validation_status.")

        place_id = str(row.get("place_id") or "")
        if place_id in seen_place_ids:
            errors.append(f"Duplicate place_id in serving dataset: {place_id}")
        seen_place_ids.add(place_id)

        try:
            latitude = float(row.get("latitude"))
            longitude = float(row.get("longitude"))
        except (TypeError, ValueError):
            errors.append(f"Row {index} has invalid coordinates.")
            continue

        if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
            errors.append(f"Row {index} has out-of-range coordinates.")

    return errors


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=SLIM_FIELDS)
        writer.writeheader()
        for row in rows:
            csv_row = {
                key: (
                    json.dumps(value, ensure_ascii=False)
                    if isinstance(value, (list, dict))
                    else value
                )
                for key, value in row.items()
            }
            writer.writerow(csv_row)


def main() -> int:
    args = parse_args()
    processed_dir = args.data_dir / "processed"
    source_path = processed_dir / SOURCE_NAME

    source_rows = read_jsonl(source_path)
    serving_rows = [slim_row(row) for row in source_rows]
    errors = validate_rows(serving_rows, args.min_rows)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    jsonl_path = processed_dir / SLIM_JSONL_NAME
    csv_path = processed_dir / SLIM_CSV_NAME
    manifest_path = processed_dir / MANIFEST_NAME

    write_jsonl(jsonl_path, serving_rows)
    write_csv(csv_path, serving_rows)
    write_json(
        manifest_path,
        {
            "status": "ok",
            "source_file": str(source_path),
            "serving_jsonl": str(jsonl_path),
            "serving_csv": str(csv_path),
            "source_rows": len(source_rows),
            "serving_rows": len(serving_rows),
            "fields": SLIM_FIELDS,
            "required_fields": sorted(REQUIRED_FIELDS),
            "safety_boundary": (
                "Trip-planning candidates only; not validated for regrouping, "
                "navigation safety, live ETA, road direction, or convoy policy."
            ),
        },
    )

    print(
        json.dumps(
            {
                "status": "ok",
                "serving_rows": len(serving_rows),
                "serving_jsonl": str(jsonl_path),
                "serving_csv": str(csv_path),
                "manifest": str(manifest_path),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
