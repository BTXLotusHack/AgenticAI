from __future__ import annotations

import argparse
import json
import os
import sys
import traceback
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from dotenv import load_dotenv

from .common import (
    append_jsonl,
    get_mapping_or_attr,
    get_location_index,
    load_yaml,
    read_jsonl,
    stable_hash,
    utc_now_iso,
    write_json,
    write_jsonl,
)


DEFAULT_CONFIG = Path("config/crawl_plan.yaml")
DEFAULT_DATA_DIR = Path("data")


@dataclass(frozen=True)
class EnrichmentJob:
    job_id: str
    actor_id: str
    corridor_id: str
    segment_id: str
    segment_name: str
    segment_order: int
    location_id: str
    location_query: str
    center_lat: float | None
    center_lng: float | None
    validation_radius_km: float | None
    query_group: str
    place_ids: tuple[str, ...]
    actor_input: dict[str, Any]
    max_charge_usd: float | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Enrich selected clean POIs by Google Place ID."
    )
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--location", action="append")
    parser.add_argument("--group", action="append")
    parser.add_argument("--batch-size", type=int)
    parser.add_argument("--max-charge-usd", type=float)
    parser.add_argument("--pilot", action="store_true")
    parser.add_argument("--limit-jobs", type=int)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def parse_json_list(value: Any) -> list[str]:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return []

    if isinstance(value, list):
        return [str(item) for item in value]

    try:
        parsed = json.loads(str(value))
    except (json.JSONDecodeError, TypeError):
        return [str(value)]

    if isinstance(parsed, list):
        return [str(item) for item in parsed]
    return [str(parsed)]


def already_enriched_place_ids(raw_dir: Path) -> set[str]:
    enriched: set[str] = set()

    if not raw_dir.exists():
        return enriched

    for metadata_path in raw_dir.rglob("run_metadata.json"):
        try:
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue

        if metadata.get("crawl_stage") != "enrichment":
            continue

        items_path = metadata_path.parent / "items.jsonl"
        if not items_path.exists():
            continue

        for row in read_jsonl(items_path):
            place_id = row.get("placeId")
            if place_id:
                enriched.add(str(place_id))

    return enriched


def candidate_score(frame: pd.DataFrame) -> pd.Series:
    rating = pd.to_numeric(frame["rating"], errors="coerce").fillna(0)
    reviews = pd.to_numeric(
        frame["reviews_count"],
        errors="coerce",
    ).fillna(0)
    completeness = pd.to_numeric(
        frame.get("completeness_score", 0),
        errors="coerce",
    ).fillna(0)

    rating_score = rating / 5
    review_score = np.log1p(reviews).clip(upper=8) / 8
    completeness_score = completeness.clip(upper=10) / 10

    return (
        0.55 * rating_score
        + 0.30 * review_score
        + 0.15 * completeness_score
    )


