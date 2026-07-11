import { z } from "zod";

import {
  ConvoyGraphSchema,
  ContentReportV1Schema,
  EventEnvelopeSchema,
  LocationVisibilityPolicyV1Schema,
  LocationTelemetryV1Schema,
  NotificationRequestSchema,
  PlaceCommunitySummaryV1Schema,
  ProjectedLocationV1Schema,
  SituationSchema,
  UserTravelProfileV1Schema,
} from "./index";

export const CONTRACT_SCHEMA_VERSION = 1;
export const CONTRACT_SCHEMA_BASE_URL = "https://schemas.loopin.vn/contracts";

export const contractSchemas = [
  ["LocationTelemetryV1", "location-telemetry-v1.schema.json", LocationTelemetryV1Schema],
  ["EventEnvelopeV1", "event-envelope-v1.schema.json", EventEnvelopeSchema],
  ["ProjectedLocationV1", "projected-location-v1.schema.json", ProjectedLocationV1Schema],
  ["ConvoyGraphV1", "convoy-graph-v1.schema.json", ConvoyGraphSchema],
  ["SituationV1", "situation-v1.schema.json", SituationSchema],
  ["NotificationRequestV1", "notification-request-v1.schema.json", NotificationRequestSchema],
  ["PlaceCommunitySummaryV1", "place-community-summary-v1.schema.json", PlaceCommunitySummaryV1Schema],
  ["LocationVisibilityPolicyV1", "location-visibility-policy-v1.schema.json", LocationVisibilityPolicyV1Schema],
  ["UserTravelProfileV1", "user-travel-profile-v1.schema.json", UserTravelProfileV1Schema],
  ["ContentReportV1", "content-report-v1.schema.json", ContentReportV1Schema],
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
