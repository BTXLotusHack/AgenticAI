import { describe, expect, it } from "vitest";
import {
  decodeRecord,
  groupByRider,
  latestPerRider,
  toRiderPositions,
} from "../src/domain/telemetry.js";
import type { RiderTelemetry } from "../src/contracts/telemetry.js";
import type { SnappedPoint } from "../src/lib/maps/provider.js";

function encode(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
}

const base = {
  schemaVersion: "1",
  riderId: "r1",
  teamId: "t1",
  coords: [10.77, 106.7] as [number, number],
  headingDegrees: 90,
  speedKmh: 40,
  accuracyMeters: 5,
  observedAt: "2026-07-11T10:00:00.000Z",
  _topicTeamId: "t1",
  _topicRiderId: "r1",
  _publisherPrincipal: "cognito-identity-1",
};

describe("decodeRecord", () => {
  it("decodes and validates a well-formed record", () => {
    const decoded = decodeRecord(encode(base));
    expect(decoded?.riderId).toBe("r1");
  });

  it("returns null on invalid JSON", () => {
    expect(decodeRecord("!!!notbase64json")).toBeNull();
  });

  it("returns null when coordinates are out of range", () => {
    expect(decodeRecord(encode({ ...base, coords: [999, 106.7] }))).toBeNull();
  });

  it("rejects a payload whose team does not match its server-derived topic", () => {
    expect(decodeRecord(encode({ ...base, teamId: "other-team" }))).toBeNull();
  });

  it("rejects a payload whose rider does not match its server-derived topic", () => {
    expect(decodeRecord(encode({ ...base, riderId: "other-rider" }))).toBeNull();
  });

  it("rejects records without trusted topic and publisher metadata", () => {
    const { _topicTeamId, _topicRiderId, _publisherPrincipal, ...unbound } = base;
    expect(decodeRecord(encode(unbound))).toBeNull();
  });
});

describe("groupByRider", () => {
  it("groups by team+rider and sorts each group chronologically", () => {
    const items: RiderTelemetry[] = [
      { ...base, observedAt: "2026-07-11T10:00:02.000Z" },
      { ...base, observedAt: "2026-07-11T10:00:01.000Z" },
      { ...base, riderId: "r2" },
    ];
    const groups = groupByRider(items);
    expect(groups.size).toBe(2);
    const r1 = groups.get("t1#r1")!;
    expect(r1.map((t) => t.observedAt)).toEqual([
      "2026-07-11T10:00:01.000Z",
      "2026-07-11T10:00:02.000Z",
    ]);
  });
});

describe("toRiderPositions", () => {
  it("aligns snapped points to inputs and carries confidence", () => {
    const ordered: RiderTelemetry[] = [base];
    const snapped: SnappedPoint[] = [
      { input: base.coords, snappedLat: 10.771, snappedLng: 106.701, matchConfidence: 0.9 },
    ];
    const pos = toRiderPositions(ordered, snapped)[0]!;
    expect(pos).toMatchObject({
      snappedLat: 10.771,
      snappedLng: 106.701,
      matchConfidence: 0.9,
      lat: 10.77,
    });
  });

  it("falls back to raw coords when a snapped point is missing", () => {
    const pos = toRiderPositions([base], [])[0]!;
    expect(pos.snappedLat).toBe(base.coords[0]);
    expect(pos.matchConfidence).toBeNull();
  });
});

describe("latestPerRider", () => {
  it("keeps only the freshest position per rider", () => {
    const positions = toRiderPositions(
      [
        { ...base, observedAt: "2026-07-11T10:00:01.000Z" },
        { ...base, observedAt: "2026-07-11T10:00:05.000Z" },
      ],
      [],
    );
    const latest = latestPerRider(positions);
    expect(latest).toHaveLength(1);
    expect(latest[0]!.observedAt).toBe("2026-07-11T10:00:05.000Z");
  });
});
