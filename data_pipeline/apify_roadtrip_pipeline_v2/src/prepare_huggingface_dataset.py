from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path


DEFAULT_DATA_DIR = Path("data")
DEFAULT_OUTPUT_DIR = Path("data/huggingface/loopin-ai-trip-planning-poi")

UPLOAD_FILES = [
    "places_trip_planning_slim.jsonl",
    "places_trip_planning_slim.csv",
    "trip_planning_serving_manifest.json",
    "places_ai_suggestions.jsonl",
    "places_ai_suggestions.csv",
    "clean_summary.json",
    "coverage_by_location_group.csv",
    "coverage_gaps.csv",
]


DATASET_CARD = """---
license: other
task_categories:
- text-generation
- feature-extraction
language:
- vi
- en
pretty_name: Loopin AI Trip Planning POI Dataset
size_categories:
- 1K<n<10K
tags:
- travel
- trip-planning
- poi
- vietnam
- geospatial
---

# Loopin AI Trip Planning POI Dataset

This dataset is a structured POI serving snapshot for Loopin's hackathon AI
Trip Planner prototype along the Can Tho to Hue corridor in Vietnam.

## Files

- `places_trip_planning_slim.jsonl`: compact serving artifact for geo filtering,
  deterministic scoring and bounded LLM itinerary generation.
- `places_trip_planning_slim.csv`: spreadsheet-friendly copy of the slim
  serving artifact.
- `trip_planning_serving_manifest.json`: row count, field list and safety
  boundary for the slim serving artifact.
- `places_ai_suggestions.jsonl` / `places_ai_suggestions.csv`: fuller AI-ready
  structured dataset retained from the processed pipeline.
- `clean_summary.json`: source row, rejection and dedupe counts.
- `coverage_by_location_group.csv`: coverage audit by location and query group.
- `coverage_gaps.csv`: remaining coverage gaps.

## Intended Use

Use this dataset for destination discovery, meal-stop suggestions, attraction
planning and support-POI context in an AI trip-planning prototype.

The recommended runtime flow is:

1. Filter deterministically by corridor, segment, location and place type.
2. Filter out rows that are not eligible for AI destination suggestions.
3. Score candidates using structured metadata such as source confidence,
   completeness, rating, review count and distance fields.
4. Pass only a bounded candidate set to an LLM.
5. Require final itinerary output to reference candidate `place_id` values from
   this dataset.

## Safety Boundary

This dataset is not authoritative for regrouping, navigation safety, live ETA,
road direction, safe entry or exit, parking capacity, convoy policy, or
emergency decisions. Any safety-sensitive use requires current map/routing
provider evidence and deterministic policy validation.

## Provenance

The rows were processed from an Apify Google Maps crawl, then cleaned,
deduplicated and validated by the local Loopin data pipeline. Raw crawl payloads
and raw review/profile payloads are intentionally not included in this dataset
package.
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prepare and optionally upload the Loopin POI dataset to Hugging Face."
    )
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--repo-id", help="Hugging Face dataset repo id, for example org/name.")
    parser.add_argument("--private", action="store_true", help="Create the dataset repo as private.")
    parser.add_argument("--upload", action="store_true", help="Upload the prepared folder to Hugging Face.")
    return parser.parse_args()


def prepare_folder(data_dir: Path, output_dir: Path) -> None:
    processed_dir = data_dir / "processed"
    output_dir.mkdir(parents=True, exist_ok=True)

    missing: list[Path] = []
    for name in UPLOAD_FILES:
        source = processed_dir / name
        if not source.exists():
            missing.append(source)
            continue
        shutil.copy2(source, output_dir / name)

    if missing:
        names = "\n".join(str(path) for path in missing)
        raise FileNotFoundError(f"Missing files required for Hugging Face upload:\n{names}")

    (output_dir / "README.md").write_text(DATASET_CARD, encoding="utf-8")


def upload_folder(output_dir: Path, repo_id: str, private: bool) -> None:
    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_HUB_TOKEN")
    if not token:
        raise RuntimeError("HF_TOKEN or HUGGINGFACE_HUB_TOKEN must be set before upload.")

    try:
        from huggingface_hub import HfApi
    except ImportError as exc:
        raise RuntimeError(
            "huggingface_hub is not installed. Install it in the pipeline venv first."
        ) from exc

    api = HfApi(token=token)
    api.create_repo(repo_id=repo_id, repo_type="dataset", private=private, exist_ok=True)
    api.upload_folder(
        repo_id=repo_id,
        repo_type="dataset",
        folder_path=str(output_dir),
        commit_message="Upload Loopin AI trip planning POI dataset",
    )


def main() -> int:
    args = parse_args()

    try:
        prepare_folder(args.data_dir, args.output_dir)
        if args.upload:
            if not args.repo_id:
                raise ValueError("--repo-id is required when --upload is set.")
            upload_folder(args.output_dir, args.repo_id, args.private)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    print(f"Prepared Hugging Face dataset folder: {args.output_dir}")
    if args.upload:
        print(f"Uploaded dataset repo: {args.repo_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
