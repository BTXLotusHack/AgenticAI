import {
  ApproveRegroupRequestV1Schema,
  ApproveRegroupResponseV1Schema,
  JoinTripRequestV1Schema,
  JoinTripResponseV1Schema,
  LiveSnapshotV1Schema,
  LocationTelemetryV1Schema,
  RealtimeEventV1Schema,
  SetReadinessRequestV1Schema,
  SetReadinessResponseV1Schema,
  type ApproveRegroupRequestV1,
  type ApproveRegroupResponseV1,
  type EventEnvelope,
  type JoinTripRequestV1,
  type JoinTripResponseV1,
  type LiveSnapshotV1,
  type LocationTelemetryV1,
  type NotificationRequest,
  type PlaceCandidate,
  type ProjectedLocationV1,
  type RealtimeEventV1,
  type RegroupRecommendationV1,
  type SetReadinessRequestV1,
  type SetReadinessResponseV1,
  type Situation,
  type TripMemberV1,
  type TripSummaryV1,
} from "@loopin/contracts";
import {
  CONVOY_POLICY_V1,
  acceptProjectedLocation,
  calculateGraph,
  createResolutionNotifications,
  createSplitNotifications,
  createTelemetryState,
  markSituationNotified,
  rankRegroupCandidates,
  reduceSplitSituation,
  type GraphEngineState,
  type IngestionStatus,
  type TelemetryState,
} from "@loopin/convoy-core";

export type Identity = { readonly userId: string };

