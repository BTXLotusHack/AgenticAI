from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

import pandas as pd

from .common import get_location_index, load_yaml


DEFAULT_CONFIG = Path("config/crawl_plan.yaml")
DEFAULT_DATA_DIR = Path("data")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Audit POI coverage and detail completeness."
    )
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    return parser.parse_args()


def parse_json_list(value: Any) -> list[str]:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return []

    try:
        parsed = json.loads(str(value))
    except (json.JSONDecodeError, TypeError):
        return [str(value)]

    if isinstance(parsed, list):
        return [str(item) for item in parsed]
    return [str(parsed)]


def build_expected_rows(config: dict[str, Any]) -> pd.DataFrame:
    groups = config["query_groups"]
    locations = get_location_index(config)
    rows: list[dict[str, Any]] = []

    for location_id, location in locations.items():
        allowed_groups = set(location.get("groups") or groups.keys())
        factor = float(location.get("result_factor", 1.0))

        for group_name, group_config in groups.items():
            if not group_config.get("enabled", True):
                continue
            if group_name not in allowed_groups:
                continue

            base_min = int(group_config.get("minimum_clean_places", 1))
            expected_min = max(1, math.ceil(base_min * factor))
            rows.append(
                {
                    "segment_id": location["segment_id"],
                    "segment_order": location["segment_order"],
                    "location_id": location_id,
                    "query_group": group_name,
                    "minimum_expected": expected_min,
                }
            )

    return pd.DataFrame(rows)


def explode_observed(frame: pd.DataFrame) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []

    for _, row in frame.iterrows():
        groups = parse_json_list(row.get("seen_query_groups"))
        if not groups:
            groups = [str(row.get("query_group"))]

        stages = parse_json_list(row.get("seen_crawl_stages"))
        enriched = "enrichment" in stages

        for group in groups:
            rows.append(
                {
                    "location_id": str(row.get("location_id")),
                    "query_group": group,
                    "dedupe_key": row.get("dedupe_key"),
                    "has_opening_hours": bool(
                        row.get("has_opening_hours")
                    ),
                    "has_review_text": bool(row.get("has_review_text")),
                    "has_phone": pd.notna(row.get("phone")),
                    "has_image": pd.notna(row.get("image_url")),
                    "enriched": enriched,
                }
            )

    return pd.DataFrame(rows)


def main() -> int:
    args = parse_args()
    config = load_yaml(args.config)
    clean_path = args.data_dir / "processed" / "places_clean.csv"

    if not clean_path.exists():
        print("places_clean.csv does not exist.")
        return 2

    frame = pd.read_csv(clean_path)
    expected = build_expected_rows(config)
    observed = explode_observed(frame)

    if observed.empty:
        counts = pd.DataFrame(
            columns=[
                "location_id",
                "query_group",
                "clean_count",
                "opening_hours_rate",
                "review_text_rate",
                "phone_rate",
                "image_rate",
                "enrichment_rate",
            ]
        )
    else:
        counts = (
            observed.groupby(["location_id", "query_group"])
            .agg(
                clean_count=("dedupe_key", "nunique"),
                opening_hours_rate=("has_opening_hours", "mean"),
                review_text_rate=("has_review_text", "mean"),
                phone_rate=("has_phone", "mean"),
                image_rate=("has_image", "mean"),
                enrichment_rate=("enriched", "mean"),
            )
            .reset_index()
        )

    report = expected.merge(
        counts,
        on=["location_id", "query_group"],
        how="left",
    )
    report["clean_count"] = report["clean_count"].fillna(0).astype(int)

    rate_columns = [
        "opening_hours_rate",
        "review_text_rate",
        "phone_rate",
        "image_rate",
        "enrichment_rate",
    ]
    for column in rate_columns:
        report[column] = report[column].fillna(0).round(3)

    report["coverage_status"] = report.apply(
        lambda row: (
            "OK"
            if row["clean_count"] >= row["minimum_expected"]
            else "GAP"
        ),
        axis=1,
    )
    report["missing_places"] = (
        report["minimum_expected"] - report["clean_count"]
    ).clip(lower=0)

    output_dir = args.data_dir / "processed"
    output_dir.mkdir(parents=True, exist_ok=True)

    report = report.sort_values(
        by=["segment_order", "location_id", "query_group"]
    )
    report.to_csv(
        output_dir / "coverage_by_location_group.csv",
        index=False,
        encoding="utf-8-sig",
    )

    gaps = report.loc[report["coverage_status"] == "GAP"].copy()
    gaps.to_csv(
        output_dir / "coverage_gaps.csv",
        index=False,
        encoding="utf-8-sig",
    )

    print(
        json.dumps(
            {
                "coverage_cells": int(len(report)),
                "cells_ok": int((report["coverage_status"] == "OK").sum()),
                "cells_with_gaps": int(len(gaps)),
                "clean_places": int(len(frame)),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    print(f"Coverage report: {output_dir / 'coverage_by_location_group.csv'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
