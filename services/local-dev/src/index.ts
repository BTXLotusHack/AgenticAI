import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Duplex } from "node:stream";

import { WebSocketServer, WebSocket } from "ws";
import { ZodError } from "zod";

import {
  ApplicationError,
  type FixtureMapsProvider,
  type Identity,
  type LoopinApplication,
  type Publisher,
  type TripRepository,
} from "@loopin/application";
import { LocationTelemetryV1Schema, type ApiError, type RealtimeEventV1 } from "@loopin/contracts";

type LocalServerDependencies = {
  readonly app: Pick<LoopinApplication, "joinTrip" | "setReadiness" | "getLiveSnapshot" | "processTelemetry" | "approveRegroup" | "completeTrip" | "getSummary">;
  readonly repository: TripRepository;
  readonly maps: FixtureMapsProvider;
  readonly realtime: LocalRealtimeHub;
  readonly allowedOrigins: readonly string[];
  readonly deadlineMs?: number;
  readonly logger?: { log(record: Readonly<Record<string, unknown>>): void };
};

export type RunningLocalServer = {
  readonly url: string;
  readonly wsUrl: string;
  close(): Promise<void>;
};

type Subscription = {
  readonly tripId: string;
  readonly userId: string;
  readonly channel: string;
  readonly memberId: string;
  readonly role: "leader" | "member";
};

class LocalUnauthorizedError extends Error {}
class LocalDeadlineError extends Error {}
class LocalPayloadTooLargeError extends Error {}
class LocalUnsupportedMediaTypeError extends Error {}

function identityFromAuthorization(value: string | undefined): Identity | undefined {
  const match = /^Bearer fixture:([A-Za-z0-9_-]+)$/.exec(value ?? "");
  return match?.[1] ? { userId: match[1] } : undefined;
}

function identityFromUpgrade(request: IncomingMessage): Identity | undefined {
  const headerIdentity = identityFromAuthorization(request.headers.authorization);
  if (headerIdentity) return headerIdentity;
  const protocols = (request.headers["sec-websocket-protocol"] ?? "").split(",").map((value) => value.trim());
  const fixtureProtocol = protocols.find((value) => /^loopin\.fixture\.[A-Za-z0-9_-]+$/.test(value));
  return fixtureProtocol ? { userId: fixtureProtocol.slice("loopin.fixture.".length) } : undefined;
}

function channelAllowed(channel: string, tripId: string, memberId: string, role: "leader" | "member"): boolean {
  if (channel === `/trip/${tripId}/state` || channel === `/trip/${tripId}/situations`) return true;
  if (channel === `/trip/${tripId}/member/${memberId}/alerts`) return true;
  return role === "leader" && channel === `/trip/${tripId}/leader/actions`;
}

export class LocalRealtimeHub implements Publisher<RealtimeEventV1> {
  private readonly server = new WebSocketServer({ noServer: true, maxPayload: 32 * 1024 });
  private readonly subscriptions = new Map<WebSocket, Subscription>();

  constructor(private readonly repository: TripRepository) {
    this.server.on("connection", (socket: WebSocket, _request: IncomingMessage, subscription: Subscription) => {
      this.subscriptions.set(socket, subscription);
      socket.on("close", () => this.subscriptions.delete(socket));
    });
  }

  async publish(channel: string, payload: RealtimeEventV1): Promise<void> {
    const encoded = JSON.stringify(payload);
    for (const [socket, subscription] of this.subscriptions) {
      if (socket.readyState !== WebSocket.OPEN || subscription.channel !== channel) continue;
      if (subscription.tripId !== payload.tripId) continue;
      const state = await this.repository.get(subscription.tripId);
      const currentMember = state?.members.find((member) => member.userId === subscription.userId);
      if (!currentMember || currentMember.memberId !== subscription.memberId || currentMember.role !== subscription.role) {
        socket.close(1008, "Membership changed");
        continue;
      }
      if (payload.audience.kind === "leader" && subscription.role !== "leader") continue;
      if (payload.audience.kind === "member" && subscription.memberId !== payload.audience.memberId) continue;
      socket.send(encoded);
    }
  }