export class ApplicationError extends Error {
  constructor(
    readonly code: "not-found" | "forbidden" | "conflict" | "invalid-request" | "unavailable",
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export type TripState = {
  readonly tripId: string;
  readonly joinCode: string;
  readonly leaderMemberId: string;
  readonly version: number;
  readonly snapshotRevision: number;
  readonly members: readonly TripMemberV1[];
  readonly placeCandidates: readonly PlaceCandidate[];
  readonly telemetryState: TelemetryState;
  readonly graphState?: GraphEngineState;
  readonly situation?: Situation;
  readonly recommendations: readonly RegroupRecommendationV1[];
  readonly notifications: readonly NotificationRequest[];
  readonly commandKeys: readonly string[];
  readonly summary?: TripSummaryV1;
};

export type CreateTripStateInput = {
  readonly tripId: string;
  readonly joinCode: string;
  readonly leaderMemberId: string;
  readonly members: readonly TripMemberV1[];
  readonly placeCandidates: readonly PlaceCandidate[];
  readonly summary?: TripSummaryV1;
};

export function createTripState(input: CreateTripStateInput): TripState {
  return {
    tripId: input.tripId,
    joinCode: input.joinCode,
    leaderMemberId: input.leaderMemberId,
    version: 1,
    snapshotRevision: 0,
    members: structuredClone(input.members),
    placeCandidates: structuredClone(input.placeCandidates),
    telemetryState: createTelemetryState(),
    recommendations: [],
    notifications: [],
    commandKeys: [],
    ...(input.summary ? { summary: structuredClone(input.summary) } : {}),
  };
}

export interface TripRepository {
  get(tripId: string): Promise<TripState | undefined>;
  findByJoinCode(joinCode: string): Promise<TripState | undefined>;
  putIfVersion(state: TripState, expectedVersion: number): Promise<boolean>;
}

export class MemoryTripRepository implements TripRepository {
  private readonly states = new Map<string, TripState>();

  constructor(initial: readonly TripState[] = []) {
    initial.forEach((state) => this.states.set(state.tripId, structuredClone(state)));
  }

  async get(tripId: string): Promise<TripState | undefined> {
    const state = this.states.get(tripId);
    return state ? structuredClone(state) : undefined;
  }

  async findByJoinCode(joinCode: string): Promise<TripState | undefined> {
    const normalized = joinCode.toUpperCase();
    const state = [...this.states.values()].find((candidate) => candidate.joinCode.toUpperCase() === normalized);
    return state ? structuredClone(state) : undefined;
  }

  async putIfVersion(state: TripState, expectedVersion: number): Promise<boolean> {
    if (state.version !== expectedVersion + 1 || this.states.get(state.tripId)?.version !== expectedVersion) return false;
    this.states.set(state.tripId, structuredClone(state));
    return true;
  }
}

export interface MapsProvider {
  project(telemetry: LocationTelemetryV1): Promise<ProjectedLocationV1>;
}

export interface Clock {
  now(): string;
}

export class FixedClock implements Clock {
  constructor(private current: string) {}

  now(): string {
    return this.current;
  }

  set(current: string): void {
    this.current = current;
  }
}

export class FixtureMapsProvider implements MapsProvider {
  private readonly projections = new Map<string, ProjectedLocationV1>();

  add(projection: ProjectedLocationV1): void {
    this.projections.set(projection.sourceTelemetryEventId, structuredClone(projection));
  }

  async project(telemetry: LocationTelemetryV1): Promise<ProjectedLocationV1> {
    const projection = this.projections.get(telemetry.eventId);
    if (!projection) throw new ApplicationError("unavailable", "No route projection is available for this observation.", true);
    return structuredClone(projection);
  }
}

export interface Publisher<T> {
  publish(channel: string, payload: T): Promise<void>;
}

export class RecordingPublisher<T = unknown> implements Publisher<T> {
  readonly messages: Array<{ channel: string; payload: T }> = [];

  async publish(channel: string, payload: T): Promise<void> {
    this.messages.push({ channel, payload: structuredClone(payload) });
  }
}

type ApplicationDependencies = {
  readonly repository: TripRepository;
  readonly maps: MapsProvider;
  readonly clock: Clock;
  readonly domainEvents: Publisher<EventEnvelope>;
  readonly realtime: Publisher<RealtimeEventV1>;
};

export type ProcessTelemetryResult = {
  readonly status: IngestionStatus;
  readonly snapshotRevision: number;
  readonly graph?: GraphEngineState["graph"];
  readonly situation?: Situation;
  readonly notifications: readonly NotificationRequest[];
};

function memberForIdentity(state: TripState, identity: Identity): TripMemberV1 {
  const member = state.members.find((candidate) => candidate.userId === identity.userId);
  if (!member) throw new ApplicationError("forbidden", "Active trip membership is required.");
  return member;
}

function localeByMember(state: TripState): Record<string, "en" | "vi"> {
  return Object.fromEntries(state.members.map((member) => [member.memberId, "vi"]));
}

function recommendationFor(state: TripState, situation: Situation, now: string): RegroupRecommendationV1 {
  const ranking = rankRegroupCandidates(state.placeCandidates, { requiresParking: true }, CONVOY_POLICY_V1);
  return {
    schemaVersion: 1,
    recommendationId: `recommendation:${situation.situationId}`,
    tripId: state.tripId,
    situationId: situation.situationId,
    policyVersion: ranking.policyVersion,
    state: "pending",
    selectedCandidate: ranking.selectedCandidate?.candidate ?? null,
    excludedCandidates: ranking.excludedCandidates,
    createdAt: now,
    expiresAt: new Date(Date.parse(now) + 15 * 60_000).toISOString(),
  };
}

export class LoopinApplication {
  constructor(private readonly dependencies: ApplicationDependencies) {}

  async joinTrip(identity: Identity, rawRequest: JoinTripRequestV1): Promise<JoinTripResponseV1> {
    const request = JoinTripRequestV1Schema.parse(rawRequest);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const state = await this.dependencies.repository.findByJoinCode(request.joinCode);
      if (!state) throw new ApplicationError("not-found", "The join code is invalid or expired.");
      const existing = state.members.find((member) => member.userId === identity.userId);
      if (existing) return JoinTripResponseV1Schema.parse({ schemaVersion: 1, tripId: state.tripId, member: existing });
      const member: TripMemberV1 = {
        memberId: `M${String(state.members.length + 1).padStart(3, "0")}`,
        tripId: state.tripId,
        userId: identity.userId,
        displayName: request.displayName,
        role: "member",
        readinessState: "not-ready",
        visibilityPolicy: "group",
      };
      const next: TripState = { ...state, version: state.version + 1, members: [...state.members, member] };
      if (await this.dependencies.repository.putIfVersion(next, state.version)) {
        return JoinTripResponseV1Schema.parse({ schemaVersion: 1, tripId: state.tripId, member });
      }
    }
    throw new ApplicationError("conflict", "The trip changed while joining. Retry the request.", true);
  }

  async setReadiness(
    identity: Identity,
    tripId: string,
    memberId: string,
    rawRequest: SetReadinessRequestV1,
  ): Promise<SetReadinessResponseV1> {
    const request = SetReadinessRequestV1Schema.parse(rawRequest);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const state = await this.requireTrip(tripId);
      const caller = memberForIdentity(state, identity);
      if (caller.memberId !== memberId) throw new ApplicationError("forbidden", "Members may update only their own readiness.");
      const member = { ...caller, readinessState: request.ready ? "ready" as const : "not-ready" as const };
      const next: TripState = {
        ...state,
        version: state.version + 1,
        members: state.members.map((candidate) => candidate.memberId === memberId ? member : candidate),
      };
      if (await this.dependencies.repository.putIfVersion(next, state.version)) {
        return SetReadinessResponseV1Schema.parse({ schemaVersion: 1, member, tripVersion: next.version });
      }
    }
    throw new ApplicationError("conflict", "The trip changed while updating readiness.", true);
  }