def select_candidates(
    frame: pd.DataFrame,
    config: dict[str, Any],
    selected_groups: set[str],
    selected_locations: set[str],
    force: bool,
    enriched_ids: set[str],
) -> pd.DataFrame:
    required = {"place_id", "location_id", "query_group"}
    missing = required.difference(frame.columns)
    if missing:
        raise ValueError(
            f"places_clean.csv is missing columns: {sorted(missing)}"
        )

    groups = config["query_groups"]
    location_index = get_location_index(config)

    work = frame.copy()
    work = work.loc[work["place_id"].notna()].copy()
    work["place_id"] = work["place_id"].astype(str)

    if selected_locations:
        work = work.loc[
            work["location_id"].astype(str).isin(selected_locations)
        ].copy()

    if not force:
        work = work.loc[~work["place_id"].isin(enriched_ids)].copy()

    chosen_rows: list[pd.DataFrame] = []
    assigned_place_ids: set[str] = set()

    ordered_groups = sorted(
        groups.items(),
        key=lambda item: int(item[1].get("priority", 100)),
    )

    for group_name, group_config in ordered_groups:
        enrich_config = group_config.get("enrichment") or {}
        if not group_config.get("enabled", True):
            continue
        if not enrich_config.get("enabled", False):
            continue
        if selected_groups and group_name not in selected_groups:
            continue

        group_mask = work.apply(
            lambda row: (
                str(row.get("query_group")) == group_name
                or group_name
                in parse_json_list(row.get("seen_query_groups"))
                or str(row.get("place_type")) == group_name
            ),
            axis=1,
        )
        group_frame = work.loc[group_mask].copy()
        group_frame = group_frame.loc[
            ~group_frame["place_id"].isin(assigned_place_ids)
        ].copy()

        if group_frame.empty:
            continue

        min_rating = float(enrich_config.get("min_rating", 0))
        min_reviews = int(
            enrich_config.get("min_reviews_count", 0)
        )
        rating = pd.to_numeric(
            group_frame["rating"],
            errors="coerce",
        ).fillna(0)
        reviews = pd.to_numeric(
            group_frame["reviews_count"],
            errors="coerce",
        ).fillna(0)

        # Critical roadside groups intentionally allow unrated places.
        group_frame = group_frame.loc[
            (rating >= min_rating) & (reviews >= min_reviews)
        ].copy()
        if group_frame.empty:
            continue

        group_frame["_candidate_score"] = candidate_score(group_frame)
        per_location_limit = int(
            enrich_config.get("per_location_limit", 10)
        )

        for location_id, location_frame in group_frame.groupby(
            "location_id",
            dropna=False,
        ):
            location_id_str = str(location_id)
            if location_id_str not in location_index:
                continue

            selected = (
                location_frame.sort_values(
                    by=[
                        "_candidate_score",
                        "reviews_count",
                        "rating",
                    ],
                    ascending=[False, False, False],
                    na_position="last",
                )
                .head(per_location_limit)
                .copy()
            )
            selected["_enrichment_group"] = group_name
            chosen_rows.append(selected)
            assigned_place_ids.update(
                selected["place_id"].astype(str).tolist()
            )

    if not chosen_rows:
        return pd.DataFrame()

    result = pd.concat(chosen_rows, ignore_index=True)
    return result.drop_duplicates("place_id", keep="first")


def build_jobs(
    candidates: pd.DataFrame,
    config: dict[str, Any],
    args: argparse.Namespace,
) -> list[EnrichmentJob]:
    if candidates.empty:
        return []

    actor = config["actor"]
    defaults = config.get("enrichment_defaults") or {}
    groups = config["query_groups"]
    location_index = get_location_index(config)

    default_batch_size = int(defaults.get("batch_size", 40))
    batch_size = (
        int(args.batch_size)
        if args.batch_size is not None
        else default_batch_size
    )
    if batch_size < 1:
        raise ValueError("--batch-size must be at least 1.")

    jobs: list[EnrichmentJob] = []

    for (group_name, location_id), subset in candidates.groupby(
        ["_enrichment_group", "location_id"],
        dropna=False,
    ):
        group_name = str(group_name)
        location_id = str(location_id)
        group_config = groups[group_name]
        enrich_config = group_config.get("enrichment") or {}
        location = location_index[location_id]

        place_ids = subset["place_id"].astype(str).tolist()
        if args.pilot:
            place_ids = place_ids[:5]

        for offset in range(0, len(place_ids), batch_size):
            batch = place_ids[offset : offset + batch_size]
            if not batch:
                continue

            actor_input: dict[str, Any] = {
                "placeIds": batch,
                "language": actor.get("language", "vi"),
                "skipClosedPlaces": bool(
                    actor.get("skip_closed_places", True)
                ),
                "scrapePlaceDetailPage": True,
                "maxReviews": int(
                    enrich_config.get(
                        "max_reviews",
                        defaults.get("max_reviews", 3),
                    )
                ),
                "reviewsStartDate": str(
                    enrich_config.get(
                        "reviews_start_date",
                        defaults.get("reviews_start_date", "2 years"),
                    )
                ),
                "reviewsSort": str(
                    enrich_config.get(
                        "reviews_sort",
                        defaults.get("reviews_sort", "newest"),
                    )
                ),
                "reviewsOrigin": str(
                    enrich_config.get(
                        "reviews_origin",
                        defaults.get("reviews_origin", "google"),
                    )
                ),
                "scrapeReviewsPersonalData": False,
                "maxImages": int(
                    enrich_config.get(
                        "max_images",
                        defaults.get("max_images", 1),
                    )
                ),
                "scrapeImageAuthors": False,
                "scrapeContacts": False,
                "maximumLeadsEnrichmentRecords": 0,
                "scrapeSocialMediaProfiles": {
                    "facebooks": False,
                    "instagrams": False,
                    "youtubes": False,
                    "tiktoks": False,
                    "twitters": False,
                },
            }

            max_charge = (
                args.max_charge_usd
                if args.max_charge_usd is not None
                else actor.get("max_total_charge_usd_per_run")
            )

            identity = {
                "stage": "enrichment",
                "group": group_name,
                "location_id": location_id,
                "place_ids": sorted(batch),
                "actor_input": actor_input,
            }

            jobs.append(
                EnrichmentJob(
                    job_id=stable_hash(identity),
                    actor_id=actor["id"],
                    corridor_id=config["corridor"]["id"],
                    segment_id=location["segment_id"],
                    segment_name=location["segment_name"],
                    segment_order=location["segment_order"],
                    location_id=location_id,
                    location_query=location["query"],
                    center_lat=location.get("center_lat"),
                    center_lng=location.get("center_lng"),
                    validation_radius_km=location.get(
                        "validation_radius_km"
                    ),
                    query_group=group_name,
                    place_ids=tuple(batch),
                    actor_input=actor_input,
                    max_charge_usd=(
                        float(max_charge)
                        if max_charge is not None
                        else None
                    ),
                )
            )

    if args.limit_jobs is not None:
        if args.limit_jobs < 1:
            raise ValueError("--limit-jobs must be at least 1.")
        jobs = jobs[: args.limit_jobs]

    return jobs


