import {
  FixtureMapsProvider,
  FixedClock,
  LoopinApplication,
  MemoryTripRepository,
  RecordingPublisher,
  createTripState,
} from "@loopin/application";
import type { EventEnvelope } from "@loopin/contracts";
import { GOLDEN_R001, createGoldenR001TelemetryInputs } from "@loopin/demo-scenarios";

import { LocalRealtimeHub, createLocalServer } from "./index";

export function createDefaultLocalRuntime() {
  const repository = new MemoryTripRepository([
    createTripState({
      tripId: GOLDEN_R001.trip.tripId,
      joinCode: "HALONG26",
      leaderMemberId: GOLDEN_R001.trip.leaderMemberId,
      members: GOLDEN_R001.members.map((member, index) => ({
        memberId: member.memberId,
        tripId: GOLDEN_R001.trip.tripId,
        userId: `USER00${index + 1}`,
        displayName: member.name,
        role: member.role,
        readinessState: "ready" as const,
        visibilityPolicy: member.privacySetting === "Leader only" ? "leader-only" as const : "group" as const,
      })),
      placeCandidates: [...GOLDEN_R001.candidates],
    }),
  ]);
  const maps = new FixtureMapsProvider();
  for (const input of createGoldenR001TelemetryInputs()) maps.add(input.projection);
  const realtime = new LocalRealtimeHub(repository);
  const app = new LoopinApplication({
    repository,
    maps,
    realtime,
    domainEvents: new RecordingPublisher<EventEnvelope>(),
    clock: new FixedClock("2026-07-20T00:00:36.000Z"),
  });
  return { app, repository, maps, realtime };
}

export function createDefaultLocalServer(
  allowedOrigins: readonly string[] = ["http://127.0.0.1:4173", "http://localhost:5173"],
  configuredEnvironment = process.env.LOOPIN_ENV ?? "local",
) {
  if (configuredEnvironment !== "local" && configuredEnvironment !== "test") {
    throw new Error("Fixture identity is disabled unless LOOPIN_ENV is local or test.");
  }
  return createLocalServer({
    ...createDefaultLocalRuntime(),
    environment: configuredEnvironment,
    allowedOrigins,
    logger: { log: (record) => process.stdout.write(`${JSON.stringify(record)}\n`) },
  });
}
