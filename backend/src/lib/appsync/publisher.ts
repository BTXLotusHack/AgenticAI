import { Sha256 } from "@aws-crypto/sha256-js";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { HttpRequest } from "@smithy/protocol-http";
import { SignatureV4 } from "@smithy/signature-v4";
import type { RealtimeEventV1 } from "@loopin/convoy-core";
import { AWS_REGION, requireEnv } from "../env.js";
import { logger } from "../logger.js";

/**
 * Publishes backend-derived live events to AppSync. AppSync uses a NONE
 * resolver; this mutation echoes the input so GraphQL subscriptions fan it out.
 * Clients receive derived events, not raw GPS points.
 */
const MUTATION = /* GraphQL */ `
  mutation Publish($input: RealtimeEventInput!) {
    publishRealtimeEvent(input: $input) {
      eventId
      tripId
      eventType
      snapshotRevision
      graphRevision
    }
  }
`;

const signer = new SignatureV4({
  service: "appsync",
  region: AWS_REGION,
  credentials: defaultProvider(),
  sha256: Sha256,
});

export type AppSyncRealtimeEventInput = Omit<RealtimeEventV1, "audience" | "payload"> & {
  readonly audience: string;
  readonly payload: string;
};

export function toRealtimeEventInput(event: RealtimeEventV1): AppSyncRealtimeEventInput {
  return {
    ...event,
    audience: JSON.stringify(event.audience),
    payload: JSON.stringify(event.payload),
  };
}

export async function publishRealtimeEvent(event: RealtimeEventV1): Promise<void> {
  const endpoint = new URL(requireEnv("APPSYNC_HTTP_URL"));
  const input = toRealtimeEventInput(event);

  const request = new HttpRequest({
    protocol: endpoint.protocol,
    hostname: endpoint.hostname,
    path: endpoint.pathname,
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: endpoint.hostname,
    },
    body: JSON.stringify({ query: MUTATION, variables: { input } }),
  });

  const signed = await signer.sign(request);

  const res = await fetch(endpoint.toString(), {
    method: "POST",
    headers: signed.headers,
    body: signed.body as string,
  });

  const payload = (await res.json()) as { errors?: unknown[] };
  if (!res.ok || (payload.errors && payload.errors.length > 0)) {
    logger.error("appsync_publish_failed", {
      status: res.status,
      tripId: event.tripId,
      eventId: event.eventId,
      eventType: event.eventType,
    });
    throw new Error("AppSync publishRealtimeEvent failed");
  }
}