  async getLiveSnapshot(identity: Identity, tripId: string): Promise<LiveSnapshotV1> {
    const state = await this.requireTrip(tripId);
    const viewer = memberForIdentity(state, identity);
    if (!state.graphState) throw new ApplicationError("unavailable", "Live trip state is not ready yet.", true);
    return LiveSnapshotV1Schema.parse({
      schemaVersion: 1,
      tripId,
      snapshotRevision: state.snapshotRevision,
      generatedAt: state.graphState.graph.calculatedAt,
      viewer: { memberId: viewer.memberId, role: viewer.role },
      graph: state.graphState.graph,
      situations: state.situation ? [state.situation] : [],
      recommendations: viewer.role === "leader" ? state.recommendations : [],
      notifications: state.notifications.filter((notification) => notification.recipientMemberId === viewer.memberId),
    });
  }

  async processTelemetry(identity: Identity, rawTelemetry: LocationTelemetryV1, receivedAt: string): Promise<ProcessTelemetryResult> {
    const telemetry = LocationTelemetryV1Schema.parse(rawTelemetry);
    const initialState = await this.requireTrip(telemetry.tripId);
    const initialMember = memberForIdentity(initialState, identity);
    if (initialMember.memberId !== telemetry.memberId) {
      throw new ApplicationError("forbidden", "Telemetry identity does not match the active member.");
    }
    const projection = await this.dependencies.maps.project(telemetry);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const state = await this.requireTrip(telemetry.tripId);
      const member = memberForIdentity(state, identity);
      if (member.memberId !== telemetry.memberId) throw new ApplicationError("forbidden", "Telemetry identity does not match the active member.");
      const ingestion = acceptProjectedLocation(state.telemetryState, { telemetry, projection }, receivedAt);
      if (["duplicate", "stale-sequence", "rejected"].includes(ingestion.status)) {
        return { status: ingestion.status, snapshotRevision: state.snapshotRevision, notifications: [] };
      }
      if (ingestion.status === "history-only") {
        const next = { ...state, version: state.version + 1, telemetryState: ingestion.state };
        if (await this.dependencies.repository.putIfVersion(next, state.version)) {
          return { status: ingestion.status, snapshotRevision: state.snapshotRevision, notifications: [] };
        }
        continue;
      }

      const graphResult = calculateGraph(
        state.graphState,
        Object.values(ingestion.state.currentNodes),
        receivedAt,
        CONVOY_POLICY_V1,
      );
      const transition = reduceSplitSituation(state.situation, graphResult.graph, [telemetry.eventId]);
      let situation = transition.situation ?? state.situation;
      let notifications: NotificationRequest[] = [];
      let recommendations = [...state.recommendations];

      if (transition.transition === "confirmed" && transition.situation) {
        notifications = createSplitNotifications(transition.situation, graphResult.graph, localeByMember(state));
        recommendations = [recommendationFor(state, transition.situation, receivedAt)];
        situation = markSituationNotified(transition.situation, receivedAt).situation;
      } else if (transition.transition === "resolved" && transition.situation) {
        notifications = createResolutionNotifications(transition.situation, graphResult.graph, localeByMember(state));
      }

      const changed = graphResult.changed || transition.transition !== "none" || notifications.length > 0;
      const next: TripState = {
        ...state,
        version: state.version + 1,
        snapshotRevision: state.snapshotRevision + (changed ? 1 : 0),
        telemetryState: ingestion.state,
        graphState: graphResult.state,
        ...(situation ? { situation } : {}),
        recommendations,
        notifications: [...state.notifications, ...notifications],
      };
      if (!(await this.dependencies.repository.putIfVersion(next, state.version))) continue;

      if (changed) await this.publishState(next, telemetry.eventId, receivedAt, notifications);
      return {
        status: ingestion.status,
        snapshotRevision: next.snapshotRevision,
        graph: graphResult.graph,
        ...(situation ? { situation } : {}),
        notifications,
      };
    }
    throw new ApplicationError("conflict", "Trip state changed while accepting telemetry.", true);
  }

  async approveRegroup(
    identity: Identity,
    tripId: string,
    recommendationId: string,
    rawRequest: ApproveRegroupRequestV1,
  ): Promise<ApproveRegroupResponseV1> {
    const request = ApproveRegroupRequestV1Schema.parse(rawRequest);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const state = await this.requireTrip(tripId);
      const member = memberForIdentity(state, identity);
      if (member.role !== "leader") throw new ApplicationError("forbidden", "Only the trip leader may approve regrouping.");
      const recommendation = state.recommendations.find((candidate) => candidate.recommendationId === recommendationId);
      if (!recommendation) throw new ApplicationError("not-found", "The regroup recommendation does not exist.");
      if (state.commandKeys.includes(request.idempotencyKey)) {
        return ApproveRegroupResponseV1Schema.parse({ schemaVersion: 1, recommendation });
      }
      if (recommendation.state !== "pending" || !recommendation.selectedCandidate) {
        throw new ApplicationError("conflict", "The regroup recommendation cannot be approved.");
      }
      const selectedCandidate = recommendation.selectedCandidate;
      const now = this.dependencies.clock.now();
      if (Date.parse(now) >= Date.parse(recommendation.expiresAt)) {
        throw new ApplicationError("conflict", "The regroup recommendation has expired.");
      }
      const approved: RegroupRecommendationV1 = {
        ...recommendation,
        state: "approved",
        approvedAt: now,
        approvedByMemberId: member.memberId,
      };
      const next: TripState = {
        ...state,
        version: state.version + 1,
        snapshotRevision: state.snapshotRevision + 1,
        recommendations: state.recommendations.map((candidate) => candidate.recommendationId === recommendationId ? approved : candidate),
        commandKeys: [...state.commandKeys, request.idempotencyKey],
      };
      if (await this.dependencies.repository.putIfVersion(next, state.version)) {
        const event = RealtimeEventV1Schema.parse({
          schemaVersion: 1,
          eventId: `realtime:${request.commandId}`,
          tripId,
          snapshotRevision: next.snapshotRevision,
          graphRevision: next.graphState?.graph.graphRevision ?? 0,
          audience: { kind: "trip" },
          eventType: "RegroupApproved",
          occurredAt: now,
          expiresAt: approved.expiresAt,
          payload: { recommendationId, poiId: selectedCandidate.poiId },
        });
        await this.dependencies.realtime.publish(`/trip/${tripId}/state`, event);
        return ApproveRegroupResponseV1Schema.parse({ schemaVersion: 1, recommendation: approved });
      }
    }
    throw new ApplicationError("conflict", "Trip state changed while approving regrouping.", true);
  }

  async getSummary(identity: Identity, tripId: string): Promise<TripSummaryV1> {
    const state = await this.requireTrip(tripId);
    memberForIdentity(state, identity);
    if (!state.summary) throw new ApplicationError("unavailable", "The trip summary is not ready yet.", true);
    return structuredClone(state.summary);
  }

  private async requireTrip(tripId: string): Promise<TripState> {
    const state = await this.dependencies.repository.get(tripId);
    if (!state) throw new ApplicationError("not-found", "The trip does not exist.");
    return state;
  }

  private async publishState(
    state: TripState,
    causationId: string,
    occurredAt: string,
    notifications: readonly NotificationRequest[],
  ): Promise<void> {
    const graph = state.graphState!.graph;
    const domainEvent: EventEnvelope = {
      schemaVersion: 1,
      eventId: `graph:${state.tripId}:${graph.graphRevision}:${state.snapshotRevision}`,
      eventType: "ConvoyGraphChanged",
      occurredAt,
      producedAt: occurredAt,
      correlationId: causationId,
      causationId,
      tripId: state.tripId,
      producer: "loopin-application",
      payload: { graphRevision: graph.graphRevision, snapshotRevision: state.snapshotRevision },
    };
    await this.dependencies.domainEvents.publish(`trip.${state.tripId}.events`, domainEvent);

    const graphEvent = RealtimeEventV1Schema.parse({
      schemaVersion: 1,
      eventId: `realtime:${domainEvent.eventId}`,
      tripId: state.tripId,
      snapshotRevision: state.snapshotRevision,
      graphRevision: graph.graphRevision,
      audience: { kind: "trip" },
      eventType: "ConvoyGraphChanged",
      occurredAt,
      expiresAt: new Date(Date.parse(occurredAt) + 5 * 60_000).toISOString(),
      payload: { overallState: graph.overallState },
    });
    await this.dependencies.realtime.publish(`/trip/${state.tripId}/state`, graphEvent);

    for (const notification of notifications) {
      const event = RealtimeEventV1Schema.parse({
        schemaVersion: 1,
        eventId: `realtime:${notification.notificationId}`,
        tripId: state.tripId,
        snapshotRevision: state.snapshotRevision,
        graphRevision: graph.graphRevision,
        audience: { kind: "member", memberId: notification.recipientMemberId },
        eventType: "NotificationRequested",
        occurredAt: notification.createdAt,
        expiresAt: notification.expiresAt,
        payload: { notification },
      });
      await this.dependencies.realtime.publish(`/trip/${state.tripId}/member/${notification.recipientMemberId}/alerts`, event);
    }
  }
}