def latest_successful_job_ids(manifest_path: Path) -> set[str]:
    latest: dict[str, str] = {}
    for row in read_jsonl(manifest_path):
        job_id = row.get("job_id")
        status = row.get("status")
        if job_id and status:
            latest[str(job_id)] = str(status)
    return {key for key, value in latest.items() if value == "SUCCEEDED"}


def print_plan(
    jobs: list[EnrichmentJob],
    successful: set[str],
    force: bool,
) -> None:
    remaining = [
        job for job in jobs if force or job.job_id not in successful
    ]
    total_places = sum(len(job.place_ids) for job in remaining)

    print(f"Enrichment jobs selected: {len(jobs)}")
    print(f"Jobs that will run: {len(remaining)}")
    print(f"Unique Place IDs scheduled: {total_places}")
    print()

    for index, job in enumerate(jobs, start=1):
        marker = (
            "SKIP"
            if job.job_id in successful and not force
            else "RUN "
        )
        print(
            f"{index:03d} [{marker}] {job.location_id} | "
            f"{job.query_group} | place_ids={len(job.place_ids)} | "
            f"reviews={job.actor_input['maxReviews']} | "
            f"images={job.actor_input['maxImages']} | "
            f"cap=${job.max_charge_usd}"
        )


def fetch_dataset_items(client: Any, dataset_id: str) -> list[dict[str, Any]]:
    return [
        item
        for item in client.dataset(dataset_id).iterate_items()
        if isinstance(item, dict)
    ]