  async handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer, allowedOrigins: readonly string[]): Promise<void> {
    try {
      const url = new URL(request.url ?? "/", "http://local.loopin");
      if (url.pathname !== "/v1/realtime") return this.reject(socket, 404, "Not Found");
      const origin = request.headers.origin;
      if (origin && !allowedOrigins.includes(origin)) return this.reject(socket, 403, "Forbidden");
      const identity = identityFromUpgrade(request);
      if (!identity) return this.reject(socket, 401, "Unauthorized");
      const tripId = url.searchParams.get("tripId") ?? "";
      const channel = url.searchParams.get("channel") ?? "";
      const state = await this.repository.get(tripId);
      const member = state?.members.find((candidate) => candidate.userId === identity.userId);
      if (!state || !member || !channelAllowed(channel, tripId, member.memberId, member.role)) {
        return this.reject(socket, 403, "Forbidden");
      }
      const subscription: Subscription = {
        tripId,
        userId: identity.userId,
        channel,
        memberId: member.memberId,
        role: member.role,
      };
      this.server.handleUpgrade(request, socket, head, (webSocket) => {
        this.server.emit("connection", webSocket, request, subscription);
      });
    } catch {
      this.reject(socket, 400, "Bad Request");
    }
  }

  async close(): Promise<void> {
    const sockets = [...this.subscriptions.keys()];
    for (const socket of sockets) socket.close(1001, "Server shutdown");
    await Promise.race([
      Promise.all(sockets.map((socket) => new Promise<void>((resolve) => {
        if (socket.readyState === WebSocket.CLOSED) return resolve();
        socket.once("close", () => resolve());
      }))),
      new Promise<void>((resolve) => setTimeout(resolve, 250)),
    ]);
    for (const socket of sockets) {
      if (socket.readyState !== WebSocket.CLOSED) socket.terminate();
    }
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }

  private reject(socket: Duplex, status: number, label: string): void {
    socket.write(`HTTP/1.1 ${status} ${label}\r\nConnection: close\r\n\r\n`);
    socket.destroy();
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown, origin?: string): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-content-type-options", "nosniff");
  if (origin) {
    response.setHeader("access-control-allow-origin", origin);
    response.setHeader("vary", "Origin");
  }
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const mediaType = (request.headers["content-type"] ?? "").split(";", 1)[0]!.trim().toLowerCase();
  if (mediaType !== "application/json" && !/^application\/[a-z0-9.+-]+\+json$/.test(mediaType)) {
    throw new LocalUnsupportedMediaTypeError("POST requests require application/json.");
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 32 * 1024) throw new LocalPayloadTooLargeError("Request body exceeds 32 KiB.");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApplicationError("invalid-request", "Request body must be valid JSON.");
  }
}

function errorResponse(error: unknown, correlationId: string): { status: number; body: ApiError } {
  if (error instanceof LocalUnauthorizedError) {
    return {
      status: 401,
      body: { code: "unauthorized", message: "Authentication is required.", correlationId, retryable: false },
    };
  }
  if (error instanceof LocalDeadlineError) {
    return {
      status: 504,
      body: {
        code: "operation-indeterminate",
        message: "The operation may still complete; query current state before retrying.",
        correlationId,
        retryable: false,
      },
    };
  }
  if (error instanceof LocalPayloadTooLargeError) {
    return { status: 413, body: { code: "payload-too-large", message: error.message, correlationId, retryable: false } };
  }
  if (error instanceof LocalUnsupportedMediaTypeError) {
    return { status: 415, body: { code: "unsupported-media-type", message: error.message, correlationId, retryable: false } };
  }
  if (error instanceof ZodError) {
    return {
      status: 400,
      body: { code: "invalid-request", message: "Request does not match the versioned contract.", correlationId, retryable: false },
    };
  }
  if (error instanceof ApplicationError) {
    const status = error.code === "forbidden" ? 403
      : error.code === "not-found" ? 404
        : error.code === "invalid-request" ? 400
          : error.code === "conflict" ? 409
            : 503;
    return { status, body: { code: error.code, message: error.message, correlationId, retryable: error.retryable } };
  }
  return {
    status: 500,
    body: { code: "internal", message: "The request could not be completed.", correlationId, retryable: false },
  };
}

async function withDeadline<T>(operation: Promise<T>, deadlineMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new LocalDeadlineError("Operation timed out.")), deadlineMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function requireIdentity(request: IncomingMessage): Identity {
  const identity = identityFromAuthorization(request.headers.authorization);
  if (!identity) throw new LocalUnauthorizedError("Authentication is required.");
  return identity;
}

