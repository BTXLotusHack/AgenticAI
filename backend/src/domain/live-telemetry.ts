import {
  CONVOY_POLICY_V1,
  acceptProjectedLocation,
  calculateGraph,
  createResolutionNotifications,
  createSplitNotifications,
  createTelemetryState,
  markSituationNotified,
  reduceSplitSituation,
  type ConvoySituationEventV1,
  type DriverAlertAcknowledgementV1,
  type DriverAlertV1,
  type GraphEngineState,
  type IngestionStatus,
  type LiveMemberSnapshotV1,
  type LiveSnapshotV1,
  type LocationTelemetryV1,
  type NotificationRequest,
  type ProjectedLocationV1,
  type RealtimeEventV1,
  type RegroupRecommendationV1,
  type Situation,
  type TelemetryState,
  type VehicleNode,
} from "@loopin/convoy-core";

type Locale = "en" | "vi";

export type LiveTripState = {
  readonly tripId: string;
  readonly telemetryState: TelemetryState;
  readonly graphState?: GraphEngineState;
  readonly activeSituation?: Situation;
  readonly currentMembers: Readonly<Record<string, LiveMemberSnapshotV1>>;
  readonly situationsById: Readonly<Record<string, Situation>>;
  readonly recommendationsById: Readonly<Record<string, RegroupRecommendationV1>>;
  readonly notificationsById: Readonly<Record<string, NotificationRequest>>;
  readonly alertAcknowledgementsById: Readonly<Record<string, DriverAlertAcknowledgementV1>>;
  readonly localeByMember: Readonly<Record<string, Locale>>;
  readonly snapshotRevision: number;
};

export type ProjectedTelemetryInput = {
  readonly telemetry: LocationTelemetryV1;
  readonly projection: ProjectedLocationV1;
  readonly receivedAt: string;
};

export type LiveTelemetryProcessingResult = {
  readonly status: IngestionStatus;
  readonly state: LiveTripState;
  readonly events: RealtimeEventV1[];
  readonly snapshot?: LiveSnapshotV1;
};

export type DriverAlertAcknowledgementStatus = "acknowledged" | "duplicate" | "unknown-alert";

export type DriverAlertAcknowledgementResult = {
  readonly status: DriverAlertAcknowledgementStatus;
  readonly state: LiveTripState;
  readonly events: RealtimeEventV1[];
};

export type RegroupCandidateSelectionStatus = "selected" | "duplicate" | "no-safe-candidate";

export type RegroupCandidateSelectionResult = {
  readonly status: RegroupCandidateSelectionStatus;
  readonly state: LiveTripState;
  readonly events: RealtimeEventV1[];
};

function plusMinutes(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
}

function sortByMemberId<T extends { memberId: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => left.memberId.localeCompare(right.memberId));
}

function memberSnapshot(
  telemetry: LocationTelemetryV1,
  projection: ProjectedLocationV1,
  receivedAt: string,
  node: VehicleNode,
): LiveMemberSnapshotV1 {
  return {
    memberId: telemetry.memberId,
    tripId: telemetry.tripId,
    role: projection.role,
    latitude: telemetry.latitude,
    longitude: telemetry.longitude,
    snappedLatitude: telemetry.latitude,
    snappedLongitude: telemetry.longitude,
    routeProgressMeters: projection.routeProgressMeters,
    routeDeviationMeters: projection.routeDeviationMeters,
    speedKmh: telemetry.speedKmh,
    headingDegrees: telemetry.headingDegrees,
    accuracyMeters: telemetry.accuracyMeters,
    observedAt: telemetry.observedAt,
    receivedAt,
    sequence: telemetry.sequence,
    sourceTelemetryEventId: telemetry.eventId,
    confidence: node.confidence,
    connectivity: node.connectivity,
    policyVersion: CONVOY_POLICY_V1.version,
  };
}

function realtimeEvent(
  eventType: RealtimeEventV1["eventType"],
  input: {
    readonly tripId: string;
    readonly snapshotRevision: number;
    readonly graphRevision: number;
    readonly occurredAt: string;
    readonly audience: RealtimeEventV1["audience"];
    readonly payload: Record<string, unknown>;
    readonly suffix?: string;
    readonly expiresAt?: string;
  },
): RealtimeEventV1 {
  const suffix = input.suffix ? `:${input.suffix}` : "";
  return {
    schemaVersion: 1,
    eventId: `realtime:${input.tripId}:${input.snapshotRevision}:${eventType}${suffix}`,
    tripId: input.tripId,
    snapshotRevision: input.snapshotRevision,
    graphRevision: input.graphRevision,
    audience: input.audience,
    eventType,
    occurredAt: input.occurredAt,
    expiresAt: input.expiresAt ?? plusMinutes(input.occurredAt, 5),
    payload: input.payload,
  };
}

