from __future__ import annotations

import argparse
import os
import sys
import traceback
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from math import cos, radians
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from .common import (
    append_jsonl,
    get_mapping_or_attr,
    load_yaml,
    read_jsonl,
    stable_hash,
    utc_now_iso,
    write_json,
    write_jsonl,
)


DEFAULT_CONFIG = Path("config/crawl_plan.yaml")
DEFAULT_DATA_DIR = Path("data")
KM_PER_LATITUDE_DEGREE = 110.574
KM_PER_LONGITUDE_DEGREE_AT_EQUATOR = 111.320


@dataclass(frozen=True)
class DiscoveryJob:
    job_id: str
    actor_id: str
    corridor_id: str
    corridor_name: str
    segment_id: str
    segment_name: str
    segment_order: int
    location_id: str
    location_query: str
    center_lat: float | None
    center_lng: float | None
    validation_radius_km: float | None
    query_group: str
    search_terms: tuple[str, ...]
    actor_input: dict[str, Any]
    max_charge_usd: float | None

    @property
    def configured_result_target(self) -> int:
        return len(self.search_terms) * int(
            self.actor_input["maxCrawledPlacesPerSearch"]
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Discovery crawl for the Cần Thơ → Huế road-trip POI dataset."
    )
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--segment", action="append")
    parser.add_argument("--location", action="append")
    parser.add_argument("--group", action="append")
    parser.add_argument(
        "--max-results",
        type=int,
        help="Override places per search term for every selected job.",
    )
    parser.add_argument(
        "--details",
        action="store_true",
        help="Force detail-page scraping during discovery. Usually unnecessary.",
    )
    parser.add_argument(
        "--max-charge-usd",
        type=float,
        help="Maximum charge for each Apify run.",
    )
    parser.add_argument(
        "--pilot",
        action="store_true",
        help="Use one term and at most five results per job.",
    )
    parser.add_argument("--limit-jobs", type=int)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def validate_config(config: dict[str, Any]) -> None:
    required = {"corridor", "actor", "query_groups", "segments"}
    missing = required.difference(config)
    if missing:
        raise ValueError(f"Missing config sections: {sorted(missing)}")


def build_custom_geolocation(
    location: dict[str, Any],
    actor: dict[str, Any],
) -> dict[str, Any] | None:
    explicit = location.get("custom_geolocation")
    if explicit:
        return explicit

    if not actor.get("use_custom_geolocation_from_center", False):
        return None

    center = location.get("center") or []
    if len(center) != 2:
        return None

    radius_km = location.get("crawl_radius_km")
    if radius_km is None:
        radius_km = location.get("validation_radius_km")
    if radius_km is None:
        return None

    lat = float(center[0])
    lng = float(center[1])
    radius = float(radius_km)
    if radius <= 0:
        return None

    lat_delta = radius / KM_PER_LATITUDE_DEGREE
    lng_delta = radius / (
        KM_PER_LONGITUDE_DEGREE_AT_EQUATOR
        * max(0.1, cos(radians(lat)))
    )
    west = round(lng - lng_delta, 6)
    east = round(lng + lng_delta, 6)
    south = round(lat - lat_delta, 6)
    north = round(lat + lat_delta, 6)

    return {
        "type": "Polygon",
        "coordinates": [
            [
                [west, south],
                [east, south],
                [east, north],
                [west, north],
                [west, south],
            ]
        ],
    }


