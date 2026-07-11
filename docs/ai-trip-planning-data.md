# AI Trip Planning Data

## Purpose

This document is the handoff for the current POI dataset that will feed
Loopin's AI-assisted trip-planning features. It explains what has been crawled,
what the dataset contains, where the artifacts live, and how the AI layer may
use the data without crossing the project's safety boundaries.

Project docs remain the source of truth. The POI dataset is suggestion data for
planning and context. It is not authoritative for safe regroup approval, route
detours, road direction, safe entry/exit, live ETA or convoy separation.

## Current Snapshot

Snapshot generated after the targeted crawl and validation pass on
2026-07-12.

| Metric | Value |
|---|---:|
| Raw crawl rows | 4,169 |
| Invalid or closed rows rejected | 0 |
| Outside search area rows rejected | 618 |
| Duplicate rows rejected | 192 |
| Clean unique rows | 3,359 |
| AI-ready dataset rows | 3,359 |
| Corridor locations covered | 28 |
| Route segments covered | 8 |
| Query groups represented | 8 |

The high-value trip-planning groups are ready for feature work:

| Group | Coverage status |
|---|---|
| `food` | No coverage gaps against the configured audit threshold |
| `attraction` | No coverage gaps against the configured audit threshold |

Remaining gaps are concentrated in optional or support groups:

| Group | Gap cells | Missing minimum rows |
|---|---:|---:|
| `accommodation` | 27 | 174 |
| `vehicle_repair` | 18 | 48 |
| `fuel` | 17 | 46 |
| `rest_stop` | 17 | 45 |
| `healthcare` | 15 | 42 |
| `parking` | 17 | 32 |

This is sufficient to start building AI trip planning. Do not spend more crawl
budget until the first feature flow shows which missing categories actually
matter.

## Artifacts

Primary artifacts are under:

```text
data_pipeline/apify_roadtrip_pipeline_v2/data/processed/
```

| File | Purpose |
|---|---|
| `places_ai_suggestions.jsonl` | Primary AI-ready dataset. Prefer this for app ingestion and streaming reads. |
| `places_ai_suggestions.csv` | Same AI-ready dataset in spreadsheet-friendly form. |
| `places_clean.csv` / `places_clean.jsonl` | Clean deduped POI rows with full retained structured columns. |
| `coverage_by_location_group.csv` | Coverage audit for every configured location/group cell. |
| `coverage_gaps.csv` | Remaining cells below minimum configured coverage. |
| `clean_summary.json` | Latest clean/rejection counts. |
| `rejected_outside_search_area.csv` | Rows rejected by geographic validation. |
| `rejected_duplicates.csv` | Rows rejected by dedupe. |

Raw Apify payloads remain under `data/raw/` for provenance and debugging, but
the AI feature should not ingest raw payloads directly.

## Dataset Contents

The current AI-ready dataset contains:

| Place type | Rows |
|---|---:|
| `food` | 1,498 |
| `attraction` | 938 |
| `healthcare` | 209 |
| `vehicle_repair` | 199 |
| `rest_stop` | 184 |
| `parking` | 139 |
| `fuel` | 107 |
| `accommodation` | 85 |

Segment distribution:

| Segment | Rows |
|---|---:|
| `01_can_tho_vinh_long` | 213 |
| `02_vinh_long_ho_chi_minh` | 638 |
| `03_ho_chi_minh_phan_thiet` | 677 |
| `04_phan_thiet_nha_trang` | 654 |
| `05_nha_trang_quy_nhon` | 553 |
| `06_quy_nhon_quang_ngai` | 201 |
| `07_quang_ngai_da_nang` | 292 |
| `08_da_nang_hue` | 131 |

Important column groups:

