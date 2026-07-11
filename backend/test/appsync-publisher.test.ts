import { describe, expect, it } from "vitest";

import { toRealtimeEventInput } from "../src/lib/appsync/publisher.js";

describe("AppSync realtime publisher", () => {
  it("serializes structured realtime event fields for AWSJSON scalars", () => {
    const input = toRealtimeEventInput({
      schemaVersion: 1,
      eventId: "realtime:TRIP001:1:liveSnapshotUpdated",
      tripId: "TRIP001",
      snapshotRevision: 1,
      graphRevision: 1,
      audience: { kind: "member", memberId: "M004" },
      eventType: "driverAlertIssued",
      occurredAt: "2026-07-20T00:00:01.000Z",
      expiresAt: "2026-07-20T00:05:01.000Z",
      payload: { notificationId: "notification:split:M004" },
    });

    expect(input).toMatchObject({
      eventId: "realtime:TRIP001:1:liveSnapshotUpdated",
      eventType: "driverAlertIssued",
      audience: '{"kind":"member","memberId":"M004"}',
      payload: '{"notificationId":"notification:split:M004"}',
    });
  });
});
