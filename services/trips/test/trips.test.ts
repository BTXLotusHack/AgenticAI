import { describe, expect, it } from "vitest";

import {
  GOLDEN_ITINERARY,
  GOLDEN_PLACES,
  GOLDEN_PLANNED_TRIP,
  GOLDEN_RECOMMENDATION_CANDIDATES,
} from "@loopin/trip-planning";

import {
  FixedClock,
  LoopinTripsApplication,
  MemoryTripPlanningRepository,
} from "../src/index.js";

const now = "2026-07-19T08:00:00.000Z";

function setup(initial = GOLDEN_PLANNED_TRIP) {
  const clock = new FixedClock(now);
  const repository = new MemoryTripPlanningRepository([initial]);
  const app = new LoopinTripsApplication({ repository, clock });
  return { app, repository, clock };
}

describe("LoopinTripsApplication", () => {
  it("creates a draft trip with owner collaborator and estimates", async () => {
    const { app } = setup();
    const repository = new MemoryTripPlanningRepository();
    const application = new LoopinTripsApplication({ repository, clock: new FixedClock(now) });
    const trip = await application.createTrip(
      { userId: "USER010" },
      {
        schemaVersion: 1,
        tripId: "PLAN010",
        name: "Coastal run",
        ownerUserId: "USER010",
        ownerDisplayName: "Tester",
      },
    );
    expect(trip.lifecycle).toBe("draft");
    expect(trip.collaborators).toHaveLength(1);
    expect(trip.estimates?.estimatedTotalMinutes).toBeGreaterThanOrEqual(0);
  });

  it("rejects duplicate stops across the itinerary", async () => {
    const { app } = setup();
    await expect(
      app.addItineraryStop(
        { userId: "USER002" },
        "PLAN001",
        {
          schemaVersion: 1,
          dayId: "DAY002",
          stopId: "STOP999",
          place: { ...GOLDEN_PLACES.hanoiOldQuarter, tags: [...(GOLDEN_PLACES.hanoiOldQuarter.tags ?? [])] },
        },
      ),
    ).rejects.toMatchObject({ code: "duplicate-stop" });
  });

  it("rejects duplicate itinerary day dates", async () => {
    const { app } = setup();
    await expect(
      app.addItineraryDay(
        { userId: "USER001" },
        "PLAN001",
        {
          schemaVersion: 1,
          dayId: "DAY003",
          date: "2026-07-20",
          stops: [],
        },
      ),
    ).rejects.toMatchObject({ code: "invalid-date" });
  });

  it("enforces collaborator permissions for lifecycle commands", async () => {
    const { app } = setup();
    await expect(
      app.publishTrip({ userId: "USER002" }, "PLAN001", { idempotencyKey: "pub-1" }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("publishes, activates and completes with idempotent lifecycle commands", async () => {
    const { app } = setup();
    const published = await app.publishTrip({ userId: "USER001" }, "PLAN001", { idempotencyKey: "pub-1" });
    expect(published.lifecycle).toBe("published");
    expect(published.joinCode).toBeTruthy();

    const publishedReplay = await app.publishTrip({ userId: "USER001" }, "PLAN001", { idempotencyKey: "pub-1" });
    expect(publishedReplay.version).toBe(published.version);

    const activated = await app.activateTrip({ userId: "USER001" }, "PLAN001", { idempotencyKey: "act-1" });
    expect(activated.lifecycle).toBe("active");

    const completed = await app.completeTrip({ userId: "USER001" }, "PLAN001", { idempotencyKey: "done-1" });
    expect(completed.lifecycle).toBe("completed");
  });

  it("detects concurrent updates via optimistic versioning", async () => {
    const repository = new MemoryTripPlanningRepository([GOLDEN_PLANNED_TRIP]);
    const current = (await repository.get("PLAN001"))!;
    const firstWrite = { ...current, version: 2, updatedAt: now, preferences: { ...current.preferences, pace: "fast" as const } };
    await expect(repository.putIfVersion(firstWrite, current.version)).resolves.toBe(true);
    const staleWrite = { ...current, version: 2, updatedAt: now, preferences: { ...current.preferences, pace: "relaxed" as const } };
    await expect(repository.putIfVersion(staleWrite, current.version)).resolves.toBe(false);
  });

  it("builds route requests and ranked recommendations from Tasco-backed inputs", async () => {
    const { app } = setup();
    const routeRequest = await app.getRouteRequest({ userId: "USER002" }, "PLAN001");
    expect(routeRequest.stopPlaceIds).toEqual([
      GOLDEN_ITINERARY.days[0]!.stops[0]!.tascoPlaceId,
      GOLDEN_ITINERARY.days[0]!.stops[1]!.tascoPlaceId,
      GOLDEN_ITINERARY.days[1]!.stops[0]!.tascoPlaceId,
    ]);

    const recommendations = await app.recommendPlaces(
      { userId: "USER002" },
      "PLAN001",
      {
        schemaVersion: 1,
        candidates: GOLDEN_RECOMMENDATION_CANDIDATES,
        anchorCoordinates: GOLDEN_PLACES.hanoiOldQuarter.coordinates,
      },
    );
    expect(recommendations[0]?.explanation).toContain("tasco:poi:");
  });

  it("blocks itinerary edits after activation", async () => {
    const { app } = setup();
    await app.publishTrip({ userId: "USER001" }, "PLAN001", { idempotencyKey: "pub-2" });
    await app.activateTrip({ userId: "USER001" }, "PLAN001", { idempotencyKey: "act-2" });
    await expect(
      app.addItineraryStop(
        { userId: "USER001" },
        "PLAN001",
        {
          schemaVersion: 1,
          dayId: "DAY002",
          stopId: "STOP999",
          place: {
            schemaVersion: 1,
            tascoPlaceId: "tasco:poi:POI999",
            name: "Late add",
            label: "Late add",
            address: "Somewhere",
            category: "Viewpoint",
            coordinates: { lat: 21, lon: 106 },
            source: "tasco",
          },
        },
      ),
    ).rejects.toMatchObject({ code: "invalid-lifecycle" });
  });
});