def build_jobs(
    config: dict[str, Any],
    args: argparse.Namespace,
) -> list[DiscoveryJob]:
    validate_config(config)

    corridor = config["corridor"]
    actor = config["actor"]
    groups = config["query_groups"]

    selected_segments = set(args.segment or [])
    selected_locations = set(args.location or [])
    selected_groups = set(args.group or [])

    unknown_groups = selected_groups.difference(groups)
    if unknown_groups:
        raise ValueError(f"Unknown query groups: {sorted(unknown_groups)}")

    jobs: list[DiscoveryJob] = []

    for segment in sorted(config["segments"], key=lambda item: int(item["order"])):
        if selected_segments and segment["id"] not in selected_segments:
            continue

        for location in segment["locations"]:
            if selected_locations and location["id"] not in selected_locations:
                continue

            allowed_groups = set(location.get("groups") or groups.keys())
            center = location.get("center") or [None, None]
            result_factor = float(location.get("result_factor", 1.0))

            for group_name, group_config in groups.items():
                if not group_config.get("enabled", True):
                    continue
                if group_name not in allowed_groups:
                    continue
                if selected_groups and group_name not in selected_groups:
                    continue

                terms = list(group_config.get("search_terms") or [])
                if not terms:
                    continue

                base_max = int(group_config.get("max_places_per_search", 10))
                max_results = (
                    int(args.max_results)
                    if args.max_results is not None
                    else max(1, round(base_max * result_factor))
                )

                if max_results < 1:
                    raise ValueError("--max-results must be at least 1.")

                if args.pilot:
                    terms = terms[:1]
                    max_results = min(max_results, 5)

                details_enabled = bool(
                    args.details
                    or actor.get("discovery_scrape_place_detail_page", False)
                )

                actor_input: dict[str, Any] = {
                    "searchStringsArray": terms,
                    "maxCrawledPlacesPerSearch": max_results,
                    "language": actor.get("language", "vi"),
                    "searchMatching": "all",
                    "website": "allPlaces",
                    "skipClosedPlaces": bool(
                        actor.get("skip_closed_places", True)
                    ),
                    "scrapePlaceDetailPage": details_enabled,
                    "maxReviews": 0,
                    "maxImages": 0,
                    "scrapeReviewsPersonalData": False,
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
                custom_geolocation = build_custom_geolocation(location, actor)
                if custom_geolocation:
                    actor_input["customGeolocation"] = custom_geolocation
                else:
                    actor_input["locationQuery"] = location["query"]

                max_charge = (
                    args.max_charge_usd
                    if args.max_charge_usd is not None
                    else actor.get("max_total_charge_usd_per_run")
                )

                identity = {
                    "stage": "discovery",
                    "corridor_id": corridor["id"],
                    "segment_id": segment["id"],
                    "location_id": location["id"],
                    "query_group": group_name,
                    "actor_input": actor_input,
                }

                jobs.append(
                    DiscoveryJob(
                        job_id=stable_hash(identity),
                        actor_id=actor["id"],
                        corridor_id=corridor["id"],
                        corridor_name=corridor["name"],
                        segment_id=segment["id"],
                        segment_name=segment["name"],
                        segment_order=int(segment["order"]),
                        location_id=location["id"],
                        location_query=location["query"],
                        center_lat=center[0],
                        center_lng=center[1],
                        validation_radius_km=location.get(
                            "validation_radius_km"
                        ),
                        query_group=group_name,
                        search_terms=tuple(terms),
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

    return {job_id for job_id, status in latest.items() if status == "SUCCEEDED"}


def print_plan(
    jobs: list[DiscoveryJob],
    successful_job_ids: set[str],
    force: bool,
) -> None:
    remaining = [
        job
        for job in jobs
        if force or job.job_id not in successful_job_ids
    ]
    target = sum(job.configured_result_target for job in remaining)

    print(f"Discovery jobs selected: {len(jobs)}")
    print(f"Jobs that will run: {len(remaining)}")
    print(f"Configured result target: {target:,} place-results")
    print("Each run is independently protected by max_total_charge_usd.")
    print()

    for index, job in enumerate(jobs, start=1):
        skipped = job.job_id in successful_job_ids and not force
        marker = "SKIP" if skipped else "RUN "
        print(
            f"{index:03d} [{marker}] {job.segment_id} | "
            f"{job.location_id} | {job.query_group} | "
            f"terms={len(job.search_terms)} | "
            f"target={job.configured_result_target} | "
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
    job: DiscoveryJob,
    data_dir: Path,
    manifest_path: Path,
) -> None:
    started_at = utc_now_iso()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    append_jsonl(
        manifest_path,
        {
            "job_id": job.job_id,
            "crawl_stage": "discovery",
            "status": "RUNNING",
            "started_at": started_at,
            "segment_id": job.segment_id,
            "location_id": job.location_id,
            "query_group": job.query_group,
        },
    )

    print(
        f"\nStarting discovery: {job.segment_id} / "
        f"{job.location_id} / {job.query_group}"
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
        run_dir = (
            data_dir
            / "raw"
            / "discovery"
            / stamp[:8]
            / job.segment_id
            / job.location_id
            / job.query_group
            / f"{stamp}_{run_id or job.job_id}"
        )

        metadata = {
            "crawl_id": f"{stamp}_{job.job_id}",
            "crawl_stage": "discovery",
            "job_id": job.job_id,
            "actor_id": job.actor_id,
            "run_id": run_id,
            "dataset_id": dataset_id,
            "actor_status": get_mapping_or_attr(result, "status"),
            "corridor_id": job.corridor_id,
            "corridor_name": job.corridor_name,
            "segment_id": job.segment_id,
            "segment_name": job.segment_name,
            "segment_order": job.segment_order,
            "location_id": job.location_id,
            "location_query": job.location_query,
            "location_center_lat": job.center_lat,
            "location_center_lng": job.center_lng,
            "validation_radius_km": job.validation_radius_km,
            "query_group": job.query_group,
            "search_terms": list(job.search_terms),
            "configured_result_target": job.configured_result_target,
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
        print(f"Saved {len(items):,} discovery items to {run_dir}")

    except Exception as exc:
        append_jsonl(
            manifest_path,
            {
                "job_id": job.job_id,
                "crawl_stage": "discovery",
                "status": "FAILED",
                "started_at": started_at,
                "failed_at": utc_now_iso(),
                "segment_id": job.segment_id,
                "location_id": job.location_id,
                "query_group": job.query_group,
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
    jobs = build_jobs(config, args)
    if not jobs:
        print("No jobs matched the selected filters.")
        return 0

    manifest_path = args.data_dir / "state" / "discovery_manifest.jsonl"
    successful = latest_successful_job_ids(manifest_path)
    print_plan(jobs, successful, args.force)

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

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
