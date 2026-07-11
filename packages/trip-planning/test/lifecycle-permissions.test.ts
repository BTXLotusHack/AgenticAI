import { describe, expect, it } from "vitest";

import {
  GOLDEN_ITINERARY,
  GOLDEN_PLACES,
  GOLDEN_PLANNED_TRIP,
  TripPlanningError,
  assertEditable,
  assertMinimumRole,
  insertStop,
  transitionLifecycle,
} from "../src/index.js";

describe("lifecycle", () => {
  it("allows draft to published and published back to draft", () => {
    expect(transitionLifecycle("draft", "published")).toBe("published");
    expect(transitionLifecycle("published", "draft")).toBe("draft");
  });

  it("blocks edits once a trip is active", () => {
    expect(() => assertEditable("active")).toThrow(TripPlanningError);
  });
});

describe("permissions", () => {
  it("requires owner role to publish", () => {
    expect(() =>
      assertMinimumRole(GOLDEN_PLANNED_TRIP.collaborators, { userId: "USER002" }, "owner"),
    ).toThrow(/cannot perform/);
    expect(assertMinimumRole(GOLDEN_PLANNED_TRIP.collaborators, { userId: "USER001" }, "owner")).toBe("owner");
  });

  it("allows editors to mutate itinerary ordering", () => {
    const day = GOLDEN_ITINERARY.days[0]!;
    const updated = insertStop(day, {
      schemaVersion: 1,
      stopId: "STOP010",
      tascoPlaceId: "tasco:poi:POI010",
      place: {
        schemaVersion: 1,
        tascoPlaceId: "tasco:poi:POI010",
        name: "QL5 Viewpoint",
        label: "QL5 Viewpoint",
        address: "QL5, Việt Nam",
        category: "Viewpoint",
        coordinates: { lat: 20.97, lon: 106.1 },
        source: "tasco",
      },
      sequence: 2,
      dwellMinutes: 15,
    });
    expect(updated.stops.map((stop) => stop.sequence)).toEqual([1, 2, 3]);
    expect(assertMinimumRole(GOLDEN_PLANNED_TRIP.collaborators, { userId: "USER002" }, "editor")).toBe("editor");
  });
});

describe("ordering", () => {
  it("normalizes stop sequences after insertion", () => {
    const day = GOLDEN_ITINERARY.days[0]!;
    const updated = insertStop(day, {
      schemaVersion: 1,
      stopId: "STOP010",
      tascoPlaceId: "tasco:poi:POI010",
      place: {
        schemaVersion: 1,
        tascoPlaceId: "tasco:poi:POI010",
        name: "QL5 Viewpoint",
        label: "QL5 Viewpoint",
        address: "QL5, Việt Nam",
        category: "Viewpoint",
        coordinates: { lat: 20.97, lon: 106.1 },
        source: "tasco",
      },
      sequence: 1,
      dwellMinutes: 15,
    }, 1);
    expect(updated.stops[0]!.stopId).toBe("STOP010");
    expect(updated.stops[1]!.tascoPlaceId).toBe(GOLDEN_PLACES.hanoiOldQuarter.tascoPlaceId);
  });
});
