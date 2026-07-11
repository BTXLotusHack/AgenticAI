import { applyTascoHeaders, resolveTascoHeaders, type HeaderProvider } from "./auth.js";
import { TascoMapsError } from "./errors.js";
import {
  AutocompleteResponseSchema,
  ErrorResponseSchema,
  GeocodingResponseSchema,
  HealthResponseSchema,
  NearbySearchResponseSchema,
  PoiDetailsResponseSchema,
  ReverseGeocodingResponseSchema,
  RouteRequestSchema,
  RouteResponseSchema,
  SearchResponseSchema,
  type AutocompleteResponse,
  type GeocodingResponse,
  type HealthResponse,
  type NearbySearchResponse,
  type PoiDetailsResponse,
  type ReverseGeocodingResponse,
  type RouteRequest,
  type RouteResponse,
  type SearchResponse,
} from "./schemas.js";
import type { z } from "zod";

export type TascoMapsClientConfig = {
  readonly baseUrl: string;
  readonly bearerToken?: string;
  readonly apiKey?: string;
  readonly headerProvider?: HeaderProvider;
  readonly locale?: string;
  readonly timezone?: string;
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
};

type QueryValue = string | number | boolean | undefined;

function buildUrl(baseUrl: string, path: string, query: Record<string, QueryValue> = {}): URL {
  const url = new URL(path.replace(/^\//, ""), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new TascoMapsError({
      code: "malformed_response",
      message: "Response body is not valid JSON.",
      requestId: response.headers.get("X-Request-Id") ?? "unknown",
      status: response.status,
      degraded: true,
    });
  }
}

export class TascoMapsClient {
  private readonly config: TascoMapsClientConfig;
  private readonly fetchImpl: typeof fetch;

