import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import { RouteRequestSchema, type ErrorResponse, type RouteRequest } from "@loopin/tasco-maps";

import { buildGoldenRoutes, buildRankQuery, findPlaceById, MOCK_PLACES, rankPlaces } from "./mock-data.js";

export type TascoMockServerOptions = {
  readonly host?: string;
  readonly port?: number;
  readonly simulateRateLimitAfter?: number;
  readonly simulateTimeoutMs?: number;
  readonly requireAuth?: boolean;
};

export type RunningTascoMockServer = {
  readonly url: string;
  close(): Promise<void>;
};

function readRequestId(request: IncomingMessage): string {
  const header = request.headers["x-request-id"];
  return typeof header === "string" && header.length > 0 ? header : randomUUID();
}

function sendJson(response: ServerResponse, status: number, body: unknown, requestId: string): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Request-Id": requestId,
  });
  response.end(JSON.stringify(body));
}

function sendError(
  response: ServerResponse,
  status: number,
  code: ErrorResponse["error"]["code"],
  message: string,
  requestId: string,
  details?: Record<string, unknown>,
): void {
  sendJson(response, status, {
    error: details ? { code, message, details } : { code, message },
    requestId,
  }, requestId);
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function authorized(request: IncomingMessage, requireAuth: boolean): boolean {
  if (!requireAuth) return true;
  const bearer = request.headers.authorization;
  const apiKey = request.headers["x-api-key"];
  return (typeof bearer === "string" && bearer.startsWith("Bearer ")) || typeof apiKey === "string";
}

function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function createTascoMockServer(options: TascoMockServerOptions = {}): {
  readonly server: Server;
  listen(port?: number, host?: string): Promise<RunningTascoMockServer>;
} {
  let requestCount = 0;
  const host = options.host ?? "127.0.0.1";
  const requireAuth = options.requireAuth ?? false;

  const server = createServer(async (request, response) => {
    const requestId = readRequestId(request);
    const url = new URL(request.url ?? "/", "http://tasco.local");
    const pathname = normalizePath(url.pathname);
    requestCount += 1;

    if (options.simulateRateLimitAfter !== undefined && requestCount > options.simulateRateLimitAfter) {
      return sendError(response, 429, "rate_limited", "Too many requests.", requestId);
    }
    if (options.simulateTimeoutMs !== undefined && options.simulateTimeoutMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, options.simulateTimeoutMs));
      return sendError(response, 408, "timeout", "Upstream/service timeout.", requestId);
    }
    if (!authorized(request, requireAuth)) {
      return sendError(response, 401, "unauthorized", "Missing or invalid token/key.", requestId);
    }

    try {
      if (request.method === "GET" && (pathname === "/health" || pathname === "/healthz")) {
        return sendJson(response, 200, { status: "ok", service: "tasco-maps-mock", requestId }, requestId);
      }

      if (request.method === "GET" && (pathname === "/v1/search" || pathname === "/search" || pathname === "/v1/geocode-search")) {
        const q = url.searchParams.get("q");
        if (!q) return sendError(response, 400, "invalid_request", "q is required", requestId, { field: "q" });
        const ranked = rankPlaces(MOCK_PLACES, buildRankQuery({
          q,
          lat: parseNumber(url.searchParams.get("lat")),
          lon: parseNumber(url.searchParams.get("lon")),
          category: url.searchParams.get("category") ?? undefined,
          radiusMeters: parseNumber(url.searchParams.get("radiusMeters")),
        }));
        const limit = Math.min(parseNumber(url.searchParams.get("limit")) ?? 10, 20);
        return sendJson(response, 200, { query: q, results: ranked.slice(0, limit), meta: { limit, lang: url.searchParams.get("lang") ?? "vi" } }, requestId);
      }

      if (request.method === "GET" && (pathname === "/v1/autocomplete" || pathname === "/autocomplete")) {
        const q = url.searchParams.get("q");
        if (!q) return sendError(response, 400, "invalid_request", "q is required", requestId, { field: "q" });
        const ranked = rankPlaces(MOCK_PLACES, buildRankQuery({
          q,
          lat: parseNumber(url.searchParams.get("lat")),
          lon: parseNumber(url.searchParams.get("lon")),
        }));
        const limit = Math.min(parseNumber(url.searchParams.get("limit")) ?? 5, 10);
        const sessionId = url.searchParams.get("sessionId");
        return sendJson(response, 200, {
          query: q,
          suggestions: ranked.slice(0, limit),
          meta: sessionId ? { limit, sessionId } : { limit },
        }, requestId);
      }

      if (request.method === "GET" && (pathname.startsWith("/v1/poi/") || pathname.startsWith("/poi/"))) {
        const id = decodeURIComponent(pathname.replace(/^\/v1\/poi\//, "").replace(/^\/poi\//, ""));
        const poi = findPlaceById(id);
        if (!poi) return sendError(response, 404, "not_found", "POI not found.", requestId);
        return sendJson(response, 200, { poi }, requestId);
      }

      if (request.method === "GET" && (pathname === "/v1/reverse-geocoding" || pathname === "/reverse-geocoding" || pathname === "/v1/reverse")) {
        const lat = parseNumber(url.searchParams.get("lat") ?? url.searchParams.get("point.lat"));
        const lon = parseNumber(url.searchParams.get("lon") ?? url.searchParams.get("point.lon"));
        if (lat === undefined || lon === undefined) return sendError(response, 400, "invalid_request", "lat and lon are required.", requestId);
        const ranked = rankPlaces(MOCK_PLACES, buildRankQuery({ lat, lon, radiusMeters: parseNumber(url.searchParams.get("radiusMeters")) ?? 500 }));
        if (ranked.length === 0) return sendError(response, 404, "not_found", "No reverse-geocoding result.", requestId);
        return sendJson(response, 200, { results: ranked.slice(0, 1) }, requestId);
      }

      if (request.method === "GET" && (pathname === "/v1/nearby-search" || pathname === "/nearby-search")) {
        const lat = parseNumber(url.searchParams.get("lat"));
        const lon = parseNumber(url.searchParams.get("lon"));
        if (lat === undefined || lon === undefined) return sendError(response, 400, "invalid_request", "lat and lon are required.", requestId);
        const radiusMeters = Math.min(parseNumber(url.searchParams.get("radiusMeters")) ?? 1_000, 5_000);
        const ranked = rankPlaces(MOCK_PLACES, buildRankQuery({
          lat,
          lon,
          category: url.searchParams.get("category") ?? undefined,
          radiusMeters,
        }));
        const limit = Math.min(parseNumber(url.searchParams.get("limit")) ?? 10, 20);
        return sendJson(response, 200, { center: { lat, lon }, results: ranked.slice(0, limit), meta: { radiusMeters, limit } }, requestId);
      }

      if (request.method === "GET" && (pathname === "/v1/geocoding" || pathname === "/geocoding")) {
        const address = url.searchParams.get("address");
        if (!address) return sendError(response, 400, "invalid_request", "address is required", requestId, { field: "address" });
        const ranked = rankPlaces(MOCK_PLACES, buildRankQuery({
          q: address,
          lat: parseNumber(url.searchParams.get("lat")),
          lon: parseNumber(url.searchParams.get("lon")),
        }));
        const limit = Math.min(parseNumber(url.searchParams.get("limit")) ?? 5, 10);
        return sendJson(response, 200, { query: address, results: ranked.slice(0, limit) }, requestId);
      }

      if (request.method === "POST" && (pathname === "/v1/route" || pathname === "/route")) {
        let parsed: RouteRequest;
        try {
          parsed = RouteRequestSchema.parse(JSON.parse(await readBody(request)) as Record<string, unknown>);
        } catch {
          return sendError(response, 400, "invalid_request", "Invalid route request body.", requestId);
        }
        const alternates = parsed.alternates ?? 2;
        return sendJson(response, 200, { routes: buildGoldenRoutes(alternates), meta: { mode: parsed.mode ?? "auto", alternates } }, requestId);
      }

      return sendError(response, 404, "not_found", "Route not found.", requestId);
    } catch {
      return sendError(response, 500, "internal_error", "Unexpected service error.", requestId);
    }
  });

  return {
    server,
    listen(port = options.port ?? 8787, listenHost = host): Promise<RunningTascoMockServer> {
      return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, listenHost, () => {
          server.off("error", reject);
          const address = server.address();
          const resolvedPort = typeof address === "object" && address ? address.port : port;
          resolve({
            url: `http://${listenHost}:${resolvedPort}`,
            async close() {
              await new Promise<void>((closeResolve, closeReject) => {
                server.close((error) => (error ? closeReject(error) : closeResolve()));
              });
            },
          });
        });
      });
    },
  };
}
