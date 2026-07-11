import type { KinesisStreamBatchResponse, KinesisStreamEvent } from "aws-lambda";
import { publishRiderPosition } from "../lib/appsync/publisher.js";
import { logger } from "../lib/logger.js";
import { ValhallaMapsProvider } from "../lib/maps/valhalla.js";
import {
  decodeRecord,
  groupByRider,
  latestPerRider,
  toRiderPositions,
} from "../domain/telemetry.js";

/**
 * Fast path. Triggered by Kinesis record batches.
 *
 *   IoT Core (MQTT) → IoT rule → Kinesis → THIS Lambda
 *     → Valhalla /trace_attributes (map-match)
 *     → AppSync publishRiderPosition mutation (fan-out to live clients)
 *
 * The telemetry path never waits for the control-plane database. Map-match
 * failures degrade to raw coordinates rather than dropping the batch.
 */
const maps = new ValhallaMapsProvider();

export const handler = async (event: KinesisStreamEvent): Promise<KinesisStreamBatchResponse> => {
  const batchItemFailures: KinesisStreamBatchResponse["batchItemFailures"] = [];
  const decoded = [];

  for (const record of event.Records) {
    const telemetry = decodeRecord(record.kinesis.data);
    if (telemetry) {
      decoded.push(telemetry);
    } else {
      batchItemFailures.push({ itemIdentifier: record.kinesis.sequenceNumber });
    }
  }

  if (decoded.length === 0) {
    logger.warn("telemetry_batch_empty_after_decode", { received: event.Records.length });
    return { batchItemFailures };
  }

  const byRider = groupByRider(decoded);
  for (const ordered of byRider.values()) {
    try {
      const snapped = await maps.traceAttributes({ points: ordered.map((t) => t.coords) });
      const positions = latestPerRider(toRiderPositions(ordered, snapped));
      await Promise.all(positions.map((position) => publishRiderPosition(position)));
    } catch (error) {
      const failedIds = new Set(ordered.map((item) => `${item.teamId}#${item.riderId}#${item.observedAt}`));
      for (const record of event.Records) {
        const item = decodeRecord(record.kinesis.data);
        if (item && failedIds.has(`${item.teamId}#${item.riderId}#${item.observedAt}`)) {
          batchItemFailures.push({ itemIdentifier: record.kinesis.sequenceNumber });
        }
      }
      logger.error("telemetry_rider_group_failed", {
        records: ordered.length,
        reason: error instanceof Error ? error.name : "unknown",
      });
    }
  }

  logger.info("telemetry_batch_processed", {
    records: event.Records.length,
    riders: byRider.size,
    failed: batchItemFailures.length,
  });
  return { batchItemFailures };
};
