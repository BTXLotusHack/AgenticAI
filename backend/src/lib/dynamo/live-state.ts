import { GetCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import type {
  LiveMemberSnapshotV1,
  LiveSnapshotV1,
  LocationTelemetryV1,
  RealtimeEventV1,
} from "@loopin/convoy-core";
import type { LiveTripState } from "../../domain/live-telemetry.js";
import { ddb, tableName } from "./client.js";
import { keys } from "./keys.js";

type DynamoItem = Record<string, unknown>;

export function liveSnapshotItem(snapshot: LiveSnapshotV1, ttl: number): DynamoItem {
  return {
    ...keys.liveSnapshot(snapshot.tripId),
    type: "LiveSnapshot",
    tripId: snapshot.tripId,
    snapshotRevision: snapshot.snapshotRevision,
    graphRevision: snapshot.graph.graphRevision,
    generatedAt: snapshot.generatedAt,
    snapshot,
    ttl,
  };
}

export function liveMemberSnapshotItem(member: LiveMemberSnapshotV1, ttl: number): DynamoItem {
  return {
    ...keys.liveMember(member.tripId, member.memberId),
    type: "LiveMemberSnapshot",
    tripId: member.tripId,
    memberId: member.memberId,
    sequence: member.sequence,
    observedAt: member.observedAt,
    receivedAt: member.receivedAt,
    confidence: member.confidence,
    connectivity: member.connectivity,
    snapshot: member,
    ttl,
  };
}

export function liveTripStateItem(state: LiveTripState, ttl: number): DynamoItem {
  return {
    ...keys.liveTripState(state.tripId),
    type: "LiveTripState",
    tripId: state.tripId,
    snapshotRevision: state.snapshotRevision,
    state,
    ttl,
  };
}

export function telemetryEventItem(telemetry: LocationTelemetryV1, ttl: number): DynamoItem {
  return {
    ...keys.telemetryEvent(telemetry.tripId, telemetry.eventId),
    type: "TelemetryEvent",
    tripId: telemetry.tripId,
    memberId: telemetry.memberId,
    eventId: telemetry.eventId,
    sequence: telemetry.sequence,
    observedAt: telemetry.observedAt,
    ttl,
  };
}

export function realtimeEventItem(event: RealtimeEventV1, ttl: number): DynamoItem {
  return {
    ...keys.realtimeEvent(event.tripId, event.snapshotRevision, event.eventId),
    type: "RealtimeEvent",
    tripId: event.tripId,
    eventId: event.eventId,
    eventType: event.eventType,
    audience: event.audience,
    snapshotRevision: event.snapshotRevision,
    graphRevision: event.graphRevision,
    occurredAt: event.occurredAt,
    expiresAt: event.expiresAt,
    event,
    ttl,
  };
}

export async function persistLiveState(input: {
  readonly telemetry: LocationTelemetryV1;
  readonly state?: LiveTripState;
  readonly snapshot?: LiveSnapshotV1;
  readonly events: readonly RealtimeEventV1[];
  readonly ttl: number;
}): Promise<void> {
  const items: DynamoItem[] = [
    telemetryEventItem(input.telemetry, input.ttl),
    ...(input.state ? [liveTripStateItem(input.state, input.ttl)] : []),
    ...(input.snapshot ? [liveSnapshotItem(input.snapshot, input.ttl)] : []),
    ...(input.snapshot?.members.map((member) => liveMemberSnapshotItem(member, input.ttl)) ?? []),
    ...input.events.map((event) => realtimeEventItem(event, input.ttl)),
  ];

  if (items.length === 0) return;
  await ddb.send(
    new TransactWriteCommand({
      TransactItems: items.slice(0, 25).map((Item) => ({
        Put: {
          TableName: tableName(),
          Item,
        },
      })),
    }),
  );
}

export async function loadLiveTripState(tripId: string): Promise<LiveTripState | null> {
  const response = await ddb.send(
    new GetCommand({
      TableName: tableName(),
      Key: keys.liveTripState(tripId),
    }),
  );
  const state = response.Item?.["state"];
  return state && typeof state === "object" ? (state as LiveTripState) : null;
}

export async function loadLiveSnapshot(tripId: string): Promise<LiveSnapshotV1 | null> {
  const response = await ddb.send(
    new GetCommand({
      TableName: tableName(),
      Key: keys.liveSnapshot(tripId),
    }),
  );
  const snapshot = response.Item?.["snapshot"];
  return snapshot && typeof snapshot === "object"
    ? (snapshot as LiveSnapshotV1)
    : null;
}
