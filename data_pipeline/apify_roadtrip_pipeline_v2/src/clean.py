from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path
from typing import Any

import pandas as pd

from .common import haversine_km, write_jsonl


DEFAULT_DATA_DIR = Path("data")


AI_DATASET_EXCLUDED_COLUMNS = {
    "raw_item",
    "reviews",
    "questions_and_answers",
    "people_also_search",
}

AI_USE_CASES_BY_TYPE = {
    "accommodation": ["overnight_stay", "trip_planning"],
    "food": ["meal_stop", "trip_planning"],
    "attraction": ["destination_discovery", "trip_planning"],
    "fuel": ["fuel_support", "roadside_support"],
    "vehicle_repair": ["vehicle_support", "roadside_support"],
    "rest_stop": ["rest_break", "roadside_support"],
    "healthcare": ["emergency_support", "roadside_support"],
    "parking": ["parking_support", "roadside_support"],
}

REGROUP_SEED_TYPES = {
    "fuel",
    "healthcare",
    "parking",
    "rest_stop",
    "vehicle_repair",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Flatten, validate and deduplicate all Apify runs."
    )
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    return parser.parse_args()


def json_text(value: Any) -> str | None:
    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def parse_json_value(value: Any) -> Any:
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    if isinstance(value, (list, dict)):
        return value

    try:
        return json.loads(str(value))
    except (json.JSONDecodeError, TypeError, ValueError):
        return value


def parse_json_list(value: Any) -> list[Any]:
    parsed = parse_json_value(value)
    if parsed is None:
        return []
    if isinstance(parsed, list):
        return parsed
    return [parsed]


def normalize_text(value: Any) -> str:
    if value is None:
        return ""

    text = unicodedata.normalize("NFKD", str(value))
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def extract_review_texts(reviews: Any, limit: int = 10) -> list[str]:
    if not isinstance(reviews, list):
        return []

    texts: list[str] = []
    for review in reviews:
        if not isinstance(review, dict):
            continue
        text = review.get("text") or review.get("reviewText")
        if text and str(text).strip():
            texts.append(str(text).strip())
        if len(texts) >= limit:
            break

    return texts


def extract_review_snippets(reviews: Any, limit: int = 5) -> list[dict[str, Any]]:
    if not isinstance(reviews, list):
        return []

    snippets: list[dict[str, Any]] = []
    for review in reviews:
        if not isinstance(review, dict):
            continue

        text = review.get("text") or review.get("reviewText")
        if not text or not str(text).strip():
            continue

        snippets.append(
            {
                "text": str(text).strip(),
                "stars": review.get("stars") or review.get("rating"),
                "published_at": (
                    review.get("publishedAtDate")
                    or review.get("publishedAt")
                    or review.get("date")
                ),
            }
        )
        if len(snippets) >= limit:
            break

    return snippets


def infer_place_type(
    query_group: str | None,
    category_name: str | None,
    categories: Any,
) -> str:
    blob = " ".join(
        [
            normalize_text(query_group),
            normalize_text(category_name),
            normalize_text(categories),
        ]
    )

    rules = [
        ("accommodation", [
            "hotel", "hostel", "homestay", "motel", "resort",
            "guest house", "lodging", "khach san", "nha nghi",
        ]),
        ("food", [
            "restaurant", "cafe", "coffee", "food", "quan an",
            "nha hang", "bakery",
        ]),
        ("fuel", ["gas station", "petrol", "tram xang", "fuel"]),
        ("vehicle_repair", [
            "motorcycle repair", "car repair", "tire", "sua xe",
            "va lop", "roadside assistance", "cuu ho",
        ]),
        ("healthcare", [
            "hospital", "pharmacy", "clinic", "benh vien",
            "nha thuoc", "phong kham",
        ]),
        ("parking", ["parking", "bai do xe", "bai giu xe"]),
        ("rest_stop", [
            "rest stop", "convenience store", "public toilet",
            "tram dung chan", "cua hang tien loi", "nha ve sinh",
        ]),
        ("attraction", [
            "tourist attraction", "viewpoint", "beach", "campground",
            "museum", "park", "diem du lich", "diem ngam canh",
            "bai bien", "cam trai",
        ]),
    ]

    for place_type, keywords in rules:
        if any(keyword in blob for keyword in keywords):
            return place_type

    return query_group or "other"


