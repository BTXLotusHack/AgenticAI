# Apify Road-trip Places Pipeline v2

Pipeline thu thập Google Maps POI cho hành lang đường bộ **Cần Thơ -> Huế**,
phục vụ AI trip planning trong Loopin.

Docs của project vẫn là source of truth: dữ liệu crawl chỉ là input gợi ý địa
điểm. Không dùng riêng POI crawl để quyết định regroup an toàn, detour, hướng
vào/ra đường, ETA live hoặc khoảng cách đoàn xe.

## Mục tiêu dataset

Dataset best-practice cần:

- Trải đều qua các tỉnh/thành và chặng trên hành lang.
- Ưu tiên nhóm phổ biến cho trip planning: ăn uống, điểm tham quan, lưu trú.
- Có nhóm hỗ trợ hành trình: xăng, sửa xe, trạm dừng, y tế, bãi đỗ.
- Giữ provenance: corridor, segment, location, query group, Apify run/dataset.
- Có tọa độ, loại địa điểm, rating/review count, opening signals, contact/site
  khi có.
- Có cờ ranh giới an toàn: `safety_validation_status`,
  `route_enrichment_status`, `regroup_seed_eligible`.
- Không chứa raw crawl payload, full review payload, danh tính reviewer hoặc
  social-profile enrichment trong output AI-ready.

Knowledge base/RAG output đã được bỏ khỏi pipeline hiện tại. Khi cần KB sẽ build
lại từ dataset structured này ở một bước riêng.

## Kiến trúc hai tầng

```text
Discovery crawl
-> raw JSONL
-> clean + geographic validation + dedupe
-> AI-ready structured dataset
-> coverage audit
-> select high-value candidates
-> enrichment crawl by Place ID
-> clean lại để merge dữ liệu chi tiết
-> validate dataset contract
```

## Cài đặt

Yêu cầu Python 3.10+.

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Thêm token vào `.env`:

```env
APIFY_API_TOKEN=your_real_token
```

Hoặc dùng script Windows:

```powershell
.\setup_pipeline.bat
```

Preflight không gọi Apify và không in token:

```powershell
.\.venv\Scripts\python.exe -m src.preflight --require-token
```

## Tính toán số lượng cần crawl

Xem toàn bộ plan mà không gọi Apify:

```powershell
.\.venv\Scripts\python.exe -m src.estimate_plan
```

Plan hiện tại cho full corridor có:

```text
locations: 28
coverage_cells: 218
jobs_selected: 218
configured_place_result_target: 7075
minimum_clean_places_expected: 864
default max charge per run: 2.0 USD
worst-case full cost cap: 436.0 USD
```

Nhóm cần crawl:

```text
accommodation: 27 jobs, target 1708, min expected 179
food:          27 jobs, target 1708, min expected 218
attraction:    28 jobs, target 1308, min expected 117
fuel:          28 jobs, target 218,  min expected 76
vehicle_repair:27 jobs, target 642,  min expected 74
rest_stop:     28 jobs, target 654,  min expected 76
healthcare:    25 jobs, target 489,  min expected 70
parking:       28 jobs, target 348,  min expected 54
```

Best-practice order:

1. Crawl support groups first: `fuel`, `vehicle_repair`, `rest_stop`,
   `healthcare`, `parking`.
2. Crawl popular planning groups next: `food`, `attraction`.
3. Crawl `accommodation` after coverage gaps are known, because this group has
   high volume and can be enriched selectively.
4. Run `clean`, `audit`, `validate_outputs` after each batch.
5. Fix locations with zero/low yield before spending more on enrichment.

## Discovery

Dry-run:

```powershell
.\.venv\Scripts\python.exe -m src.crawl --dry-run
```

Pilot:

```powershell
.\run_discovery_pilot.bat
```

Dataset pilot:

```powershell
.\run_destination_dataset_pilot.bat
```

Support batch example:

```powershell
.\.venv\Scripts\python.exe -m src.crawl `
  --group fuel `
  --group vehicle_repair `
  --group rest_stop `
  --group healthcare `
  --group parking `
  --max-charge-usd 0.75 `
  --execute
```

Popular trip-planning batch example:

```powershell
.\.venv\Scripts\python.exe -m src.crawl `
  --group food `
  --group attraction `
  --max-charge-usd 0.75 `
  --execute
