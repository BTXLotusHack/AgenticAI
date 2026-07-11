import type { KinesisStreamBatchResponse, KinesisStreamEvent } from "aws-lambda";
import {
  LocationTelemetryV1Schema,
  ProjectedLocationV1Schema,
  type RealtimeEventV1,
} from "@loopin/convoy-core";
import {
  createEmptyLiveTripState,
  processProjectedTelemetry,
  type LiveTripState,
  type ProjectedTelemetryInput,
} from "../domain/live-telemetry.js";
import { publishRealtimeEvent } from "../lib/appsync/publisher.js";
import { loadLiveTripState, persistLiveState } from "../lib/dynamo/live-state.js";
import { logger } from "../lib/logger.js";

type PersistRecord = {
  readonly telemetry: ProjectedTelemetryInput["telemetry"];
  readonly state?: LiveTripState;
  readonly snapshot?: NonNullable<ReturnType<typeof processProjectedTelemetry>["snapshot"]>;
  readonly events: readonly RealtimeEventV1[];
  readonly ttl: number;
};

type TelemetryProcessorDependencies = {
  readonly loadState: (tripId: string) => Promise<LiveTripState>;
  readonly saveState: (state: LiveTripState) => Promise<void>;
  readonly persist: (record: PersistRecord) => Promise<void>;
  readonly publish: (event: RealtimeEventV1) => Promise<void>;
  readonly ttlFor: (receivedAt: string, tripId: string) => number;
};

const liveStateByTrip = new Map<string, LiveTripState>();

function decodeProjectedRecord(base64Data: string): ProjectedTelemetryInput | null {
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(base64Data, "base64").toString("utf8"));
  } catch {
    return null;
  }
  if (!json || typeof json !== "object") return null;
  const record = json as Record<string, unknown>;
  const telemetry = LocationTelemetryV1Schema.safeParse(record.telemetry);
  const projection = ProjectedLocationV1Schema.safeParse(record.projection);
  if (!telemetry.success || !projection.success) return null;
  const receivedAt = typeof record.receivedAt === "string" ? record.receivedAt : telemetry.data.sentAt;
  return { telemetry: telemetry.data, projection: projection.data, receivedAt };
}

function defaultTtl(receivedAt: string): number {
  return Math.floor((Date.parse(receivedAt) + 24 * 60 * 60 * 1_000) / 1_000);
}

const defaultDependencies: TelemetryProcessorDependencies = {
  loadState: async (tripId) => liveStateByTrip.get(tripId) ?? await loadLiveTripState(tripId) ?? createEmptyLiveTripState(tripId),
  saveState: async (state) => {
    liveStateByTrip.set(state.tripId, state);
  },
  persist: persistLiveState,
  publish: publishRealtimeEvent,
  ttlFor: (receivedAt) => defaultTtl(receivedAt),
};

/**
 * Fast path. Triggered by Kinesis record batches:
 *
 *   IoT Core -> Kinesis -> THIS Lambda
 *     -> convoy-core deterministic live state
 *     -> DynamoDB current snapshot/events
 *     -> AppSync derived realtime events
 *
 * The handler is only an adapter. Convoy safety decisions live in convoy-core
 * and the backend live telemetry domain.
 */
export function createTelemetryProcessor(dependencies: TelemetryProcessorDependencies = defaultDependencies) {
  return async (event: KinesisStreamEvent): Promise<KinesisStreamBatchResponse> => {
    const batchItemFailures: KinesisStreamBatchResponse["batchItemFailures"] = [];

    for (const record of event.Records) {
      const input = decodeProjectedRecord(record.kinesis.data);
      if (!input) {
        batchItemFailures.push({ itemIdentifier: record.kinesis.sequenceNumber });
        continue;
      }

      try {
        const state = await dependencies.loadState(input.telemetry.tripId);
        const result = processProjectedTelemetry(state, input);
        await dependencies.saveState(result.state);

        if (result.status === "accepted" || result.status === "history-only") {
          await dependencies.persist({
            telemetry: input.telemetry,
            state: result.state,
            snapshot: result.snapshot,
            events: result.events,
            ttl: dependencies.ttlFor(input.receivedAt, input.telemetry.tripId),
          });
        }

        await Promise.all(result.events.map((derivedEvent) => dependencies.publish(derivedEvent)));
      } catch (error) {
        batchItemFailures.push({ itemIdentifier: record.kinesis.sequenceNumber });
        logger.error("telemetry_live_record_failed", {
          sequenceNumber: record.kinesis.sequenceNumber,
          reason: error instanceof Error ? error.name : "unknown",
        });
      }
    }

    if (event.Records.length > 0 && batchItemFailures.length === event.Records.length) {
      logger.warn("telemetry_batch_empty_after_decode", { received: event.Records.length });
    }
    logger.info("telemetry_batch_processed", {
      records: event.Records.length,
      failed: batchItemFailures.length,
    });
    return { batchItemFailures };
  };
}

export const handler = createTelemetryProcessor();