def parse_is_24_hours(opening_hours: Any) -> bool:
    text = normalize_text(opening_hours)
    return any(
        signal in text
        for signal in [
            "open 24 hours",
            "24 hours",
            "mo cua 24 gio",
            "mo cua ca ngay",
        ]
    )


def has_value(value: Any) -> bool:
    if value is None:
        return False
    try:
        if pd.isna(value):
            return False
    except (TypeError, ValueError):
        pass
    return str(value).strip() != ""


def build_ai_use_cases(place_type: Any) -> str:
    use_cases = AI_USE_CASES_BY_TYPE.get(str(place_type), ["trip_planning"])
    return json.dumps(use_cases, ensure_ascii=False)


def route_enrichment_needed(place_type: Any) -> bool:
    return str(place_type) in {
        "fuel",
        "healthcare",
        "parking",
        "rest_stop",
        "vehicle_repair",
    }


def source_confidence(row: pd.Series) -> tuple[float, str]:
    score = 0.25
    reasons: list[str] = ["google_maps_apify_source"]

    if has_value(row.get("place_id")):
        score += 0.15
        reasons.append("stable_place_id")
    if has_value(row.get("latitude")) and has_value(row.get("longitude")):
        score += 0.15
        reasons.append("coordinates_present")
    if has_value(row.get("category_name")) or has_value(row.get("categories")):
        score += 0.10
        reasons.append("category_present")
    if has_value(row.get("rating")) or has_value(row.get("reviews_count")):
        score += 0.10
        reasons.append("reputation_present")
    if has_value(row.get("opening_hours")):
        score += 0.10
        reasons.append("opening_hours_present")
    if has_value(row.get("phone")) or has_value(row.get("website")):
        score += 0.05
        reasons.append("contact_present")
    if has_value(row.get("recent_review_text")):
        score += 0.05
        reasons.append("recent_review_text_present")
    if str(row.get("crawl_stage")) == "enrichment":
        score += 0.10
        reasons.append("detail_enriched")

    return round(min(score, 0.95), 2), json.dumps(reasons, ensure_ascii=False)


