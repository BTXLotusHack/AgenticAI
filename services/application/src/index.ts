import {
  ApproveRegroupRequestV1Schema,
  ApproveRegroupResponseV1Schema,
  CompleteTripRequestV1Schema,
  CompleteTripResponseV1Schema,
  JoinTripRequestV1Schema,
  JoinTripResponseV1Schema,
  LiveSnapshotV1Schema,
  LocationTelemetryV1Schema,
  RealtimeEventV1Schema,
  SetReadinessRequestV1Schema,
  SetReadinessResponseV1Schema,
  type ApproveRegroupRequestV1,
  type ApproveRegroupResponseV1,
  type CompleteTripRequestV1,
  type CompleteTripResponseV1,
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
  summarizeTrip,
  type GraphEngineState,
  type IngestionStatus,
  type TelemetryState,
} from "@loopin/convoy-core";

export type Identity = { readonly userId: string };
const MAX_REJECTION_RECEIPTS = 2_048;

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
  readonly commandReceipts: readonly CommandReceipt[];
  readonly outbox: readonly OutboxMessage[];
  readonly summary?: TripSummaryV1;
  readonly startedAt?: string;
  readonly rejectionReceipts: ReadonlyArray<{ readonly key: string; readonly expiresAt: string }>;
  readonly rejectedTelemetryCount: number;
  readonly notificationRequestCount: number;
  readonly regroupRecommendationCount: number;
  readonly latestTelemetryEventIdByMember: Readonly<Record<string, string>>;
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
    commandReceipts: [],
    outbox: [],
    rejectionReceipts: [],
    rejectedTelemetryCount: 0,
    notificationRequestCount: 0,
    regroupRecommendationCount: 0,
    latestTelemetryEventIdByMember: {},
    ...(input.summary ? { summary: structuredClone(input.summary) } : {}),
  };
}

export interface TripRepository {
  get(tripId: string): Promise<TripState | undefined>;
  findByJoinCode(joinCode: string): Promise<TripState | undefined>;
  putIfVersion(state: TripState, expectedVersion: number, condition?: TripStateWriteCondition): Promise<boolean>;
}

export type TripStateWriteCondition = {
  readonly now: string;
  readonly telemetry?: {
    readonly eventId: string;
    readonly memberId: string;
    readonly sequence: number;
    readonly expiresAt: string;
    readonly advancesLiveSequence: boolean;
  };
  readonly command?: {
    readonly idempotencyKey: string;
    readonly fingerprint: string;
    readonly expiresAt: string;
  };
};

export class MemoryTripRepository implements TripRepository {
  private readonly states = new Map<string, TripState>();
  private readonly eventReservations = new Map<string, string>();
  private readonly latestSequenceByMember = new Map<string, number>();
  private readonly commandReservations = new Map<string, { fingerprint: string; expiresAt: string }>();

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