function convoySituationEvent(
  eventType: "convoySituationCreated" | "convoySituationUpdated",
  situation: Situation,
  input: {
    readonly tripId: string;
    readonly snapshotRevision: number;
    readonly graphRevision: number;
    readonly occurredAt: string;
  },
): ConvoySituationEventV1 {
  return {
    schemaVersion: 1,
    eventId: `situation:${situation.situationId}:${input.graphRevision}:${eventType}`,
    tripId: input.tripId,
    snapshotRevision: input.snapshotRevision,
    graphRevision: input.graphRevision,
    eventType,
    occurredAt: input.occurredAt,
    situation,
  };
}

function driverAlert(tripId: string, notification: NotificationRequest): DriverAlertV1 {
  return {
    schemaVersion: 1,
    alertId: `alert:${notification.notificationId}`,
    tripId,
    recipientMemberId: notification.recipientMemberId,
    issuedAt: notification.createdAt,
    expiresAt: notification.expiresAt,
    notification,
    requiresAcknowledgement: notification.severity !== "info",
  };
}

function snapshotFor(
  state: LiveTripState,
  input: ProjectedTelemetryInput,
  snapshotRevision: number,
  members: Readonly<Record<string, LiveMemberSnapshotV1>>,
): LiveSnapshotV1 {
  return {
    schemaVersion: 1,
    tripId: state.tripId,
    snapshotRevision,
    generatedAt: input.receivedAt,
    viewer: {
      memberId: input.telemetry.memberId,
      role: input.projection.role,
    },
    members: sortByMemberId(Object.values(members)),
    graph: state.graphState!.graph,
    situations: Object.values(state.situationsById),
    recommendations: Object.values(state.recommendationsById),
    notifications: Object.values(state.notificationsById).filter(
      (notification) => notification.recipientMemberId === input.telemetry.memberId,
    ),
  };
}

export function createEmptyLiveTripState(
  tripId: string,
  localeByMember: Readonly<Record<string, Locale>> = {},
): LiveTripState {
  return {
    tripId,
    telemetryState: createTelemetryState(),
    currentMembers: {},
    situationsById: {},
    recommendationsById: {},
    notificationsById: {},
    alertAcknowledgementsById: {},
    localeByMember,
    snapshotRevision: 0,
  };
}

export function acknowledgeDriverAlert(
  state: LiveTripState,
  acknowledgement: DriverAlertAcknowledgementV1,
): DriverAlertAcknowledgementResult {
  const existingAcknowledgements = state.alertAcknowledgementsById ?? {};
  if (existingAcknowledgements[acknowledgement.acknowledgementId]) {
    return { status: "duplicate", state, events: [] };
  }

  const notification = state.notificationsById[acknowledgement.notificationId];
  if (!notification || notification.recipientMemberId !== acknowledgement.memberId) {
    return { status: "unknown-alert", state, events: [] };
  }

  const graphRevision = state.graphState?.graph.graphRevision ?? notification.graphRevision;
  const nextState: LiveTripState = {
    ...state,
    alertAcknowledgementsById: {
      ...existingAcknowledgements,
      [acknowledgement.acknowledgementId]: acknowledgement,
    },
  };

  return {
    status: "acknowledged",
    state: nextState,
    events: [
      realtimeEvent("driverAlertAcknowledged", {
        tripId: acknowledgement.tripId,
        snapshotRevision: state.snapshotRevision,
        graphRevision,
        occurredAt: acknowledgement.acknowledgedAt,
        audience: { kind: "trip" },
        payload: acknowledgement,
        suffix: acknowledgement.acknowledgementId,
      }),
    ],
  };
}

export function publishRegroupCandidateSelection(
  state: LiveTripState,
  recommendation: RegroupRecommendationV1,
  occurredAt: string,
): RegroupCandidateSelectionResult {
  if (!recommendation.selectedCandidate) {
    return { status: "no-safe-candidate", state, events: [] };
  }
  if (state.recommendationsById[recommendation.recommendationId]) {
    return { status: "duplicate", state, events: [] };
  }

  const graphRevision = state.graphState?.graph.graphRevision ?? 0;
  const nextState: LiveTripState = {
    ...state,
    recommendationsById: {
      ...state.recommendationsById,
      [recommendation.recommendationId]: recommendation,
    },
  };

  return {
    status: "selected",
    state: nextState,
    events: [
      realtimeEvent("regroupCandidateSelected", {
        tripId: recommendation.tripId,
        snapshotRevision: state.snapshotRevision,
        graphRevision,
        occurredAt,
        audience: { kind: "leader" },
        payload: recommendation,
        suffix: recommendation.recommendationId,
        expiresAt: recommendation.expiresAt,
      }),
    ],
  };
}