| Column group | Examples |
|---|---|
| Crawl provenance | `crawl_id`, `job_id`, `apify_run_id`, `apify_dataset_id`, `source_provider`, `source_actor_id` |
| Corridor and location context | `corridor_id`, `segment_id`, `segment_name`, `segment_order`, `location_id`, `search_location`, `validation_radius_km` |
| Place identity | `place_id`, `cid`, `fid`, `name`, `normalized_name`, `dedupe_key` |
| Place classification | `query_group`, `place_type`, `category_name`, `categories`, `ai_use_cases` |
| Geography | `latitude`, `longitude`, `distance_from_search_center_km`, `address`, `city`, `state`, `country_code` |
| Reputation and content | `rating`, `reviews_count`, `reviews_distribution`, `recent_review_text`, `recent_review_texts`, `review_snippets` |
| Opening and availability signals | `opening_hours`, `has_opening_hours`, `is_24_hours`, `temporarily_closed`, `permanently_closed` |
| Contact and media | `phone`, `phone_e164`, `website`, `google_maps_url`, `image_url`, `images_count` |
| Quality and AI flags | `completeness_score`, `source_confidence`, `source_confidence_reasons`, `eligible_for_ai_destination_suggestions` |
| Safety boundary flags | `regroup_seed_eligible`, `route_enrichment_status`, `safety_validation_status` |
| Dedupe provenance | `seen_crawl_stages`, `seen_segment_ids`, `seen_location_ids`, `seen_query_groups`, `duplicate_count` |

## Intended AI Uses

The first AI trip-planning feature should use this dataset for:

- Destination discovery along the Can Tho to Hue corridor.
- Meal stop suggestions by segment, city or trip leg.
- Attraction suggestions for itinerary building.
- Support POI context such as fuel, parking, healthcare, rest stops and repair.
- Natural-language explanations of why a candidate fits a user's preferences.
- Filtering and ranking candidate stops before a user commits them to a trip
  plan.

Recommended retrieval shape:

1. Filter by corridor/segment/location and requested place type.
2. Filter out rows with `eligible_for_ai_destination_suggestions = false`.
3. Prefer higher `source_confidence`, `completeness_score`, `rating` and
   `reviews_count`.
4. Use `ai_use_cases` to route a row into meal, attraction, lodging, support or
   roadside-support flows.
5. Let the LLM explain or summarize a bounded candidate set. Do not let it
   invent stops outside the candidate set.

## Safety Boundaries

The dataset may produce candidate seeds only. Before any candidate is used for
regrouping, navigation guidance or safety-sensitive action, deterministic code
must verify:

- Route compatibility and forward direction.
- Detour distance/time.
- Safe entry and exit.
- Parking and convoy capacity.
- Opening/accessibility status.
- Live ETA and fairness for affected convoy sections.
- Current map/routing provider evidence.
- Relevant safety policy version.

The AI layer may explain a vetted result, but it must not be the sole detector,
approver or validator for a driving-safety action.

## Known Gaps

- Accommodation is intentionally thin. Crawl more only when lodging planning is
  in the active feature scope.
- Support groups still have coverage gaps, but enough rows exist for prototype
  filtering and UI flows.
- The dataset has not been fully enriched by Place ID, so review/image/opening
  detail is useful but uneven.
- `distance_from_main_route`, `detour_time`, `road_direction`,
  `safe_entry_and_exit`, `regroup_fairness` and live ETA are not Apify outputs.
  They require the MapsProvider/routing layer and deterministic policy checks.
- Dataset freshness is tied to the crawl date. Re-run targeted crawls before a
  real pilot or production use.

## Next Implementation Step

Build the AI trip-planning slice against `places_ai_suggestions.jsonl`:

1. Add a typed dataset loader/schema for the AI-ready POI row.
2. Add deterministic filters for corridor, segment, place type, destination
   eligibility and minimum source confidence.
3. Add a simple scorer for trip-planning candidates.
4. Pass only the top bounded candidate set to the LLM for explanation,
   comparison and itinerary wording.
5. Keep regroup/safety flows separate until route enrichment and policy
   validation exist.

Useful local verification commands:

```powershell
cd data_pipeline/apify_roadtrip_pipeline_v2
.\.venv\Scripts\python.exe -m src.clean
.\.venv\Scripts\python.exe -m src.audit
.\.venv\Scripts\python.exe -m src.validate_outputs --min-rows 1
.\.venv\Scripts\python.exe -m unittest discover -s tests
```