export function createLocalServer(dependencies: LocalServerDependencies) {
  const configuredEnvironment = process.env.LOOPIN_ENV ?? "local";
  if (configuredEnvironment !== "local" && configuredEnvironment !== "test") {
    throw new Error("The fixture identity runtime is restricted to local and test environments.");
  }

  const handler = async (request: IncomingMessage, response: ServerResponse) => {
    const correlationId = randomUUID();
    const startedAt = Date.now();
    response.once("finish", () => dependencies.logger?.log({
      correlationId,
      method: request.method,
      path: new URL(request.url ?? "/", "http://local.loopin").pathname,
      statusCode: response.statusCode,
      durationMs: Date.now() - startedAt,
    }));
    response.setHeader("x-correlation-id", correlationId);
    const origin = request.headers.origin;
    if (origin && !dependencies.allowedOrigins.includes(origin)) {
      return sendJson(response, 403, { code: "origin-forbidden", message: "Origin is not allowed.", correlationId, retryable: false });
    }
    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      if (origin) response.setHeader("access-control-allow-origin", origin);
      if (origin) response.setHeader("vary", "Origin");
      response.setHeader("access-control-allow-headers", "authorization, content-type, idempotency-key");
      response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
      return response.end();
    }

    try {
      const url = new URL(request.url ?? "/", "http://local.loopin");
      if (request.method === "GET" && url.pathname === "/healthz") return sendJson(response, 200, { status: "ok" }, origin);
      if (request.method === "GET" && url.pathname === "/readyz") return sendJson(response, 200, { status: "ready" }, origin);
      const identity = requireIdentity(request);

      if (request.method === "POST" && url.pathname === "/v1/trips/join") {
        return sendJson(response, 200, await withDeadline(dependencies.app.joinTrip(identity, await readJson(request) as never), dependencies.deadlineMs ?? 9_000), origin);
      }
      const readiness = /^\/v1\/trips\/([^/]+)\/members\/([^/]+)\/readiness$/.exec(url.pathname);
      if (request.method === "POST" && readiness) {
        return sendJson(response, 200, await withDeadline(dependencies.app.setReadiness(identity, readiness[1]!, readiness[2]!, await readJson(request) as never), dependencies.deadlineMs ?? 9_000), origin);
      }
      const snapshot = /^\/v1\/trips\/([^/]+)\/live-snapshot$/.exec(url.pathname);
      if (request.method === "GET" && snapshot) {
        return sendJson(response, 200, await withDeadline(dependencies.app.getLiveSnapshot(identity, snapshot[1]!), dependencies.deadlineMs ?? 9_000), origin);
      }
      if (request.method === "POST" && url.pathname === "/v1/telemetry") {
        const telemetry = LocationTelemetryV1Schema.parse(await readJson(request));
        const trustedReplayTime = dependencies.maps.trustedReplayTime(telemetry.eventId);
        const result = await withDeadline(
          dependencies.app.processTelemetry(identity, telemetry, new Date().toISOString(), trustedReplayTime),
          dependencies.deadlineMs ?? 9_000,
        );
        return sendJson(response, 202, { status: result.status, snapshotRevision: result.snapshotRevision }, origin);
      }
      const approval = /^\/v1\/trips\/([^/]+)\/recommendations\/([^/]+)\/approve$/.exec(url.pathname);
      if (request.method === "POST" && approval) {
        return sendJson(response, 200, await withDeadline(dependencies.app.approveRegroup(identity, approval[1]!, approval[2]!, await readJson(request) as never), dependencies.deadlineMs ?? 9_000), origin);
      }
      const completion = /^\/v1\/trips\/([^/]+)\/complete$/.exec(url.pathname);
      if (request.method === "POST" && completion) {
        return sendJson(response, 200, await withDeadline(
          dependencies.app.completeTrip(identity, completion[1]!, await readJson(request) as never),
          dependencies.deadlineMs ?? 9_000,
        ), origin);
      }
      const summary = /^\/v1\/trips\/([^/]+)\/summary$/.exec(url.pathname);
      if (request.method === "GET" && summary) {
        return sendJson(response, 200, await withDeadline(dependencies.app.getSummary(identity, summary[1]!), dependencies.deadlineMs ?? 9_000), origin);
      }
      return sendJson(response, 404, { code: "not-found", message: "Route not found.", correlationId, retryable: false }, origin);
    } catch (error) {
      const mapped = errorResponse(error, correlationId);
      return sendJson(response, mapped.status, mapped.body, origin);
    }
  };

  const server: Server = createServer({ requestTimeout: 10_000, headersTimeout: 8_000 }, handler);
  server.on("upgrade", (request, socket, head) => {
    void dependencies.realtime.handleUpgrade(request, socket, head, dependencies.allowedOrigins);
  });

  return {
    async listen(port: number, host: string): Promise<RunningLocalServer> {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
          server.off("error", reject);
          resolve();
        });
      });
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Local server did not bind to a TCP port.");
      return {
        url: `http://${host}:${address.port}`,
        wsUrl: `ws://${host}:${address.port}`,
        async close() {
          await dependencies.realtime.close();
          await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        },
      };
    },
  };
}