  async putIfVersion(state: TripState, expectedVersion: number, condition?: TripStateWriteCondition): Promise<boolean> {
    if (state.version !== expectedVersion + 1 || this.states.get(state.tripId)?.version !== expectedVersion) return false;
    if (condition) {
      const now = Date.parse(condition.now);
      for (const [key, expiresAt] of this.eventReservations) {
        if (Date.parse(expiresAt) <= now) this.eventReservations.delete(key);
      }
      for (const [key, reservation] of this.commandReservations) {
        if (Date.parse(reservation.expiresAt) <= now) this.commandReservations.delete(key);
      }
      if (condition.telemetry) {
        if (this.eventReservations.has(condition.telemetry.eventId)) return false;
        const sequenceKey = `${state.tripId}:${condition.telemetry.memberId}`;
        const latest = this.latestSequenceByMember.get(sequenceKey);
        if (condition.telemetry.advancesLiveSequence && latest !== undefined && condition.telemetry.sequence <= latest) return false;
      }
      if (condition.command && this.commandReservations.has(condition.command.idempotencyKey)) return false;
    }
    this.states.set(state.tripId, structuredClone(state));
    if (condition?.telemetry) {
      this.eventReservations.set(condition.telemetry.eventId, condition.telemetry.expiresAt);
      if (condition.telemetry.advancesLiveSequence) {
        this.latestSequenceByMember.set(`${state.tripId}:${condition.telemetry.memberId}`, condition.telemetry.sequence);
      }
    }
    if (condition?.command) {
      this.commandReservations.set(condition.command.idempotencyKey, {
        fingerprint: condition.command.fingerprint,
        expiresAt: condition.command.expiresAt,
      });
    }
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
  private readonly replayTimes = new Map<string, {
    calculatedAt: string;
    receivedAt: string;
    expectedObservedAt?: string;
    expectedSentAt?: string;
  }>();

  add(projection: ProjectedLocationV1, trustedReplayTime?: {
    readonly calculatedAt: string;
    readonly receivedAt: string;
    readonly expectedObservedAt?: string;
    readonly expectedSentAt?: string;
  }): void {
    this.projections.set(projection.sourceTelemetryEventId, structuredClone(projection));
    if (trustedReplayTime) this.replayTimes.set(projection.sourceTelemetryEventId, { ...trustedReplayTime });
  }

  trustedReplayTime(eventId: string): { calculatedAt: string; receivedAt: string } | undefined {
    const value = this.replayTimes.get(eventId);
    return value ? { ...value } : undefined;
  }

  async project(telemetry: LocationTelemetryV1): Promise<ProjectedLocationV1> {
    const projection = this.projections.get(telemetry.eventId);
    if (!projection) throw new ApplicationError("unavailable", "No route projection is available for this observation.", true);
    const replayTime = this.replayTimes.get(telemetry.eventId);
    if (replayTime && (
      (replayTime.expectedObservedAt !== undefined && telemetry.observedAt !== replayTime.expectedObservedAt)
      || (replayTime.expectedSentAt !== undefined && telemetry.sentAt !== replayTime.expectedSentAt)
    )) {
      throw new ApplicationError("invalid-request", "Replay telemetry timestamps do not match the trusted fixture.");
    }
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

export type OutboxMessage =
  | { readonly messageId: string; readonly publisher: "domain"; readonly channel: string; readonly payload: EventEnvelope }
  | { readonly messageId: string; readonly publisher: "realtime"; readonly channel: string; readonly payload: RealtimeEventV1 };

export type CommandReceipt = {
  readonly idempotencyKey: string;
  readonly fingerprint: string;
  readonly recommendationId: string;
  readonly expiresAt: string;
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

function graphForViewer(state: TripState, viewer: TripMemberV1): GraphEngineState["graph"] {
  const graph = state.graphState!.graph;
  if (viewer.role === "leader") return graph;
  const hidden = new Set(
    state.members
      .filter((member) => member.memberId !== viewer.memberId && member.visibilityPolicy !== "group")
      .map((member) => member.memberId),
  );
  return {
    ...graph,
    leaderMemberId: graph.leaderMemberId && hidden.has(graph.leaderMemberId) ? null : graph.leaderMemberId,
    orderedMemberIds: graph.orderedMemberIds.filter((memberId) => !hidden.has(memberId)),
    edges: graph.edges.filter((edge) => !hidden.has(edge.aheadMemberId) && !hidden.has(edge.behindMemberId)),
    components: graph.components.flatMap((component) => {
      const memberIds = component.memberIds.filter((memberId) => !hidden.has(memberId));
      return memberIds.length === 0 ? [] : [{
        ...component,
        memberIds,
        frontBoundaryMemberId: memberIds[0]!,
        rearBoundaryMemberId: memberIds.at(-1)!,
        containsLeader: graph.leaderMemberId !== null && memberIds.includes(graph.leaderMemberId),
        averageSpeedKmh: memberIds.length === component.memberIds.length ? component.averageSpeedKmh : null,
      }];
    }),
  };
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

function synchronizedSourceEventIds(
  graphNodes: readonly TelemetryState["currentNodes"][string][],
  latestEventIdByMember: Readonly<Record<string, string>>,
  maximumSkewMs = 2_000,
): string[] | undefined {
  if (graphNodes.length === 0 || graphNodes.some((node) => !latestEventIdByMember[node.memberId])) return undefined;
  const observedTimes = graphNodes.map((node) => Date.parse(node.observedAt));
  return Math.max(...observedTimes) - Math.min(...observedTimes) <= maximumSkewMs
    ? graphNodes.map((node) => latestEventIdByMember[node.memberId]!)
    : undefined;
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
      graph: graphForViewer(state, viewer),
      situations: viewer.role === "leader" && state.situation ? [state.situation] : [],
      recommendations: viewer.role === "leader" ? state.recommendations : [],
      notifications: state.notifications.filter((notification) => notification.recipientMemberId === viewer.memberId),
    });
  }

  async processTelemetry(
    identity: Identity,
    rawTelemetry: LocationTelemetryV1,
    receivedAt: string,
    trustedReplayTime?: { readonly calculatedAt: string; readonly receivedAt: string },
  ): Promise<ProcessTelemetryResult> {
    const telemetry = LocationTelemetryV1Schema.parse(rawTelemetry);
    const initialState = await this.requireTrip(telemetry.tripId);
    const initialMember = memberForIdentity(initialState, identity);
    if (initialMember.memberId !== telemetry.memberId) {
      throw new ApplicationError("forbidden", "Telemetry identity does not match the active member.");
    }
    const projection = await this.dependencies.maps.project(telemetry);
    if (projection.role !== initialMember.role) {
      throw new ApplicationError("invalid-request", "Route projection role does not match authoritative membership.");
    }
    const calculatedAt = trustedReplayTime?.calculatedAt ?? receivedAt;
    const ingestionReceivedAt = trustedReplayTime?.receivedAt ?? receivedAt;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const state = await this.requireTrip(telemetry.tripId);
      const member = memberForIdentity(state, identity);
      if (member.memberId !== telemetry.memberId) throw new ApplicationError("forbidden", "Telemetry identity does not match the active member.");
      const ingestion = acceptProjectedLocation(state.telemetryState, { telemetry, projection }, ingestionReceivedAt);
      if (["duplicate", "stale-sequence", "rejected"].includes(ingestion.status)) {
        const rejectionKey = `${ingestion.status}:${telemetry.eventId}`;
        const activeRejectionReceipts = state.rejectionReceipts.filter((receipt) => Date.parse(receipt.expiresAt) > Date.parse(receivedAt));
        if (!activeRejectionReceipts.some((receipt) => receipt.key === rejectionKey)) {
          const next: TripState = {
            ...state,
            version: state.version + 1,
            rejectionReceipts: [...activeRejectionReceipts, {
              key: rejectionKey,
              expiresAt: new Date(Date.parse(receivedAt) + 24 * 60 * 60_000).toISOString(),
            }].slice(-MAX_REJECTION_RECEIPTS),
            rejectedTelemetryCount: state.rejectedTelemetryCount + 1,
          };
          if (!(await this.dependencies.repository.putIfVersion(next, state.version))) continue;
        }
        await this.flushOutbox(state.tripId);
        return { status: ingestion.status, snapshotRevision: state.snapshotRevision, notifications: [] };
      }
      if (ingestion.status === "history-only") {
        const next = { ...state, version: state.version + 1, telemetryState: ingestion.state };
        if (await this.dependencies.repository.putIfVersion(next, state.version, {
          now: receivedAt,
          telemetry: {
            eventId: telemetry.eventId,
            memberId: telemetry.memberId,
            sequence: telemetry.sequence,
            expiresAt: new Date(Date.parse(receivedAt) + 24 * 60 * 60_000).toISOString(),
            advancesLiveSequence: false,
          },
        })) {
          return { status: ingestion.status, snapshotRevision: state.snapshotRevision, notifications: [] };
        }
        continue;
      }

      const activeMemberIds = new Set(state.members
        .filter((member) => member.readinessState === "ready" && member.visibilityPolicy !== "paused")
        .map((member) => member.memberId));
      const graphNodes = Object.values(ingestion.state.currentNodes).filter((node) => activeMemberIds.has(node.memberId));
      const graphResult = calculateGraph(
        state.graphState,
        graphNodes,
        calculatedAt,
        CONVOY_POLICY_V1,
      );
      const latestTelemetryEventIdByMember = {
        ...state.latestTelemetryEventIdByMember,
        [telemetry.memberId]: telemetry.eventId,
      };
      const sourceEventIds = synchronizedSourceEventIds(graphNodes, latestTelemetryEventIdByMember);
      const transition = sourceEventIds
        ? reduceSplitSituation(state.situation, graphResult.graph, sourceEventIds)
        : { transition: "none" as const };
      let situation = transition.situation ?? state.situation;
      let notifications: NotificationRequest[] = [];
      let recommendations = [...state.recommendations];

      if (transition.transition === "confirmed" && transition.situation) {
        notifications = createSplitNotifications(transition.situation, graphResult.graph, localeByMember(state));
        recommendations = [recommendationFor(state, transition.situation, calculatedAt)];
        situation = markSituationNotified(transition.situation, calculatedAt).situation;
      } else if (transition.transition === "resolved" && transition.situation) {
        notifications = createResolutionNotifications(transition.situation, graphResult.graph, localeByMember(state));
      }

      const changed = graphResult.changed || transition.transition !== "none" || notifications.length > 0;
      const notificationRequestCount = state.notificationRequestCount + notifications.length;
      const regroupRecommendationCount = state.regroupRecommendationCount
        + (transition.transition === "confirmed" && recommendations.length > 0 ? 1 : 0);
      const startedAt = state.startedAt ?? telemetry.observedAt;
      const nextBase: TripState = {
        ...state,
        version: state.version + 1,
        snapshotRevision: state.snapshotRevision + (changed ? 1 : 0),
        telemetryState: ingestion.state,
        graphState: graphResult.state,
        ...(situation ? { situation } : {}),
        recommendations,
        notifications: [...state.notifications, ...notifications],
        startedAt,
        rejectedTelemetryCount: state.rejectedTelemetryCount,
        notificationRequestCount,
        regroupRecommendationCount,
        latestTelemetryEventIdByMember,
      };
      const next: TripState = {
        ...nextBase,
        outbox: changed
          ? [...state.outbox, ...this.buildStateMessages(
              nextBase,
              telemetry.eventId,
              calculatedAt,
              notifications,
              transition.transition,
              transition.situation,
            )]
          : state.outbox,
      };
      if (!(await this.dependencies.repository.putIfVersion(next, state.version, {
        now: receivedAt,
        telemetry: {
          eventId: telemetry.eventId,
          memberId: telemetry.memberId,
          sequence: telemetry.sequence,
          expiresAt: new Date(Date.parse(receivedAt) + 24 * 60 * 60_000).toISOString(),
          advancesLiveSequence: true,
        },
      }))) continue;

      await this.flushOutbox(next.tripId);
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
      const now = this.dependencies.clock.now();
      const recommendation = state.recommendations.find((candidate) => candidate.recommendationId === recommendationId);
      if (!recommendation) throw new ApplicationError("not-found", "The regroup recommendation does not exist.");
      const fingerprint = JSON.stringify({ command: "approve-regroup", tripId, recommendationId, userId: identity.userId });
      const receipt = state.commandReceipts.find((candidate) =>
        candidate.idempotencyKey === request.idempotencyKey && Date.parse(candidate.expiresAt) > Date.parse(now));
      if (receipt) {
        if (receipt.fingerprint !== fingerprint) {
          throw new ApplicationError("conflict", "The idempotency key was already used for a different command.");
        }
        await this.flushOutbox(tripId);
        const refreshed = await this.requireTrip(tripId);
        const previous = refreshed.recommendations.find((candidate) => candidate.recommendationId === receipt.recommendationId);
        if (!previous) throw new ApplicationError("conflict", "The prior command result is unavailable.");
        return ApproveRegroupResponseV1Schema.parse({ schemaVersion: 1, recommendation: previous });
      }
      if (recommendation.state !== "pending" || !recommendation.selectedCandidate) {
        throw new ApplicationError("conflict", "The regroup recommendation cannot be approved.");
      }
      const selectedCandidate = recommendation.selectedCandidate;
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
        commandReceipts: [...state.commandReceipts.filter((candidate) => Date.parse(candidate.expiresAt) > Date.parse(now)), {
          idempotencyKey: request.idempotencyKey,
          fingerprint,
          recommendationId,
          expiresAt: new Date(Date.parse(now) + 24 * 60 * 60_000).toISOString(),
        }],
        outbox: [...state.outbox],
      };
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
      const nextWithOutbox: TripState = {
        ...next,
        outbox: [...next.outbox, {
          messageId: event.eventId,
          publisher: "realtime",
          channel: `/trip/${tripId}/state`,
          payload: event,
        }],
      };
      if (await this.dependencies.repository.putIfVersion(nextWithOutbox, state.version, {
        now,
        command: {
          idempotencyKey: request.idempotencyKey,
          fingerprint,
          expiresAt: new Date(Date.parse(now) + 24 * 60 * 60_000).toISOString(),
        },
      })) {
        await this.flushOutbox(tripId);
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

  async completeTrip(
    identity: Identity,
    tripId: string,
    rawRequest: CompleteTripRequestV1,
    trustedCompletedAt?: string,
  ): Promise<CompleteTripResponseV1> {
    const request = CompleteTripRequestV1Schema.parse(rawRequest);
    const completedAt = trustedCompletedAt ?? this.dependencies.clock.now();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const state = await this.requireTrip(tripId);
      const member = memberForIdentity(state, identity);
      if (member.role !== "leader") throw new ApplicationError("forbidden", "Only the trip leader may complete the trip.");
      const fingerprint = JSON.stringify({ command: "complete-trip", tripId, userId: identity.userId });
      const receipt = state.commandReceipts.find((candidate) =>
        candidate.idempotencyKey === request.idempotencyKey && Date.parse(candidate.expiresAt) > Date.parse(completedAt));
      if (receipt && receipt.fingerprint !== fingerprint) {
        throw new ApplicationError("conflict", "The idempotency key was already used for a different command.");
      }
      if (state.summary) return CompleteTripResponseV1Schema.parse({ schemaVersion: 1, summary: state.summary });
      if (!state.startedAt || state.situation?.lifecycle !== "resolved" || !state.graphState) {
        throw new ApplicationError("conflict", "The trip cannot be completed before the convoy is reconnected.");
      }
      if (Date.parse(completedAt) < Date.parse(state.startedAt)) {
        throw new ApplicationError("invalid-request", "Trip completion cannot precede trip start.");
      }
      const summary = summarizeTrip({
        tripId,
        startedAt: state.startedAt,
        completedAt,
        situations: [state.situation],
        regroupRecommendationCount: state.regroupRecommendationCount,
        notificationRequestCount: state.notificationRequestCount,
        rejectedTelemetryCount: state.rejectedTelemetryCount,
      });
      const domainEvent: EventEnvelope = {
        schemaVersion: 1,
        eventId: `trip-completed:${tripId}:${request.commandId}`,
        eventType: "TripCompleted",
        occurredAt: completedAt,
        producedAt: completedAt,
        correlationId: request.commandId,
        tripId,
        producer: "loopin-application",
        payload: { summary },
      };
      const realtimeEvent = RealtimeEventV1Schema.parse({
        schemaVersion: 1,
        eventId: `realtime:${domainEvent.eventId}`,
        tripId,
        snapshotRevision: state.snapshotRevision + 1,
        graphRevision: state.graphState.graph.graphRevision,
        audience: { kind: "trip" },
        eventType: "TripCompleted",
        occurredAt: completedAt,
        expiresAt: new Date(Date.parse(completedAt) + 15 * 60_000).toISOString(),
        payload: { summary },
      });
      const expiresAt = new Date(Date.parse(completedAt) + 24 * 60 * 60_000).toISOString();
      const next: TripState = {
        ...state,
        version: state.version + 1,
        snapshotRevision: state.snapshotRevision + 1,
        summary,
        commandReceipts: [...state.commandReceipts.filter((candidate) => Date.parse(candidate.expiresAt) > Date.parse(completedAt)), {
          idempotencyKey: request.idempotencyKey,
          fingerprint,
          recommendationId: `summary:${tripId}`,
          expiresAt,
        }],
        outbox: [...state.outbox,
          { messageId: domainEvent.eventId, publisher: "domain", channel: `trip.${tripId}.events`, payload: domainEvent },
          { messageId: realtimeEvent.eventId, publisher: "realtime", channel: `/trip/${tripId}/state`, payload: realtimeEvent },
        ],
      };
      if (await this.dependencies.repository.putIfVersion(next, state.version, {
        now: completedAt,
        command: { idempotencyKey: request.idempotencyKey, fingerprint, expiresAt },
      })) {
        await this.flushOutbox(tripId);
        return CompleteTripResponseV1Schema.parse({ schemaVersion: 1, summary });
      }
    }
    throw new ApplicationError("conflict", "Trip state changed while completing the trip.", true);
  }

  private async requireTrip(tripId: string): Promise<TripState> {
    const state = await this.dependencies.repository.get(tripId);
    if (!state) throw new ApplicationError("not-found", "The trip does not exist.");
    return state;
  }

  private buildStateMessages(
    state: TripState,
    causationId: string,
    occurredAt: string,
    notifications: readonly NotificationRequest[],
    situationTransition: "none" | "confirmed" | "updated" | "notified" | "resolved",
    situationFact: Situation | undefined,
  ): OutboxMessage[] {
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
    const messages: OutboxMessage[] = [
      {
        messageId: domainEvent.eventId,
        publisher: "domain",
        channel: `trip.${state.tripId}.events`,
        payload: domainEvent,
      },
      {
        messageId: graphEvent.eventId,
        publisher: "realtime",
        channel: `/trip/${state.tripId}/state`,
        payload: graphEvent,
      },
    ];

    if (situationTransition !== "none" && situationFact) {
      const eventType = situationTransition === "confirmed"
        ? "SituationConfirmed"
        : situationTransition === "resolved"
          ? "SituationResolved"
          : situationTransition === "notified"
            ? "SituationNotified"
          : "SituationUpdated";
      const situationEvent: EventEnvelope = {
        schemaVersion: 1,
        eventId: `situation:${situationFact.situationId}:${situationTransition}:${graph.graphRevision}:${state.snapshotRevision}`,
        eventType,
        occurredAt,
        producedAt: occurredAt,
        correlationId: causationId,
        causationId,
        tripId: state.tripId,
        producer: "loopin-application",
        payload: { situation: situationFact },
      };
      const situationRealtime = RealtimeEventV1Schema.parse({
        schemaVersion: 1,
        eventId: `realtime:${situationEvent.eventId}`,
        tripId: state.tripId,
        snapshotRevision: state.snapshotRevision,
        graphRevision: graph.graphRevision,
        audience: { kind: "leader" },
        eventType,
        occurredAt,
        expiresAt: new Date(Date.parse(occurredAt) + 15 * 60_000).toISOString(),
        payload: { situation: situationFact },
      });
      messages.push(
        { messageId: situationEvent.eventId, publisher: "domain", channel: `trip.${state.tripId}.events`, payload: situationEvent },
        { messageId: situationRealtime.eventId, publisher: "realtime", channel: `/trip/${state.tripId}/leader/actions`, payload: situationRealtime },
      );
    }

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
      messages.push({
        messageId: event.eventId,
        publisher: "realtime",
        channel: `/trip/${state.tripId}/member/${notification.recipientMemberId}/alerts`,
        payload: event,
      });
    }
    return messages;
  }

  private async flushOutbox(tripId: string): Promise<void> {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const state = await this.requireTrip(tripId);
      const message = state.outbox[0];
      if (!message) return;
      if (message.publisher === "domain") {
        await this.dependencies.domainEvents.publish(message.channel, message.payload);
      } else {
        await this.dependencies.realtime.publish(message.channel, message.payload);
      }
      const next: TripState = {
        ...state,
        version: state.version + 1,
        outbox: state.outbox.slice(1),
      };
      await this.dependencies.repository.putIfVersion(next, state.version);
    }
    throw new ApplicationError("conflict", "The event outbox could not be drained.", true);
  }
}
