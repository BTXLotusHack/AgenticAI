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
  createTripsHttpHandler,
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
          place: GOLDEN_PLACES.hanoiOldQuarter,
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

  it("allows expired idempotency keys to be reused for later commands", async () => {
    const { app, clock } = setup();
    await app.publishTrip({ userId: "USER001" }, "PLAN001", { idempotencyKey: "reuse-after-expiry" });
    clock.set("2026-07-21T09:00:00.000Z");

    await expect(
      app.activateTrip({ userId: "USER001" }, "PLAN001", { idempotencyKey: "reuse-after-expiry" }),
    ).resolves.toMatchObject({ lifecycle: "active" });
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
    expect(recommendations[0]?.explanation).toContain("poi:");
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
            id: "poi:late-add",
            provider: "tasco",
            name: "Late add",
            address: "Somewhere",
            coordinates: { lat: 21, lon: 106 },
            categories: ["viewpoint"],
            sourceVersion: "tasco-mock-2026-06-25",
          },
        },
      ),
    ).rejects.toMatchObject({ code: "invalid-lifecycle" });
  });
});

describe("Trips HTTP handler", () => {
  it("routes create, list, invite, join and route refresh operations through validated service contracts", async () => {
    const { app } = setup();
    const handle = createTripsHttpHandler(app);
    const identity = { userId: "USER001" };

    const list = await handle({ method: "GET", path: "/v1/trips", identity });
    const listBody = list.body as { items: Array<{ tripId: string }> };
    expect(list.status).toBe(200);
    expect(listBody.items[0]?.tripId).toBe("PLAN001");

    const invite = await handle({
      method: "POST",
      path: "/v1/trips/PLAN001/invites",
      identity,
      body: { idempotencyKey: "invite-1" },
    });
    const inviteBody = invite.body as { joinCode: string };
    expect(invite.status).toBe(201);
    expect(inviteBody.joinCode).toMatch(/^[A-HJ-NP-Z2-9]{16}$/);

    const join = await handle({
      method: "POST",
      path: "/v1/trips/join",
      identity: { userId: "USER004" },
      body: { schemaVersion: 1, joinCode: inviteBody.joinCode, displayName: "Guest Driver" },
    });
    const joinBody = join.body as { result: { schemaVersion: 1; tripId: string; memberId: string; role: string; consentRequirements: string[] } };
    expect(join.status).toBe(200);
    expect(joinBody.result).toMatchObject({
      schemaVersion: 1,
      tripId: "PLAN001",
      memberId: "USER004",
      role: "member",
      consentRequirements: ["location-while-driving", "driver-alerts"],
    });

    const route = await handle({
      method: "POST",
      path: "/v1/trips/PLAN001/routes/refresh",
      identity,
      body: { idempotencyKey: "route-1" },
    });
    const routeBody = route.body as { route: { stopPlaceIds: string[] } };
    expect(route.status).toBe(200);
    expect(routeBody.route.stopPlaceIds).toEqual([
      "poi:hanoi-old-quarter",
      "poi:poi001-minh-chau-rest-stop",
      "poi:ha-long-bai-chay",
    ]);
  });
});