  constructor(config: TascoMapsClientConfig) {
    this.config = config;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async health(requestId?: string): Promise<HealthResponse> {
    return this.get("/health", HealthResponseSchema, {}, requestId);
  }

  async search(params: {
    readonly q: string;
    readonly lat?: number;
    readonly lon?: number;
    readonly radiusMeters?: number;
    readonly bbox?: string;
    readonly category?: string;
    readonly limit?: number;
    readonly lang?: string;
    readonly requestId?: string;
  }): Promise<SearchResponse> {
    return this.get("/v1/search", SearchResponseSchema, {
      q: params.q,
      lat: params.lat,
      lon: params.lon,
      radiusMeters: params.radiusMeters,
      bbox: params.bbox,
      category: params.category,
      limit: params.limit,
      lang: params.lang ?? "vi",
    }, params.requestId);
  }

  async autocomplete(params: {
    readonly q: string;
    readonly lat?: number;
    readonly lon?: number;
    readonly limit?: number;
    readonly sessionId?: string;
    readonly lang?: string;
    readonly requestId?: string;
  }): Promise<AutocompleteResponse> {
    return this.get("/v1/autocomplete", AutocompleteResponseSchema, {
      q: params.q,
      lat: params.lat,
      lon: params.lon,
      limit: params.limit,
      sessionId: params.sessionId,
      lang: params.lang ?? "vi",
    }, params.requestId);
  }

  async poiDetails(params: {
    readonly id: string;
    readonly lang?: string;
    readonly include?: string;
    readonly requestId?: string;
  }): Promise<PoiDetailsResponse> {
    const query: Record<string, QueryValue> = { lang: params.lang ?? "vi" };
    if (params.include) query.include = params.include;
    return this.get(`/v1/poi/${encodeURIComponent(params.id)}`, PoiDetailsResponseSchema, query, params.requestId);
  }

  async reverseGeocoding(params: {
    readonly lat: number;
    readonly lon: number;
    readonly radiusMeters?: number;
    readonly lang?: string;
    readonly requestId?: string;
  }): Promise<ReverseGeocodingResponse> {
    return this.get("/v1/reverse-geocoding", ReverseGeocodingResponseSchema, {
      lat: params.lat,
      lon: params.lon,
      radiusMeters: params.radiusMeters,
      lang: params.lang ?? "vi",
    }, params.requestId);
  }

  async nearbySearch(params: {
    readonly lat: number;
    readonly lon: number;
    readonly radiusMeters?: number;
    readonly category?: string;
    readonly openNow?: boolean;
    readonly limit?: number;
    readonly lang?: string;
    readonly requestId?: string;
  }): Promise<NearbySearchResponse> {
    return this.get("/v1/nearby-search", NearbySearchResponseSchema, {
      lat: params.lat,
      lon: params.lon,
      radiusMeters: params.radiusMeters,
      category: params.category,
      openNow: params.openNow,
      limit: params.limit,
      lang: params.lang ?? "vi",
    }, params.requestId);
  }

  async geocoding(params: {
    readonly address: string;
    readonly city?: string;
    readonly district?: string;
    readonly lat?: number;
    readonly lon?: number;
    readonly limit?: number;
    readonly lang?: string;
    readonly requestId?: string;
  }): Promise<GeocodingResponse> {
    return this.get("/v1/geocoding", GeocodingResponseSchema, {
      address: params.address,
      city: params.city,
      district: params.district,
      lat: params.lat,
      lon: params.lon,
      limit: params.limit,
      lang: params.lang ?? "vi",
    }, params.requestId);
  }

  async route(body: RouteRequest & { readonly requestId?: string }): Promise<RouteResponse> {
    const { requestId, ...routeRequest } = body;
    return this.post("/v1/route", RouteResponseSchema, RouteRequestSchema.parse(routeRequest), requestId);
  }

  private async get<TSchema extends z.ZodType>(
    path: string,
    schema: TSchema,
    query: Record<string, QueryValue>,
    requestId?: string,
  ): Promise<z.infer<TSchema>> {
    return this.request(buildUrl(this.config.baseUrl, path, query), { method: "GET" }, schema, requestId);
  }

  private async post<TSchema extends z.ZodType>(
    path: string,
    schema: TSchema,
    body: unknown,
    requestId?: string,
  ): Promise<z.infer<TSchema>> {
    return this.request(buildUrl(this.config.baseUrl, path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, schema, requestId);
  }

  private async request<TSchema extends z.ZodType>(
    url: URL,
    init: RequestInit,
    schema: TSchema,
    requestId?: string,
  ): Promise<z.infer<TSchema>> {
    const headers = await resolveTascoHeaders({
      ...(this.config.bearerToken ? { bearerToken: this.config.bearerToken } : {}),
      ...(this.config.apiKey ? { apiKey: this.config.apiKey } : {}),
      ...(this.config.headerProvider ? { headerProvider: this.config.headerProvider } : {}),
      ...(this.config.locale ? { locale: this.config.locale } : {}),
      ...(this.config.timezone ? { timezone: this.config.timezone } : {}),
      ...(requestId ? { requestId } : {}),
    });
    const timeoutMs = this.config.timeoutMs ?? 10_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        ...init,
        headers: applyTascoHeaders(init.headers, headers),
        signal: controller.signal,
      });
      const payload = await parseJson(response);
      const responseRequestId =
        (typeof payload === "object" && payload !== null && "requestId" in payload
          ? String((payload as { requestId?: string }).requestId)
          : undefined)
        ?? response.headers.get("X-Request-Id")
        ?? headers.requestId;
      if (!response.ok) {
        const parsedError = ErrorResponseSchema.safeParse(payload);
        if (parsedError.success) throw TascoMapsError.fromErrorResponse(response.status, parsedError.data);
        throw new TascoMapsError({
          code: response.status === 429 ? "rate_limited" : response.status === 408 ? "timeout" : "internal_error",
          message: `Tasco Maps request failed with status ${response.status}.`,
          requestId: responseRequestId,
          status: response.status,
          retryable: response.status === 429 || response.status === 408 || response.status === 503,
          degraded: response.status === 503 || response.status === 408,
        });
      }
      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        throw new TascoMapsError({
          code: "malformed_response",
          message: "Tasco Maps response failed schema validation.",
          requestId: responseRequestId,
          status: response.status,
          degraded: true,
          details: { issues: parsed.error.issues },
        });
      }
      return parsed.data;
    } catch (error) {
      if (error instanceof TascoMapsError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new TascoMapsError({
          code: "timeout",
          message: `Tasco Maps request timed out after ${timeoutMs} ms.`,
          requestId: headers.requestId,
          status: 408,
          retryable: true,
          degraded: true,
        });
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
