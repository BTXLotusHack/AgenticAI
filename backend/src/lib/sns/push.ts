import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import type { PushAlert } from "../../contracts/notification.js";
import { AWS_REGION } from "../env.js";
import { logger } from "../logger.js";

/**
 * High-priority push delivery. Publishes directly to a user's SNS platform
 * endpoint ARN; SNS normalizes the payload for APNs and FCM on the fly.
 */
const sns = new SNSClient({ region: AWS_REGION });

/** SNS expects platform-specific payloads nested inside a JSON envelope. */
function buildSnsMessage(alert: PushAlert): string {
  const apns = JSON.stringify({
    aps: { alert: { title: alert.title, body: alert.body }, sound: "default" },
    data: alert.data,
  });
  const fcm = JSON.stringify({
    notification: { title: alert.title, body: alert.body },
    data: alert.data,
  });
  return JSON.stringify({ default: alert.body, APNS: apns, APNS_SANDBOX: apns, GCM: fcm });
}

export async function sendPush(endpointArn: string, alert: PushAlert): Promise<void> {
  try {
    await sns.send(
      new PublishCommand({
        TargetArn: endpointArn,
        MessageStructure: "json",
        Message: buildSnsMessage(alert),
      }),
    );
  } catch (err) {
    // Push is best-effort: a failed banner must not fail the originating
    // transaction. Surface for observability and continue.
    logger.warn("push_delivery_failed", {
      targetUserId: alert.targetUserId,
      reason: err instanceof Error ? err.name : "unknown",
    });
  }
}
