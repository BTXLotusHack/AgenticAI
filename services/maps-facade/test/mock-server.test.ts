import { describe, expect, it } from "vitest";

import { TascoMapsClient, TascoMapsError } from "@loopin/tasco-maps";

import { createTascoMockServer } from "../src/mock-server.js";
import { TASCO_PLACE_IDS } from "../src/mock-data.js";

describe("Tasco mock facade", () => {
  it("serves organizer search example on /search alias", async () => {
    const running = await createTascoMockServer().listen(0);
    const response = await fetch(`${running.url}/search?q=coffee`);
    const body = await response.json() as { query: string; results: Array<{ id: string; label: string }> };
    expect(body.query).toBe("coffee");
    expect(body.results[0]?.id).toBe(TASCO_PLACE_IDS.coffeeHouse);
    await running.close();
  });

  it("calls all seven APIs with validated responses", async () => {
    const running = await createTascoMockServer().listen(0);
    const client = new TascoMapsClient({ baseUrl: running.url, apiKey: "fixture-key" });

    await expect(client.health("req-health")).resolves.toMatchObject({ status: "ok" });
    const search = await client.search({ q: "coffee", limit: 5 });
    expect(search.results[0]?.id).toBe(TASCO_PLACE_IDS.coffeeHouse);

    const autocomplete = await client.autocomplete({ q: "Minh", sessionId: "s-123" });
    expect(autocomplete.suggestions[0]?.name).toContain("Minh");

    const poi = await client.poiDetails({ id: TASCO_PLACE_IDS.minhChauRestStop });
    expect(poi.poi.name).toBe("Minh Châu Rest Stop");

    const reverse = await client.reverseGeocoding({ lat: 21.0166, lon: 105.7833 });
    expect(reverse.results[0]?.coordinates.lat).toBeTypeOf("number");

    const nearby = await client.nearbySearch({ lat: 20.8724, lon: 106.0518, category: "rest_stop", limit: 3 });
    expect(nearby.results.length).toBeGreaterThan(0);

    const geocode = await client.geocoding({ address: "Phạm Hùng Nam Từ Liêm Hà Nội" });
    expect(geocode.results[0]?.name).toBe("Phạm Hùng");

    const route = await client.route({
      locations: [{ lat: 21.0285, lon: 105.8542 }, { lat: 20.9507, lon: 107.0732 }],
      alternates: 2,
      language: "vi-VN",
    });
    expect(route.routes).toHaveLength(2);

    await running.close();
  });

  it("preserves Vietnamese diacritics and stable place IDs", async () => {
    const running = await createTascoMockServer().listen(0);
    const client = new TascoMapsClient({ baseUrl: running.url });
    const search = await client.search({ q: "Hồ Hoàn Kiếm" });
    expect(search.results[0]?.id).toBe(TASCO_PLACE_IDS.hoanKiemLake);
    expect(search.results[0]?.name).toBe("Hồ Hoàn Kiếm");
    await running.close();
  });

  it("returns route alternatives for golden R001", async () => {
    const running = await createTascoMockServer().listen(0);
    const client = new TascoMapsClient({ baseUrl: running.url });
    const route = await client.route({
      locations: [{ lat: 21.0285, lon: 105.8542 }, { lat: 20.9507, lon: 107.0732 }],
      alternates: 2,
    });
    expect(route.routes.map((item) => item.routeId)).toEqual(["route:r001-primary", "route:r001-alternate-1"]);
    expect(route.routes[0]?.geometry.coordinates[0]).toEqual([105.8542, 21.0285]);
    await running.close();
  });

  it("maps 429 rate limits to retryable degraded errors", async () => {
    const running = await createTascoMockServer({ simulateRateLimitAfter: 1 }).listen(0);
    const client = new TascoMapsClient({ baseUrl: running.url });
    await client.health();
    await expect(client.search({ q: "coffee" })).rejects.toMatchObject({
      code: "rate_limited",
      retryable: true,
      status: 429,
    } satisfies Partial<TascoMapsError>);
    await running.close();
  });

  it("requires auth when configured and accepts bearer or API key", async () => {
    const running = await createTascoMockServer({ requireAuth: true }).listen(0);
    const unauthorized = new TascoMapsClient({ baseUrl: running.url });
    await expect(unauthorized.search({ q: "coffee" })).rejects.toMatchObject({ code: "unauthorized" });

    const bearerClient = new TascoMapsClient({ baseUrl: running.url, bearerToken: "fixture-token" });
    await expect(bearerClient.search({ q: "coffee" })).resolves.toBeDefined();

    const apiKeyClient = new TascoMapsClient({
      baseUrl: running.url,
      headerProvider: async () => ({ apiKey: "fixture-api-key" }),
    });
    await expect(apiKeyClient.search({ q: "coffee" })).resolves.toBeDefined();
    await running.close();
  });
});
