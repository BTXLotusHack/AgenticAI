# Loopin reference materials

These tracked inputs let local, worktree, CI and remote agents use the same source material. Extracted copies and temporary rendering output are ignored; the original files below are intentionally committed.

## Required reading order

1. `tasco/tasco_maps_hackathon_api_documentation.pdf`
2. `old-loopin/trip-itinerary-generation.zip`
3. `datasets/ai_maps_track7_dataset_participants.xlsx`

The Tasco PDF is authoritative for map/search/POI/route API compatibility. The old Loopin ZIP is a UX and product-flow reference, not code to copy wholesale. The workbook is synthetic hackathon fixture data used by the deterministic convoy scenario.

## Files

| File | Purpose | SHA-256 |
|---|---|---|
| `tasco/tasco_maps_hackathon_api_documentation.pdf` | Search, autocomplete, POI, reverse geocoding, nearby search, geocoding and route contracts | `57689F0B63AD207EF49F778C2FB6CA36810FB8B8D676385E64A313940C2C0795` |
| `old-loopin/trip-itinerary-generation.zip` | Previous Next.js itinerary, discovery, social and profile UX reference | `FF1AA59728E50AC560F4B6CF4BB0AF2DB858E233381DE2834B2422DA40582982` |
| `datasets/ai_maps_track7_dataset_participants.xlsx` | Synthetic trip/member/route/POI/GPS/event fixture source | `CAD0966A64A6D3179F6B09EA526F065D690EC3708745A1386DDE3CE9FCF772DA` |

## Agent constraints

- Read the Tasco PDF before designing or implementing map/place features.
- Every displayed map place and route must originate from the Tasco API or its documented deterministic mock.
- User ratings and comments may enrich a Tasco place, but must reference its stable Tasco place ID and remain identified as user-generated data.
- Keep API base URLs and authentication configurable. Never hardcode bearer tokens or API keys in web or mobile clients.
- Preserve WGS84 coordinates, Vietnamese text and diacritics, stable IDs, request IDs and documented error behavior.
- Extract the ZIP only into an ignored `extracted/` directory or an operating-system temporary directory.
- Do not commit generated screenshots, rendered PDF pages, dependency directories or extracted copies.

## Local extraction example

```powershell
Expand-Archive `
  -LiteralPath reference-materials/old-loopin/trip-itinerary-generation.zip `
  -DestinationPath reference-materials/old-loopin/extracted
```

