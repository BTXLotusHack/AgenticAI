import { z } from "zod";

import {
  ConvoyGraphSchema,
  ConvoySituationEventV1Schema,
  DriverAlertAcknowledgementV1Schema,
  DriverAlertV1Schema,
  EventEnvelopeSchema,
  JoinTripResultV1Schema,
  LiveMemberSnapshotV1Schema,
  LiveSnapshotV1Schema,
  LocationTelemetryV1Schema,
  MemberTelemetryInputV1Schema,
  NotificationRequestSchema,
  ProjectedLocationV1Schema,
  RealtimeEventV1Schema,
  SituationSchema,
  TascoPlaceRefV1Schema,
  TascoRoutePreviewV1Schema,
  TripPlanSummaryV1Schema,
  TripStopV1Schema,
} from "./index";

export const CONTRACT_SCHEMA_VERSION = 1;
export const CONTRACT_SCHEMA_BASE_URL = "https://schemas.loopin.vn/contracts";

export const contractSchemas = [
  ["LocationTelemetryV1", "location-telemetry-v1.schema.json", LocationTelemetryV1Schema],
  ["MemberTelemetryInputV1", "member-telemetry-input-v1.schema.json", MemberTelemetryInputV1Schema],
  ["EventEnvelopeV1", "event-envelope-v1.schema.json", EventEnvelopeSchema],
  ["ProjectedLocationV1", "projected-location-v1.schema.json", ProjectedLocationV1Schema],
  ["ConvoyGraphV1", "convoy-graph-v1.schema.json", ConvoyGraphSchema],
  ["SituationV1", "situation-v1.schema.json", SituationSchema],
  ["NotificationRequestV1", "notification-request-v1.schema.json", NotificationRequestSchema],
  ["TascoPlaceRefV1", "tasco-place-ref-v1.schema.json", TascoPlaceRefV1Schema],
  ["TripStopV1", "trip-stop-v1.schema.json", TripStopV1Schema],
  ["TascoRoutePreviewV1", "tasco-route-preview-v1.schema.json", TascoRoutePreviewV1Schema],
  ["TripPlanSummaryV1", "trip-plan-summary-v1.schema.json", TripPlanSummaryV1Schema],
  ["JoinTripResultV1", "join-trip-result-v1.schema.json", JoinTripResultV1Schema],
  ["LiveMemberSnapshotV1", "live-member-snapshot-v1.schema.json", LiveMemberSnapshotV1Schema],
  ["LiveSnapshotV1", "live-snapshot-v1.schema.json", LiveSnapshotV1Schema],
  ["ConvoySituationEventV1", "convoy-situation-event-v1.schema.json", ConvoySituationEventV1Schema],
  ["DriverAlertV1", "driver-alert-v1.schema.json", DriverAlertV1Schema],
  [
    "DriverAlertAcknowledgementV1",
    "driver-alert-acknowledgement-v1.schema.json",
    DriverAlertAcknowledgementV1Schema,
  ],
  ["RealtimeEventV1", "realtime-event-v1.schema.json", RealtimeEventV1Schema],
] as const;

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortJson(entry)]),
    );
  }
  return value;
}

export type ExportedContractSchema = {
  readonly typeName: string;
  readonly fileName: string;
  readonly schema: Record<string, unknown>;
  readonly contents: string;
};

export function exportContractSchemas(): ExportedContractSchema[] {
  return contractSchemas.map(([typeName, fileName, schema]) => {
    const jsonSchema = z.toJSONSchema(schema, {
      target: "draft-7",
      unrepresentable: "any",
    }) as Record<string, unknown>;
    const exported = sortJson({
      ...jsonSchema,
      $id: `${CONTRACT_SCHEMA_BASE_URL}/${fileName}`,
      title: typeName,
      "x-schema-version": CONTRACT_SCHEMA_VERSION,
    }) as Record<string, unknown>;
    return { typeName, fileName, schema: exported, contents: `${JSON.stringify(exported, null, 2)}\n` };
  });
}
