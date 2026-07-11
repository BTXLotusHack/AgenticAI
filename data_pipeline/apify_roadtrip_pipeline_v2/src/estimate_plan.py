from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from types import SimpleNamespace
from typing import Any

from .audit import build_expected_rows
from .common import load_yaml
from .crawl import build_jobs, latest_successful_job_ids


DEFAULT_CONFIG = Path("config/crawl_plan.yaml")
DEFAULT_DATA_DIR = Path("data")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Estimate full discovery crawl size, coverage targets and cost caps."
    )
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--segment", action="append")
    parser.add_argument("--location", action="append")
    parser.add_argument("--group", action="append")
    parser.add_argument("--max-results", type=int)
    parser.add_argument("--pilot", action="store_true")
    parser.add_argument("--limit-jobs", type=int)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--max-charge-usd", type=float)
    return parser.parse_args()


def crawl_args(args: argparse.Namespace) -> SimpleNamespace:
    return SimpleNamespace(
        segment=args.segment,
        location=args.location,
        group=args.group,
        max_results=args.max_results,
        details=False,
        max_charge_usd=args.max_charge_usd,
        pilot=args.pilot,
        limit_jobs=args.limit_jobs,
        force=args.force,
    )


def summarize(args: argparse.Namespace) -> dict[str, Any]:
    config = load_yaml(args.config)
    jobs = build_jobs(config, crawl_args(args))
    successful = latest_successful_job_ids(
        args.data_dir / "state" / "discovery_manifest.jsonl"
    )
    remaining = [
        job for job in jobs if args.force or job.job_id not in successful
    ]
    expected = build_expected_rows(config)

    if args.group:
        expected = expected.loc[expected["query_group"].isin(set(args.group))]
    if args.location:
        expected = expected.loc[expected["location_id"].isin(set(args.location))]
    if args.segment:
        expected = expected.loc[expected["segment_id"].isin(set(args.segment))]

    jobs_by_group: Counter[str] = Counter()
    target_by_group: Counter[str] = Counter()
    jobs_by_segment: Counter[str] = Counter()
    target_by_segment: Counter[str] = Counter()

    for job in remaining:
        jobs_by_group[job.query_group] += 1
        target_by_group[job.query_group] += job.configured_result_target
        jobs_by_segment[job.segment_id] += 1
        target_by_segment[job.segment_id] += job.configured_result_target

    minimum_by_group = (
        expected.groupby("query_group")["minimum_expected"].sum().to_dict()
        if not expected.empty
        else {}
    )
    cells_by_group = (
        expected.groupby("query_group").size().to_dict()
        if not expected.empty
        else {}
    )
    minimum_by_segment = (
        expected.groupby("segment_id")["minimum_expected"].sum().to_dict()
        if not expected.empty
        else {}
    )

    return {
        "locations": len({job.location_id for job in jobs}),
        "coverage_cells": int(len(expected)),
        "jobs_selected": len(jobs),
        "jobs_already_succeeded": len(
            [job for job in jobs if job.job_id in successful]
        ),
        "jobs_remaining": len(remaining),
        "configured_place_result_target": int(
            sum(job.configured_result_target for job in remaining)
        ),
        "minimum_clean_places_expected": int(
            expected["minimum_expected"].sum() if not expected.empty else 0
        ),
        "max_charge_per_run_usd": config["actor"].get(
            "max_total_charge_usd_per_run"
        )
        if args.max_charge_usd is None
        else args.max_charge_usd,
        "worst_case_remaining_cost_cap_usd": round(
            sum((job.max_charge_usd or 0) for job in remaining),
            2,
        ),
        "by_group": {
            group_name: {
                "jobs_remaining": int(jobs_by_group.get(group_name, 0)),
                "configured_place_result_target": int(
                    target_by_group.get(group_name, 0)
                ),
                "minimum_clean_places_expected": int(
                    minimum_by_group.get(group_name, 0)
                ),
                "coverage_cells": int(cells_by_group.get(group_name, 0)),
            }
            for group_name in config["query_groups"]
            if (
                jobs_by_group.get(group_name, 0)
                or minimum_by_group.get(group_name, 0)
            )
        },
        "by_segment": {
            segment["id"]: {
                "jobs_remaining": int(jobs_by_segment.get(segment["id"], 0)),
                "configured_place_result_target": int(
                    target_by_segment.get(segment["id"], 0)
                ),
                "minimum_clean_places_expected": int(
                    minimum_by_segment.get(segment["id"], 0)
                ),
            }
            for segment in config["segments"]
            if (
                jobs_by_segment.get(segment["id"], 0)
                or minimum_by_segment.get(segment["id"], 0)
            )
        },
    }


def main() -> int:
    print(json.dumps(summarize(parse_args()), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
