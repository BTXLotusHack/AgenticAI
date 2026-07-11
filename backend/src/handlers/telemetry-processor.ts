import type { KinesisStreamEvent, KinesisStreamHandler } from "aws-lambda";
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

export const handler: KinesisStreamHandler = async (event: KinesisStreamEvent) => {
  const decoded = event.Records.map((r) => decodeRecord(r.kinesis.data)).filter(
    (t): t is NonNullable<typeof t> => t !== null,
  );

  if (decoded.length === 0) {
    logger.warn("telemetry_batch_empty_after_decode", { received: event.Records.length });
    return;
  }

  const byRider = groupByRider(decoded);
  const publishes: Promise<void>[] = [];

  for (const ordered of byRider.values()) {
    const snapped = await maps.traceAttributes({ points: ordered.map((t) => t.coords) });
    const positions = latestPerRider(toRiderPositions(ordered, snapped));
    for (const position of positions) {
      publishes.push(publishRiderPosition(position));
    }
  }

  const results = await Promise.allSettled(publishes);
  const failed = results.filter((r) => r.status === "rejected").length;
  logger.info("telemetry_batch_processed", {
    records: event.Records.length,
    riders: byRider.size,
    published: publishes.length - failed,
    failed,
  });

  // A failed fan-out for a single position must not replay the whole Kinesis
  // batch (which would duplicate map-match cost). Live positions are
  // superseded by the next telemetry tick, so we swallow individual failures.
};