```

Discovery mặc định:

```text
customGeolocation = center + validation_radius_km polygon
scrapePlaceDetailPage = false
maxReviews = 0
maxImages = 0
skipClosedPlaces = true
```

Pipeline uu tien `customGeolocation` thay vi `locationQuery` khi location co
`center` va `validation_radius_km`. Cach nay tranh loi free-text geocoding tra
ve sai polygon cho cac diem nho nhu Cai Be, Mui Ne, Vinh Hy hoac Song Cau. Neu
can quay lai free-text geocoding, set `use_custom_geolocation_from_center:
false` trong `config/crawl_plan.yaml`.

Không dùng `--details` cho toàn bộ discovery trừ khi đã chấp nhận chi phí cao
hơn. Enrichment nên chạy bằng Place ID sau khi dedupe.

## Current dataset snapshot

Latest validated snapshot for AI trip planning:

```text
raw_rows: 4169
invalid_or_closed_rows: 0
outside_search_area_rows: 618
duplicate_rows: 192
clean_unique_rows: 3359
ai_dataset_rows: 3359
locations_covered: 28
segments_covered: 8
query_groups_represented: 8
```

AI-ready place types:

```text
food:              1498
attraction:         938
healthcare:         209
vehicle_repair:     199
rest_stop:          184
parking:            139
fuel:               107
accommodation:       85
```

`food` and `attraction` have no remaining coverage gaps against the configured
audit threshold. Remaining gaps are mostly `accommodation` and support groups,
so the dataset is enough to start AI trip-planning feature work without spending
more crawl budget.

See `../../docs/ai-trip-planning-data.md` for the feature handoff: what fields
exist, how to load the dataset, what AI may use, and which safety boundaries
still require deterministic map/routing validation.

## Clean, audit, validate

```powershell
.\.venv\Scripts\python.exe -m src.clean
.\.venv\Scripts\python.exe -m src.audit
.\.venv\Scripts\python.exe -m src.validate_outputs --min-rows 1
```

Output chính:

```text
data/processed/
├── places_flattened.csv
├── places_clean.csv
├── places_clean.jsonl
├── places_ai_suggestions.csv
├── places_ai_suggestions.jsonl
├── rejected_invalid_or_closed.csv
├── rejected_outside_search_area.csv
├── rejected_duplicates.csv
├── clean_summary.json
├── coverage_by_location_group.csv
└── coverage_gaps.csv
```

`places_ai_suggestions.*` là artifact chính cho AI trip planning. `coverage_gaps.csv`
cho biết location/group nào còn thiếu dữ liệu để crawl bổ sung.

## Enrichment

Xem trước:

```powershell
.\.venv\Scripts\python.exe -m src.enrich --dry-run
```

Pilot:

```powershell
.\run_enrichment_pilot.bat
```

Enrichment dùng:

```text
placeIds
scrapePlaceDetailPage = true
reviewsSort = newest
reviewsStartDate = 2 years
reviewsOrigin = google
scrapeReviewsPersonalData = false
maxReviews = 2-5 tùy group
maxImages = 1-3 tùy group
```

Sau enrichment:

```powershell
.\.venv\Scripts\python.exe -m src.clean
.\.venv\Scripts\python.exe -m src.audit
.\.venv\Scripts\python.exe -m src.validate_outputs --min-rows 100
```

## Resume và force

Job thành công được ghi trong:

```text
data/state/discovery_manifest.jsonl
data/state/enrichment_manifest.jsonl
```

Chạy lại cùng lệnh sẽ skip job thành công.

Cố ý crawl lại:

```powershell
.\.venv\Scripts\python.exe -m src.crawl `
  --location hue `
  --group food `
  --force `
  --execute
```

## Cost guards

Mỗi run mặc định có:

```yaml
max_total_charge_usd_per_run: 2.0
```

Override:

```powershell
.\.venv\Scripts\python.exe -m src.crawl --max-charge-usd 0.75 --pilot --execute
```

Đây là cap cho **mỗi run**, không phải tổng toàn pipeline.

## Những việc vẫn phải làm sau crawl

Apify không tự xác nhận chính xác:

```text
distance_from_main_route
detour_time
road_direction
safe_entry_and_exit
regroup_fairness
live convoy ETA
```

Các field này cần routing engine, MapsProvider, policy deterministic và dữ liệu
GPS real-time. POI dataset chỉ cung cấp ứng viên và ngữ cảnh cho AI trip
planning.
