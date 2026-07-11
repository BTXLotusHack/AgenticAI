# Loopin Tasco Maps facade

Framework-independent Tasco Maps client and deterministic mock server for hackathon development.

## Run the mock facade

```powershell
npm.cmd run dev:maps
```

Default URL: `http://127.0.0.1:8787`

If Loopin local convoy services also need port 8787, start one of them on a different port:

```powershell
$env:TASCO_MOCK_PORT = "8788"; npm.cmd run dev:maps
$env:LOOPIN_LOCAL_PORT = "8789"; npm.cmd run dev:services
```

## Packages

| Package | Role |
|---|---|
| `@loopin/tasco-maps` | Typed, Zod-validated HTTP client |
| `@loopin/maps-facade` | Deterministic mock server and OpenAPI contract |

## Client usage

```ts
import { TascoMapsClient } from "@loopin/tasco-maps";

const client = new TascoMapsClient({
  baseUrl: process.env.TASCO_MAPS_BASE_URL ?? "http://127.0.0.1:8787",
  headerProvider: async () => ({ apiKey: process.env.TASCO_MAPS_API_KEY! }),
  locale: "vi-VN",
  timezone: "Asia/Ho_Chi_Minh",
});

const search = await client.search({ q: "coffee", limit: 5 });
```

Never expose bearer tokens or API keys in browser bundles. Resolve credentials server-side or through environment-backed header providers.

## Contract

OpenAPI: `openapi/tasco-maps-v1.yaml`

Authoritative PDF: `reference-materials/tasco/tasco_maps_hackathon_api_documentation.pdf`

## Deterministic fixtures

Stable place IDs align with workbook POI001–POI003:

- `poi:poi001-minh-chau-rest-stop`
- `poi:poi002-highway-shoulder-km62`
- `poi:poi003-ha-long-service-area`

Golden route `R001` returns a primary and alternate route with WGS84 `LineString` geometry.
