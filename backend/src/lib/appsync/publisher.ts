import { Sha256 } from "@aws-crypto/sha256-js";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { HttpRequest } from "@smithy/protocol-http";
import { SignatureV4 } from "@smithy/signature-v4";
import type { RiderPosition } from "../../contracts/telemetry.js";
import { AWS_REGION, requireEnv } from "../env.js";
import { logger } from "../logger.js";

/**
 * Publishes road-snapped positions to AppSync by invoking the
 * `publishRiderPosition` GraphQL mutation. The mutation is a local (NONE)
 * resolver whose sole job is to trigger the `onRiderPosition` subscription, so
 * AppSync fans the payload out to every subscribed client over WebSockets.
 *
 * The processor Lambda authenticates to AppSync with IAM (SigV4). Client
 * subscriptions authenticate with their Cognito user-pool JWT and are scoped to
 * their own teamId. Config is injected by Terraform:
 *   APPSYNC_HTTP_URL   the GraphQL HTTP endpoint (…/graphql)
 */
const MUTATION = /* GraphQL */ `
  mutation Publish($input: RiderPositionInput!) {
    publishRiderPosition(input: $input) {
      teamId
      riderId
    }
  }
`;

const signer = new SignatureV4({
  service: "appsync",
  region: AWS_REGION,
  credentials: defaultProvider(),
  sha256: Sha256,
});

export async function publishRiderPosition(position: RiderPosition): Promise<void> {
  const endpoint = new URL(requireEnv("APPSYNC_HTTP_URL"));

  const request = new HttpRequest({
    protocol: endpoint.protocol,
    hostname: endpoint.hostname,
    path: endpoint.pathname,
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: endpoint.hostname,
    },
    body: JSON.stringify({ query: MUTATION, variables: { input: position } }),
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
      teamId: position.teamId,
      riderId: position.riderId,
    });
    throw new Error("AppSync publishRiderPosition failed");
  }
}
