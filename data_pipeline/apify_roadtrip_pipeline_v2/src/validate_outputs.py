from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Any


DEFAULT_DATA_DIR = Path("data")

REQUIRED_FILES = [
    "places_clean.csv",
    "places_clean.jsonl",
    "places_ai_suggestions.csv",
    "places_ai_suggestions.jsonl",
    "clean_summary.json",
]

DISALLOWED_AI_DATASET_FIELDS = {
    "raw_item",
    "reviews",
    "questions_and_answers",
    "people_also_search",
}

REQUIRED_AI_DATASET_FIELDS = {
    "place_id",
    "name",
    "place_type",
    "corridor_id",
    "segment_id",
    "location_id",
    "source_provider",
    "source_confidence",
    "ai_use_cases",
    "safety_validation_status",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate processed AI-ready structured dataset outputs."
    )
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument(
        "--min-rows",
        type=int,
        default=1,
        help="Minimum required AI dataset row count.",
    )
    return parser.parse_args()


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as file:
        for line_number, line in enumerate(file, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSONL at {path}:{line_number}") from exc
            if not isinstance(item, dict):
                raise ValueError(f"JSONL row must be an object at {path}:{line_number}")
            rows.append(item)
    return rows


def read_csv_headers(path: Path) -> set[str]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        return set(reader.fieldnames or [])


def validate_required_files(processed_dir: Path, errors: list[str]) -> None:
    for name in REQUIRED_FILES:
        path = processed_dir / name
        if not path.exists():
            errors.append(f"Missing required output: {path}")


def validate_ai_dataset(processed_dir: Path, errors: list[str]) -> int:
    csv_path = processed_dir / "places_ai_suggestions.csv"
    jsonl_path = processed_dir / "places_ai_suggestions.jsonl"
    if not csv_path.exists() or not jsonl_path.exists():
        return 0

    headers = read_csv_headers(csv_path)
    disallowed = sorted(headers.intersection(DISALLOWED_AI_DATASET_FIELDS))
    if disallowed:
        errors.append(
            "AI dataset contains disallowed fields: " + ", ".join(disallowed)
        )

    missing = sorted(REQUIRED_AI_DATASET_FIELDS.difference(headers))
    if missing:
        errors.append("AI dataset missing required fields: " + ", ".join(missing))

    rows = read_jsonl(jsonl_path)
    for index, row in enumerate(rows, start=1):
        if row.get("safety_validation_status") != (
            "not_validated_by_routing_or_policy"
        ):
            errors.append(
                "AI dataset row "
                f"{index} has unexpected safety_validation_status."
            )
        if any(field in row for field in DISALLOWED_AI_DATASET_FIELDS):
            errors.append(f"AI dataset row {index} contains raw/review payload fields.")

    return len(rows)


def validate_summary(
    processed_dir: Path,
    ai_rows: int,
    errors: list[str],
) -> None:
    summary_path = processed_dir / "clean_summary.json"
    if not summary_path.exists():
        return

    summary = read_json(summary_path)
    if summary.get("ai_dataset_rows") != ai_rows:
        errors.append(
            "clean_summary ai_dataset_rows does not match JSONL rows: "
            f"{summary.get('ai_dataset_rows')} != {ai_rows}"
        )


def main() -> int:
    args = parse_args()
    processed_dir = args.data_dir / "processed"
    errors: list[str] = []
    minimum_rows = args.min_rows

    validate_required_files(processed_dir, errors)
    ai_rows = validate_ai_dataset(processed_dir, errors)
    validate_summary(processed_dir, ai_rows, errors)

    if ai_rows < minimum_rows:
        errors.append(
            f"AI dataset row count {ai_rows} is below minimum {minimum_rows}."
        )

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print(
        json.dumps(
            {
                "status": "ok",
                "ai_dataset_rows": ai_rows,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