def load_runs(raw_dir: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    if not raw_dir.exists():
        return rows

    for metadata_path in sorted(raw_dir.rglob("run_metadata.json")):
        items_path = metadata_path.parent / "items.jsonl"
        if not items_path.exists():
            continue

        with metadata_path.open("r", encoding="utf-8") as file:
            metadata = json.load(file)

        with items_path.open("r", encoding="utf-8") as file:
            for line_number, line in enumerate(file, start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    item = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise ValueError(
                        f"Invalid JSONL at {items_path}:{line_number}"
                    ) from exc

                if isinstance(item, dict):
                    rows.append(flatten_item(item, metadata))

    return rows


def flatten_item(
    item: dict[str, Any],
    metadata: dict[str, Any],
) -> dict[str, Any]:
    location = item.get("location") or {}
    if not isinstance(location, dict):
        location = {}

    latitude = location.get("lat")
    longitude = location.get("lng")
    center_lat = metadata.get("location_center_lat")
    center_lng = metadata.get("location_center_lng")
    distance_to_center = haversine_km(
        latitude,
        longitude,
        center_lat,
        center_lng,
    )

    categories = item.get("categories")
    query_group = metadata.get("query_group")
    category_name = item.get("categoryName")
    reviews = item.get("reviews")
    review_texts = extract_review_texts(reviews)
    review_snippets = extract_review_snippets(reviews)

    opening_hours = item.get("openingHours")
    popular_times = {
        key: item.get(key)
        for key in [
            "popularTimesHistogram",
            "popularTimesLiveText",
            "popularTimesLivePercent",
            "popularTimesLiveStatus",
        ]
        if item.get(key) is not None
    }

    images = (
        item.get("imageUrls")
        or item.get("images")
        or item.get("imageCategories")
    )

    return {
        "crawl_id": metadata.get("crawl_id"),
        "crawl_stage": metadata.get("crawl_stage", "unknown"),
        "job_id": metadata.get("job_id"),
        "apify_run_id": metadata.get("run_id"),
        "apify_dataset_id": metadata.get("dataset_id"),
        "source_provider": "google_maps",
        "source_adapter": "apify",
        "source_actor_id": metadata.get("actor_id"),
        "corridor_id": metadata.get("corridor_id"),
        "segment_id": metadata.get("segment_id"),
        "segment_name": metadata.get("segment_name"),
        "segment_order": metadata.get("segment_order"),
        "location_id": metadata.get("location_id"),
        "search_location": metadata.get("location_query"),
        "location_center_lat": center_lat,
        "location_center_lng": center_lng,
        "validation_radius_km": metadata.get("validation_radius_km"),
        "distance_from_search_center_km": distance_to_center,
        "query_group": query_group,
        "configured_search_terms": json_text(metadata.get("search_terms")),
        "search_string": item.get("searchString"),
        "search_rank": item.get("rank"),
        "place_id": item.get("placeId"),
        "cid": item.get("cid"),
        "fid": item.get("fid"),
        "name": item.get("title"),
        "normalized_name": normalize_text(item.get("title")),
        "place_type": infer_place_type(
            query_group,
            category_name,
            categories,
        ),
        "category_name": category_name,
        "categories": json_text(categories),
        "description": item.get("description"),
        "address": item.get("address"),
        "neighborhood": item.get("neighborhood"),
        "street": item.get("street"),
        "city": item.get("city"),
        "postal_code": item.get("postalCode"),
        "state": item.get("state"),
        "country_code": item.get("countryCode"),
        "latitude": latitude,
        "longitude": longitude,
        "plus_code": item.get("plusCode"),
        "rating": item.get("totalScore"),
        "reviews_count": item.get("reviewsCount"),
        "reviews_distribution": json_text(
            item.get("reviewsDistribution")
        ),
        "reviews": json_text(reviews),
        "recent_review_texts": json_text(review_texts),
        "review_snippets": json_text(review_snippets),
        "recent_review_text": " | ".join(review_texts) or None,
        "has_review_text": bool(review_texts),
        "price_text": item.get("price"),
        "phone": item.get("phone"),
        "phone_e164": item.get("phoneUnformatted"),
        "website": item.get("website"),
        "google_maps_url": item.get("url"),
        "image_url": item.get("imageUrl"),
        "images": json_text(images),
        "images_count": item.get("imagesCount"),
        "opening_hours": json_text(opening_hours),
        "has_opening_hours": opening_hours is not None,
        "is_24_hours": parse_is_24_hours(opening_hours),
        "popular_times": json_text(popular_times or None),
        "additional_info": json_text(item.get("additionalInfo")),
        "questions_and_answers": json_text(
            item.get("questionsAndAnswers")
        ),
        "reviews_tags": json_text(item.get("reviewsTags")),
        "people_also_search": json_text(item.get("peopleAlsoSearch")),
        "hotel_stars": item.get("hotelStars"),
        "hotel_description": item.get("hotelDescription"),
        "hotel_review_summary": json_text(
            item.get("hotelReviewSummary")
        ),
        "hotel_amenities": json_text(item.get("hotelAmenities")),
        "is_advertisement": item.get("isAdvertisement"),
        "temporarily_closed": item.get("temporarilyClosed"),
        "permanently_closed": item.get("permanentlyClosed"),
        "is_external_service_place": item.get(
            "isExternalServicePlace"
        ),
        "external_service_provider": item.get(
            "externalServiceProvider"
        ),
        "scraped_at": item.get("scrapedAt"),
        "raw_item": json_text(item),
    }


def add_ai_fields(frame: pd.DataFrame) -> pd.DataFrame:
    work = frame.copy()
    confidence = work.apply(source_confidence, axis=1)
    work["source_confidence"] = [item[0] for item in confidence]
    work["source_confidence_reasons"] = [item[1] for item in confidence]
    work["ai_use_cases"] = work["place_type"].apply(build_ai_use_cases)
    work["eligible_for_ai_destination_suggestions"] = True
    work["regroup_seed_eligible"] = work["place_type"].astype(str).isin(
        REGROUP_SEED_TYPES
    )
    work["route_enrichment_status"] = work["place_type"].apply(
        lambda place_type: (
            "required_for_regroup"
            if route_enrichment_needed(place_type)
            else "optional_for_trip_planning"
        )
    )
    work["safety_validation_status"] = "not_validated_by_routing_or_policy"
    return work


def write_ai_dataset(clean: pd.DataFrame, output_dir: Path) -> int:
    ai_columns = [
        column
        for column in clean.columns
        if column not in AI_DATASET_EXCLUDED_COLUMNS
    ]
    ai_frame = clean.loc[
        clean["eligible_for_ai_destination_suggestions"].eq(True),
        ai_columns,
    ].copy()
    ai_frame.to_csv(
        output_dir / "places_ai_suggestions.csv",
        index=False,
        encoding="utf-8-sig",
    )
    write_jsonl(
        output_dir / "places_ai_suggestions.jsonl",
        ai_frame.where(pd.notna(ai_frame), None).to_dict(orient="records"),
    )
    return int(len(ai_frame))


def build_dedupe_key(row: pd.Series) -> str:
    place_id = row.get("place_id")
    if pd.notna(place_id) and str(place_id).strip():
        return f"place_id:{str(place_id).strip()}"

    name = str(row.get("normalized_name") or "")
    try:
        lat_key = f"{float(row.get('latitude')):.5f}"
        lng_key = f"{float(row.get('longitude')):.5f}"
    except (TypeError, ValueError):
        lat_key = ""
        lng_key = ""

    return f"fallback:{name}|{lat_key}|{lng_key}"


def aggregate_unique_json(series: pd.Series) -> str:
    values: list[str] = []
    seen: set[str] = set()

    for value in series:
        if pd.isna(value):
            continue
        text = str(value).strip()
        if not text or text in seen:
            continue
        seen.add(text)
        values.append(text)

    return json.dumps(values, ensure_ascii=False)


def clean_rows(rows: list[dict[str, Any]], output_dir: Path) -> dict[str, int]:
    output_dir.mkdir(parents=True, exist_ok=True)

    if not rows:
        print("No raw rows found. Run discovery first.")
        return {
            "raw_rows": 0,
            "invalid_or_closed_rows": 0,
            "outside_search_area_rows": 0,
            "duplicate_rows": 0,
            "clean_unique_rows": 0,
        }

    frame = pd.DataFrame(rows)
    frame.to_csv(
        output_dir / "places_flattened.csv",
        index=False,
        encoding="utf-8-sig",
    )

    numeric_columns = [
        "latitude",
        "longitude",
        "rating",
        "reviews_count",
        "segment_order",
        "distance_from_search_center_km",
        "validation_radius_km",
    ]
    for column in numeric_columns:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")

    closed_mask = (
        frame["permanently_closed"].fillna(False).eq(True)
        | frame["temporarily_closed"].fillna(False).eq(True)
    )
    invalid_mask = (
        frame["name"].isna()
        | frame["name"].astype(str).str.strip().eq("")
        | frame["latitude"].isna()
        | frame["longitude"].isna()
        | closed_mask
    )

    invalid = frame.loc[invalid_mask].copy()
    remaining = frame.loc[~invalid_mask].copy()

    outside_mask = (
        remaining["validation_radius_km"].notna()
        & remaining["distance_from_search_center_km"].notna()
        & (
            remaining["distance_from_search_center_km"]
            > remaining["validation_radius_km"]
        )
    )
    outside = remaining.loc[outside_mask].copy()
    valid = remaining.loc[~outside_mask].copy()

    invalid.to_csv(
        output_dir / "rejected_invalid_or_closed.csv",
        index=False,
        encoding="utf-8-sig",
    )
    outside.to_csv(
        output_dir / "rejected_outside_search_area.csv",
        index=False,
        encoding="utf-8-sig",
    )

    valid["dedupe_key"] = valid.apply(build_dedupe_key, axis=1)

    completeness_columns = [
        "address",
        "category_name",
        "rating",
        "reviews_count",
        "phone",
        "website",
        "opening_hours",
        "image_url",
        "recent_review_text",
        "additional_info",
    ]
    valid["completeness_score"] = valid[
        completeness_columns
    ].notna().sum(axis=1)
    valid = add_ai_fields(valid)

    valid["_stage_score"] = valid["crawl_stage"].map(
        {"enrichment": 2, "discovery": 1}
    ).fillna(0)
    valid["_reviews_sort"] = valid["reviews_count"].fillna(-1)
    valid["_rating_sort"] = valid["rating"].fillna(-1)

    valid = valid.sort_values(
        by=[
            "dedupe_key",
            "_stage_score",
            "completeness_score",
            "_reviews_sort",
            "_rating_sort",
            "scraped_at",
        ],
        ascending=[True, False, False, False, False, False],
        na_position="last",
    )

    provenance = (
        valid.groupby("dedupe_key", dropna=False)
        .agg(
            seen_crawl_stages=("crawl_stage", aggregate_unique_json),
            seen_segment_ids=("segment_id", aggregate_unique_json),
            seen_location_ids=("location_id", aggregate_unique_json),
            seen_query_groups=("query_group", aggregate_unique_json),
            seen_search_strings=("search_string", aggregate_unique_json),
            duplicate_count=("dedupe_key", "size"),
        )
        .reset_index()
    )

    duplicates = valid.loc[
        valid.duplicated("dedupe_key", keep="first")
    ].copy()
    duplicates.to_csv(
        output_dir / "rejected_duplicates.csv",
        index=False,
        encoding="utf-8-sig",
    )

    clean = valid.drop_duplicates("dedupe_key", keep="first").copy()
    clean = clean.merge(provenance, on="dedupe_key", how="left")
    clean = clean.drop(
        columns=["_stage_score", "_reviews_sort", "_rating_sort"],
        errors="ignore",
    )
    clean = clean.sort_values(
        by=["segment_order", "location_id", "place_type", "name"],
        na_position="last",
    )

    clean.to_csv(
        output_dir / "places_clean.csv",
        index=False,
        encoding="utf-8-sig",
    )
    write_jsonl(
        output_dir / "places_clean.jsonl",
        clean.where(pd.notna(clean), None).to_dict(orient="records"),
    )
    ai_dataset_rows = write_ai_dataset(clean, output_dir)

    summary = {
        "raw_rows": int(len(frame)),
        "invalid_or_closed_rows": int(len(invalid)),
        "outside_search_area_rows": int(len(outside)),
        "duplicate_rows": int(len(duplicates)),
        "clean_unique_rows": int(len(clean)),
        "ai_dataset_rows": ai_dataset_rows,
    }
    with (output_dir / "clean_summary.json").open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(summary, file, ensure_ascii=False, indent=2)

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"Clean CSV: {output_dir / 'places_clean.csv'}")
    print(f"AI dataset: {output_dir / 'places_ai_suggestions.jsonl'}")
    return summary


def main() -> int:
    args = parse_args()
    rows = load_runs(args.data_dir / "raw")
    clean_rows(rows, args.data_dir / "processed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
