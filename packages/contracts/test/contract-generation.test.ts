import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const generatedDirectory = fileURLToPath(new URL("../generated/", import.meta.url));

const schemaArtifacts = [
  "location-telemetry-v1.schema.json",
  "member-telemetry-input-v1.schema.json",
  "event-envelope-v1.schema.json",
  "projected-location-v1.schema.json",
  "convoy-graph-v1.schema.json",
  "situation-v1.schema.json",
  "notification-request-v1.schema.json",
  "tasco-place-ref-v1.schema.json",
  "trip-stop-v1.schema.json",
  "tasco-route-preview-v1.schema.json",
  "trip-plan-summary-v1.schema.json",
  "join-trip-result-v1.schema.json",
  "live-member-snapshot-v1.schema.json",
  "live-snapshot-v1.schema.json",
  "convoy-situation-event-v1.schema.json",
  "driver-alert-v1.schema.json",
  "driver-alert-acknowledgement-v1.schema.json",
  "realtime-event-v1.schema.json",
] as const;

describe("cross-language contract generation", () => {
  it("publishes the required deterministic version-one JSON Schemas", () => {
    for (const artifact of schemaArtifacts) {
      const path = `${generatedDirectory}${artifact}`;
      expect(existsSync(path), `${artifact} must be generated`).toBe(true);
      const schema = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
      expect(schema.$id).toBe(`https://schemas.loopin.vn/contracts/${artifact}`);
      expect(schema["x-schema-version"]).toBe(1);
      expect(readFileSync(path, "utf8").endsWith("\n")).toBe(true);
    }
  });

  it("publishes one null-safe generated Dart library with a warning header", () => {
    const path = fileURLToPath(new URL("../../../apps/mobile/lib/contracts/generated/loopin_contracts.dart", import.meta.url));
    expect(existsSync(path)).toBe(true);
    const dart = readFileSync(path, "utf8");
    expect(dart).toMatch(/^\/\/ GENERATED CODE - DO NOT MODIFY BY HAND\./);
    expect(dart).toContain("LocationTelemetryV1");
    expect(dart).toContain("MemberTelemetryInputV1");
    expect(dart).toContain("ConvoyGraphV1");
    expect(dart).toContain("LiveMemberSnapshotV1");
    expect(dart).toContain("LiveSnapshotV1");
    expect(dart).toContain("ConvoySituationEventV1");
    expect(dart).toContain("DriverAlertV1");
    expect(dart).toContain("DriverAlertAcknowledgementV1");
    expect(dart).toContain("NotificationRequestV1");
    expect(dart).toContain("TripPlanSummaryV1");
    expect(dart).toContain("JoinTripResultV1");
    expect(dart).toContain("RealtimeEventV1");
  });

  it("exports valid and ingestion-edge examples for cross-language verification", () => {
    const path = fileURLToPath(new URL("../generated/contract-examples-v1.json", import.meta.url));
    expect(existsSync(path)).toBe(true);
    const examples = JSON.parse(readFileSync(path, "utf8")) as { cases: Array<{ caseId: string }> };
    expect(examples.cases.map(({ caseId }) => caseId)).toEqual([
      "valid-golden",
      "duplicate",
      "stale",
      "history-only",
      "invalid-version",
    ]);
  });
});