export function processProjectedTelemetry(
  state: LiveTripState,
  input: ProjectedTelemetryInput,
): LiveTelemetryProcessingResult {
  const ingestion = acceptProjectedLocation(
    state.telemetryState,
    { telemetry: input.telemetry, projection: input.projection },
    input.receivedAt,
  );

  if (ingestion.status !== "accepted") {
    return {
      status: ingestion.status,
      state: { ...state, telemetryState: ingestion.state },
      events: [],
    };
  }
  if (!ingestion.node) {
    throw new Error("Accepted telemetry is missing its live vehicle node.");
  }

  const graphResult = calculateGraph(
    state.graphState,
    Object.values(ingestion.state.currentNodes),
    input.receivedAt,
    CONVOY_POLICY_V1,
  );
  const snapshotRevision = state.snapshotRevision + 1;
  const currentMembers = {
    ...state.currentMembers,
    [input.telemetry.memberId]: memberSnapshot(input.telemetry, input.projection, input.receivedAt, ingestion.node),
  };
  let activeSituation = state.activeSituation;
  let situationsById: Record<string, Situation> = { ...state.situationsById };
  let notificationsById: Record<string, NotificationRequest> = { ...state.notificationsById };
  const events: RealtimeEventV1[] = [
    realtimeEvent("liveSnapshotUpdated", {
      tripId: state.tripId,
      snapshotRevision,
      graphRevision: graphResult.graph.graphRevision,
      occurredAt: input.receivedAt,
      audience: { kind: "trip" },
      payload: {
        snapshotRevision,
        memberId: input.telemetry.memberId,
        overallState: graphResult.graph.overallState,
      },
    }),
  ];

  const situationTransition = reduceSplitSituation(activeSituation, graphResult.graph, [input.telemetry.eventId]);
  if (situationTransition.situation) {
    if (situationTransition.transition === "confirmed") {
      const confirmed = situationTransition.situation;
      situationsById[confirmed.situationId] = confirmed;
      activeSituation = markSituationNotified(confirmed, input.receivedAt).situation;
      situationsById[activeSituation.situationId] = activeSituation;
      events.push(
        realtimeEvent("convoySituationCreated", {
          tripId: state.tripId,
          snapshotRevision,
          graphRevision: graphResult.graph.graphRevision,
          occurredAt: input.receivedAt,
          audience: { kind: "trip" },
          payload: convoySituationEvent("convoySituationCreated", confirmed, {
            tripId: state.tripId,
            snapshotRevision,
            graphRevision: graphResult.graph.graphRevision,
            occurredAt: input.receivedAt,
          }),
          suffix: confirmed.situationId,
        }),
      );

      for (const notification of createSplitNotifications(confirmed, graphResult.graph, state.localeByMember)) {
        notificationsById[notification.notificationId] = notification;
        events.push(
          realtimeEvent("driverAlertIssued", {
            tripId: state.tripId,
            snapshotRevision,
            graphRevision: graphResult.graph.graphRevision,
            occurredAt: input.receivedAt,
            audience: { kind: "member", memberId: notification.recipientMemberId },
            payload: driverAlert(state.tripId, notification),
            suffix: notification.notificationId,
            expiresAt: notification.expiresAt,
          }),
        );
      }
    } else if (situationTransition.transition === "resolved") {
      activeSituation = situationTransition.situation;
      situationsById[activeSituation.situationId] = activeSituation;
      events.push(
        realtimeEvent("convoySituationUpdated", {
          tripId: state.tripId,
          snapshotRevision,
          graphRevision: graphResult.graph.graphRevision,
          occurredAt: input.receivedAt,
          audience: { kind: "trip" },
          payload: convoySituationEvent("convoySituationUpdated", activeSituation, {
            tripId: state.tripId,
            snapshotRevision,
            graphRevision: graphResult.graph.graphRevision,
            occurredAt: input.receivedAt,
          }),
          suffix: activeSituation.situationId,
        }),
      );
      for (const notification of createResolutionNotifications(activeSituation, graphResult.graph, state.localeByMember)) {
        notificationsById[notification.notificationId] = notification;
        events.push(
          realtimeEvent("driverAlertIssued", {
            tripId: state.tripId,
            snapshotRevision,
            graphRevision: graphResult.graph.graphRevision,
            occurredAt: input.receivedAt,
            audience: { kind: "member", memberId: notification.recipientMemberId },
            payload: driverAlert(state.tripId, notification),
            suffix: notification.notificationId,
            expiresAt: notification.expiresAt,
          }),
        );
      }
    } else if (situationTransition.transition === "updated") {
      activeSituation = situationTransition.situation;
      situationsById[activeSituation.situationId] = activeSituation;
      events.push(
        realtimeEvent("convoySituationUpdated", {
          tripId: state.tripId,
          snapshotRevision,
          graphRevision: graphResult.graph.graphRevision,
          occurredAt: input.receivedAt,
          audience: { kind: "trip" },
          payload: convoySituationEvent("convoySituationUpdated", activeSituation, {
            tripId: state.tripId,
            snapshotRevision,
            graphRevision: graphResult.graph.graphRevision,
            occurredAt: input.receivedAt,
          }),
          suffix: activeSituation.situationId,
        }),
      );
    }
  }

  const nextState: LiveTripState = {
    ...state,
    telemetryState: ingestion.state,
    graphState: graphResult.state,
    activeSituation,
    currentMembers,
    situationsById,
    notificationsById,
    snapshotRevision,
  };

  return {
    status: ingestion.status,
    state: nextState,
    events,
    snapshot: snapshotFor(nextState, input, snapshotRevision, currentMembers),
  };
}
