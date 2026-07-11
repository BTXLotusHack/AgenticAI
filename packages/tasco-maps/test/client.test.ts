import { describe, expect, it } from "vitest";

import { resolveTascoHeaders, TascoMapsClient, TascoMapsError, toTascoPlaceRef } from "../src/index.js";

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("TascoMapsClient", () => {
  it("validates successful health, search and route responses", async () => {
    const fetchImpl = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.endsWith("/health")) {
        return jsonResponse({ status: "ok", service: "tasco-maps-mock", requestId: "req-1" });
      }
      if (url.includes("/v1/search")) {
        return jsonResponse({
          query: "coffee",
          results: [{
            id: "poi:coffee-house",
            type: "poi",
            name: "The Coffee House",
            label: "The Coffee House",
            address: "Thái Hà, Đống Đa, Hà Nội",
            category: "cafe",
            coordinates: { lat: 21.0129, lon: 105.8194 },
            source: "mock",
          }],
          meta: { limit: 5, lang: "vi" },
        });
      }
      if (url.endsWith("/v1/route")) {
        return jsonResponse({
          routes: [{
            routeId: "route:primary",
            sourceIndex: 0,
            summary: { distanceMeters: 1000, durationSeconds: 120 },
            geometry: { type: "LineString", coordinates: [[105.8, 21.0], [105.9, 21.1]] },
            maneuvers: [{
              instruction: "Tiếp tục an toàn theo tuyến.",
              distanceMeters: 1000,
              durationSeconds: 120,
              beginShapeIndex: 0,
              endShapeIndex: 1,
              streetNames: ["QL5"],
            }],
          }],
          meta: { mode: "auto", alternates: 0 },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    const client = new TascoMapsClient({ baseUrl: "http://mock.local", fetchImpl, apiKey: "fixture-key" });
    await expect(client.health("req-health")).resolves.toMatchObject({ status: "ok" });
    const search = await client.search({ q: "coffee", limit: 5 });
    expect(search.results[0]?.name).toBe("The Coffee House");
    const route = await client.route({
      locations: [{ lat: 21.0285, lon: 105.8542 }, { lat: 20.9507, lon: 107.0732 }],
      alternates: 0,
    });
    expect(route.routes[0]?.routeId).toBe("route:primary");
  });

  it("maps 429 rate limits to retryable errors", async () => {
    const client = new TascoMapsClient({
      baseUrl: "http://mock.local",
      fetchImpl: async () => jsonResponse({
        error: { code: "rate_limited", message: "Too many requests." },
        requestId: "req-429",
      }, 429),
    });

    await expect(client.search({ q: "coffee" })).rejects.toMatchObject({
      code: "rate_limited",
      retryable: true,
      status: 429,
    } satisfies Partial<TascoMapsError>);
  });

  it("maps client timeouts to degraded retryable errors", async () => {
    const client = new TascoMapsClient({
      baseUrl: "http://mock.local",
      timeoutMs: 5,
      fetchImpl: (_input, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      }),
    });

    await expect(client.health()).rejects.toMatchObject({
      code: "timeout",
      retryable: true,
      degraded: true,
      status: 408,
    } satisfies Partial<TascoMapsError>);
  });

  it("rejects malformed JSON and schema-invalid responses", async () => {
    const brokenJson = new TascoMapsClient({
      baseUrl: "http://mock.local",
      fetchImpl: async () => new Response("not-json", { status: 200 }),
    });
    await expect(brokenJson.health()).rejects.toMatchObject({ code: "malformed_response", degraded: true });

    const invalidSchema = new TascoMapsClient({
      baseUrl: "http://mock.local",
      fetchImpl: async () => jsonResponse({ status: "broken" }),
    });
    await expect(invalidSchema.health()).rejects.toMatchObject({ code: "malformed_response", degraded: true });
  });

  it("supports bearer token and API key via header provider", async () => {
    const headers = await resolveTascoHeaders({
      bearerToken: "fixture-token",
      apiKey: "fixture-api-key",
      requestId: "req-auth",
      locale: "vi-VN",
      timezone: "Asia/Ho_Chi_Minh",
    });
    expect(headers.authorization).toBe("Bearer fixture-token");
    expect(headers.apiKey).toBe("fixture-api-key");
    expect(headers.requestId).toBe("req-auth");
  });

  it("normalizes Tasco place results into the shared place reference contract", () => {
    const place = toTascoPlaceRef({
      id: "poi:poi001-minh-chau-rest-stop",
      type: "poi",
      name: "Minh Chau Rest Stop",
      label: "Minh Chau Rest Stop",
      address: "QL5, Km 62, Hung Yen",
      category: "rest_stop",
      coordinates: { lat: 20.8724, lon: 106.0518 },
      source: "mock",
      tags: ["parking", "fuel", "rest_stop"],
      rating: 4.4,
    }, "tasco-mock-2026-06-25");

    expect(place).toEqual({
      id: "poi:poi001-minh-chau-rest-stop",
      provider: "tasco",
      name: "Minh Chau Rest Stop",
      address: "QL5, Km 62, Hung Yen",
      coordinates: { lat: 20.8724, lon: 106.0518 },
      categories: ["rest_stop", "parking", "fuel"],
      ratingSummary: { averageRating: 4.4, reviewCount: 0, source: "tasco" },
      sourceVersion: "tasco-mock-2026-06-25",
    });
  });

  it("sends request ids as headers without polluting strict route payload validation", async () => {
    let capturedBody: unknown;
    let capturedRequestId: string | null = null;
    const client = new TascoMapsClient({
      baseUrl: "http://mock.local",
      fetchImpl: async (_input, init) => {
        capturedBody = JSON.parse(String(init?.body)) as unknown;
        const headers = new Headers(init?.headers);
        capturedRequestId = headers.get("X-Request-Id");
        return jsonResponse({
          routes: [{
            routeId: "route:custom",
            sourceIndex: 0,
            summary: { distanceMeters: 1000, durationSeconds: 120 },
            geometry: { type: "LineString", coordinates: [[105.8, 21.0], [105.9, 21.1]] },
            maneuvers: [{
              instruction: "Continue safely.",
              distanceMeters: 1000,
              durationSeconds: 120,
              beginShapeIndex: 0,
              endShapeIndex: 1,
              streetNames: ["QL5"],
            }],
          }],
          meta: { mode: "auto", alternates: 0 },
        });
      },
    });

    await client.route({
      locations: [{ lat: 21.0285, lon: 105.8542 }, { lat: 20.9507, lon: 107.0732 }],
      alternates: 0,
      requestId: "req-route-1",
    });

    expect(capturedRequestId).toBe("req-route-1");
    expect(capturedBody).toEqual({
      locations: [{ lat: 21.0285, lon: 105.8542 }, { lat: 20.9507, lon: 107.0732 }],
      alternates: 0,
    });
  });
});