def run_job(
    client: Any,
    job: EnrichmentJob,
    data_dir: Path,
    manifest_path: Path,
) -> None:
    started_at = utc_now_iso()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    append_jsonl(
        manifest_path,
        {
            "job_id": job.job_id,
            "crawl_stage": "enrichment",
            "status": "RUNNING",
            "started_at": started_at,
            "location_id": job.location_id,
            "query_group": job.query_group,
            "requested_place_ids": list(job.place_ids),
        },
    )

    print(
        f"\nStarting enrichment: {job.location_id} / "
        f"{job.query_group} / {len(job.place_ids)} places"
    )

    try:
        call_kwargs: dict[str, Any] = {"run_input": job.actor_input}
        if job.max_charge_usd is not None:
            call_kwargs["max_total_charge_usd"] = Decimal(
                str(job.max_charge_usd)
            )

        result = client.actor(job.actor_id).call(**call_kwargs)
        if not result:
            raise RuntimeError("Apify returned an empty Actor run.")

        run_id = get_mapping_or_attr(result, "id")
        dataset_id = get_mapping_or_attr(
            result,
            "defaultDatasetId",
            "default_dataset_id",
        )
        if not dataset_id:
            raise RuntimeError(
                f"Missing defaultDatasetId for run {run_id}."
            )

        items = fetch_dataset_items(client, dataset_id)
        returned_place_ids = sorted(
            {
                str(item["placeId"])
                for item in items
                if item.get("placeId")
            }
        )

        run_dir = (
            data_dir
            / "raw"
            / "enrichment"
            / stamp[:8]
            / job.segment_id
            / job.location_id
            / job.query_group
            / f"{stamp}_{run_id or job.job_id}"
        )

        metadata = {
            "crawl_id": f"{stamp}_{job.job_id}",
            "crawl_stage": "enrichment",
            "job_id": job.job_id,
            "actor_id": job.actor_id,
            "run_id": run_id,
            "dataset_id": dataset_id,
            "actor_status": get_mapping_or_attr(result, "status"),
            "corridor_id": job.corridor_id,
            "segment_id": job.segment_id,
            "segment_name": job.segment_name,
            "segment_order": job.segment_order,
            "location_id": job.location_id,
            "location_query": job.location_query,
            "location_center_lat": job.center_lat,
            "location_center_lng": job.center_lng,
            "validation_radius_km": job.validation_radius_km,
            "query_group": job.query_group,
            "search_terms": [],
            "requested_place_ids": list(job.place_ids),
            "returned_place_ids": returned_place_ids,
            "max_charge_usd": job.max_charge_usd,
            "item_count": len(items),
            "started_at": started_at,
            "completed_at": utc_now_iso(),
        }

        write_json(run_dir / "actor_input.json", job.actor_input)
        write_json(run_dir / "run_metadata.json", metadata)
        write_json(run_dir / "items.json", items)
        write_jsonl(run_dir / "items.jsonl", items)

        append_jsonl(
            manifest_path,
            {
                **metadata,
                "status": "SUCCEEDED",
                "raw_directory": str(run_dir),
            },
        )
        print(f"Saved {len(items):,} enriched items to {run_dir}")

    except Exception as exc:
        append_jsonl(
            manifest_path,
            {
                "job_id": job.job_id,
                "crawl_stage": "enrichment",
                "status": "FAILED",
                "started_at": started_at,
                "failed_at": utc_now_iso(),
                "location_id": job.location_id,
                "query_group": job.query_group,
                "requested_place_ids": list(job.place_ids),
                "error_type": type(exc).__name__,
                "error": str(exc),
                "traceback": traceback.format_exc(),
            },
        )
        print(
            f"FAILED {job.location_id}/{job.query_group}: {exc}",
            file=sys.stderr,
        )


def main() -> int:
    args = parse_args()
    load_dotenv()

    config = load_yaml(args.config)
    clean_path = args.data_dir / "processed" / "places_clean.csv"
    if not clean_path.exists():
        print(
            "places_clean.csv does not exist. Run: python -m src.clean",
            file=sys.stderr,
        )
        return 2

    frame = pd.read_csv(clean_path)
    enriched_ids = already_enriched_place_ids(args.data_dir / "raw")
    candidates = select_candidates(
        frame=frame,
        config=config,
        selected_groups=set(args.group or []),
        selected_locations=set(args.location or []),
        force=args.force,
        enriched_ids=enriched_ids,
    )

    jobs = build_jobs(candidates, config, args)
    if not jobs:
        print("No enrichment candidates matched the current rules.")
        return 0

    manifest_path = args.data_dir / "state" / "enrichment_manifest.jsonl"
    successful = latest_successful_job_ids(manifest_path)
    print_plan(jobs, successful, args.force)

    candidate_path = (
        args.data_dir / "processed" / "enrichment_candidates.csv"
    )
    candidate_path.parent.mkdir(parents=True, exist_ok=True)
    candidates.to_csv(candidate_path, index=False, encoding="utf-8-sig")
    print(f"Candidate CSV: {candidate_path}")

    if args.dry_run or not args.execute:
        if not args.execute and not args.dry_run:
            print("\nNo Apify calls were made. Add --execute to run.")
        return 0

    token = os.getenv("APIFY_API_TOKEN")
    if not token:
        print("APIFY_API_TOKEN is missing from .env.", file=sys.stderr)
        return 2

    try:
        from apify_client import ApifyClient
    except ImportError:
        print("Run: pip install -r requirements.txt", file=sys.stderr)
        return 2

    client = ApifyClient(token)
    for job in jobs:
        if job.job_id in successful and not args.force:
            continue
        run_job(client, job, args.data_dir, manifest_path)

    print("\nRun `python -m src.clean` again to merge enriched records.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
