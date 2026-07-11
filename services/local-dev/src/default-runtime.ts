import {
  FixtureMapsProvider,
  LoopinApplication,
  MemoryTripRepository,
  RecordingPublisher,
  createTripState,
} from "@loopin/application";
import type { EventEnvelope, ProjectedLocationV1 } from "@loopin/contracts";
import { GOLDEN_R001, createGoldenR001Replay } from "@loopin/demo-scenarios";

import { LocalRealtimeHub, createLocalServer } from "./index";

export function createDefaultLocalRuntime() {
  const replay = createGoldenR001Replay();
  const summary = replay.at(-1)?.summary;
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
      ...(summary ? { summary } : {}),
    }),
  ]);
  const maps = new FixtureMapsProvider();
  for (const frame of replay) {
    for (const node of frame.nodes) {
      const sourceTelemetryEventId = `gps:${frame.elapsedSeconds}:${node.memberId}`;
      const projection: ProjectedLocationV1 = {
        schemaVersion: 1,
        eventId: `projection:${sourceTelemetryEventId}`,
        sourceTelemetryEventId,
        tripId: node.tripId,
        memberId: node.memberId,
        role: node.role,
        routeProgressMeters: node.routeProgressMeters,
        routeDeviationMeters: node.routeDeviationMeters,
        matchConfidence: node.confidence,
        projectedAt: frame.occurredAt,
      };
      maps.add(projection);
    }
  }
  const realtime = new LocalRealtimeHub(repository);
  const app = new LoopinApplication({
    repository,
    maps,
    realtime,
    domainEvents: new RecordingPublisher<EventEnvelope>(),
    clock: { now: () => new Date().toISOString() },
  });
  return { app, repository, maps, realtime };
}

export function createDefaultLocalServer(allowedOrigins: readonly string[] = ["http://127.0.0.1:4173", "http://localhost:5173"]) {
  return createLocalServer({
    ...createDefaultLocalRuntime(),
    environment: "local",
    allowedOrigins,
  });
}
