import { randomBytes } from "node:crypto";

import {
  JoinTripRequestV1Schema,
  JoinTripResultV1Schema,
  type JoinTripResultV1,
} from "@loopin/contracts";
import {
  AddItineraryStopRequestV1Schema,
  CreateTripRequestV1Schema,
  RecommendPlacesRequestV1Schema,
  TripCollaboratorV1Schema,
  TripPreferencesV1Schema,
  TripBudgetV1Schema,
  assertEditable,
  assertMinimumRole,
  buildRouteRequest,
  canViewTrip,
  createPlannedTrip,
  findDuplicateStopAcrossItinerary,
  insertStop,
  lifecycleTimestampField,
  rankPlaceRecommendations,
  removeStop,
  reorderStop,
  replaceDay,
  sortItineraryDays,
  transitionLifecycle,
  validateItineraryDates,
  validatePlaceReference,
  withUpdatedEstimates,
  type AddItineraryStopRequestV1,
  type CreateTripRequestV1,
  type Identity,
  type ItineraryDayV1,
  type PlannedTripV1,
  type RecommendPlacesRequestV1,
  type RouteRequestV1,
  type TripBudgetV1,
  type TripCollaboratorV1,
  type TripEstimatesV1,
  TripPlanningError as ErrorClass,
  type TripLifecycle,
  type TripPreferencesV1,
  type TripRecommendationV1,
} from "@loopin/trip-planning";

export { TripPlanningError } from "@loopin/trip-planning";
export type { Identity, PlannedTripV1, RouteRequestV1, TripEstimatesV1, TripRecommendationV1 };

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

export type TripWriteCondition = {
  readonly command?: {
    readonly idempotencyKey: string;
    readonly fingerprint: string;
    readonly expiresAt: string;
  };
};

export interface TripPlanningRepository {
  get(tripId: string): Promise<PlannedTripV1 | undefined>;
  list(): Promise<readonly PlannedTripV1[]>;
  findByJoinCode(joinCode: string): Promise<PlannedTripV1 | undefined>;
  putIfVersion(state: PlannedTripV1, expectedVersion: number, condition?: TripWriteCondition): Promise<boolean>;
}

export class MemoryTripPlanningRepository implements TripPlanningRepository {
  private readonly states = new Map<string, PlannedTripV1>();
  private readonly commandReservations = new Map<string, { fingerprint: string; expiresAt: string }>();

  constructor(initial: readonly PlannedTripV1[] = []) {
    initial.forEach((state) => this.states.set(state.tripId, structuredClone(state)));
  }

  async get(tripId: string): Promise<PlannedTripV1 | undefined> {
    const state = this.states.get(tripId);
    return state ? structuredClone(state) : undefined;
  }

  async list(): Promise<readonly PlannedTripV1[]> {
    return [...this.states.values()].map((state) => structuredClone(state));
  }

  async findByJoinCode(joinCode: string): Promise<PlannedTripV1 | undefined> {
    const state = [...this.states.values()].find((trip) => trip.joinCode === joinCode);
    return state ? structuredClone(state) : undefined;
  }

  async putIfVersion(state: PlannedTripV1, expectedVersion: number, condition?: TripWriteCondition): Promise<boolean> {
    if (condition?.command) {
      const commandWindowMs = 24 * 60 * 60 * 1_000;
      const commandNow = Date.parse(condition.command.expiresAt) - commandWindowMs;
      for (const [key, reservation] of this.commandReservations) {
        if (Date.parse(reservation.expiresAt) <= commandNow) this.commandReservations.delete(key);
      }
      const reservation = this.commandReservations.get(condition.command.idempotencyKey);
      if (reservation?.fingerprint === condition.command.fingerprint) return true;
      if (reservation) return false;
    }
    const existing = this.states.get(state.tripId);
    if (existing) {
      if (state.version !== expectedVersion + 1 || existing.version !== expectedVersion) return false;
    } else if (expectedVersion !== 0 || state.version !== 1) {
      return false;
    }
    this.states.set(state.tripId, structuredClone(state));
    if (condition?.command) {
      this.commandReservations.set(condition.command.idempotencyKey, {
        fingerprint: condition.command.fingerprint,
        expiresAt: condition.command.expiresAt,
      });
    }
    return true;
  }
}

type ApplicationDependencies = {
  readonly repository: TripPlanningRepository;
  readonly clock: Clock;
};

function commandFingerprint(parts: readonly string[]): string {
  return parts.join(":");
}

function commandExpiry(now: string): string {
  return new Date(Date.parse(now) + 24 * 60 * 60 * 1_000).toISOString();
}

const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateJoinCode(): string {
  const bytes = randomBytes(16);
  return [...bytes].map((byte) => JOIN_CODE_ALPHABET[byte % JOIN_CODE_ALPHABET.length]).join("");
}

function encodeOfflineRouteSummary(route: RouteRequestV1): string {
  return route.locations.map((location) => `${location.lon.toFixed(5)},${location.lat.toFixed(5)}`).join(";");
}

async function persistTrip(
  repository: TripPlanningRepository,
  current: PlannedTripV1,
  next: PlannedTripV1,
  condition?: TripWriteCondition,
): Promise<PlannedTripV1> {
  const saved = await repository.putIfVersion(next, current.version, condition);
  if (!saved) throw new ErrorClass("conflict", "Concurrent trip update detected.");
  return (await repository.get(current.tripId)) ?? next;
}

function requireTrip(state: PlannedTripV1 | undefined, tripId: string): PlannedTripV1 {
  if (!state) throw new ErrorClass("not-found", `Trip ${tripId} was not found.`);
  return state;
}

function requireViewer(state: PlannedTripV1, identity: Identity): void {
  if (!canViewTrip(state.collaborators, identity)) {
    throw new ErrorClass("forbidden", "Caller is not a trip collaborator.");
  }
}

function bumpTrip(state: PlannedTripV1, now: string): PlannedTripV1 {
  return withUpdatedEstimates({ ...state, version: state.version + 1, updatedAt: now });
}

export class LoopinTripsApplication {
  constructor(private readonly deps: ApplicationDependencies) {}

  async listTrips(identity: Identity): Promise<PlannedTripV1[]> {
    return (await this.deps.repository.list()).filter((trip) => canViewTrip(trip.collaborators, identity));
  }

  async createTrip(identity: Identity, request: CreateTripRequestV1): Promise<PlannedTripV1> {
    CreateTripRequestV1Schema.parse(request);
    if (identity.userId !== request.ownerUserId) {
      throw new ErrorClass("forbidden", "Trip owner must match the authenticated caller.");
    }
    const existing = await this.deps.repository.get(request.tripId);
    if (existing) throw new ErrorClass("conflict", `Trip ${request.tripId} already exists.`);
    const now = this.deps.clock.now();
    const trip = createPlannedTrip(request, now);
    const saved = await this.deps.repository.putIfVersion(trip, 0);
    if (!saved) throw new ErrorClass("conflict", "Concurrent trip creation detected.");
    return trip;
  }

  async getTrip(identity: Identity, tripId: string): Promise<PlannedTripV1> {
    const trip = requireTrip(await this.deps.repository.get(tripId), tripId);
    requireViewer(trip, identity);
    return trip;
  }

  async updatePreferences(
    identity: Identity,
    tripId: string,
    preferences: TripPreferencesV1,
  ): Promise<PlannedTripV1> {
    TripPreferencesV1Schema.parse(preferences);
    const current = requireTrip(await this.deps.repository.get(tripId), tripId);
    assertMinimumRole(current.collaborators, identity, "editor");
    assertEditable(current.lifecycle);
    const now = this.deps.clock.now();
    return persistTrip(
      this.deps.repository,
      current,
      bumpTrip({ ...current, preferences }, now),
    );
  }

  async updateBudget(identity: Identity, tripId: string, budget: TripBudgetV1): Promise<PlannedTripV1> {
    TripBudgetV1Schema.parse(budget);
    const current = requireTrip(await this.deps.repository.get(tripId), tripId);
    assertMinimumRole(current.collaborators, identity, "editor");
    assertEditable(current.lifecycle);
    const now = this.deps.clock.now();
    return persistTrip(this.deps.repository, current, bumpTrip({ ...current, budget }, now));
  }

  async addCollaborator(
    identity: Identity,
    tripId: string,
    collaborator: TripCollaboratorV1,
  ): Promise<PlannedTripV1> {
    TripCollaboratorV1Schema.parse(collaborator);
    const current = requireTrip(await this.deps.repository.get(tripId), tripId);
    assertMinimumRole(current.collaborators, identity, "owner");
    if (current.collaborators.some((existing) => existing.userId === collaborator.userId)) {
      throw new ErrorClass("conflict", `Collaborator ${collaborator.userId} is already on the trip.`);
    }
    const now = this.deps.clock.now();
    return persistTrip(
      this.deps.repository,
      current,
      bumpTrip({ ...current, collaborators: [...current.collaborators, collaborator] }, now),
    );
  }

  async addItineraryDay(
    identity: Identity,
    tripId: string,
    day: ItineraryDayV1,
  ): Promise<PlannedTripV1> {
    const current = requireTrip(await this.deps.repository.get(tripId), tripId);
    assertMinimumRole(current.collaborators, identity, "editor");
    assertEditable(current.lifecycle);
    if (current.itinerary.days.some((existing) => existing.dayId === day.dayId)) {
      throw new ErrorClass("conflict", `Day ${day.dayId} already exists.`);
    }
    const itinerary = {
      ...current.itinerary,
      days: sortItineraryDays([...current.itinerary.days, day]),
    };
    validateItineraryDates(itinerary);
    const now = this.deps.clock.now();
    return persistTrip(this.deps.repository, current, bumpTrip({ ...current, itinerary }, now));
  }

  async addItineraryStop(
    identity: Identity,
    tripId: string,
    request: AddItineraryStopRequestV1,
  ): Promise<PlannedTripV1> {
    AddItineraryStopRequestV1Schema.parse(request);
    validatePlaceReference(request.place);
    const current = requireTrip(await this.deps.repository.get(tripId), tripId);
    assertMinimumRole(current.collaborators, identity, "editor");
    assertEditable(current.lifecycle);
    const day = current.itinerary.days.find((candidate) => candidate.dayId === request.dayId);
    if (!day) throw new ErrorClass("not-found", `Day ${request.dayId} was not found.`);

    const duplicate = findDuplicateStopAcrossItinerary(current.itinerary, request.place.id);
    if (duplicate) {
      throw new ErrorClass("duplicate-stop", `Stop ${request.place.id} is already on the itinerary.`);
    }

    const stop = {
      schemaVersion: 1 as const,
      stopId: request.stopId,
      tascoPlaceId: request.place.id,
      place: request.place,
      sequence: request.sequence ?? day.stops.length + 1,
      dwellMinutes: request.dwellMinutes ?? 30,
      ...(request.notes ? { notes: request.notes } : {}),
    };
    const updatedDay = insertStop(day, stop, request.sequence);
    const itinerary = replaceDay(current.itinerary, updatedDay);
    validateItineraryDates(itinerary);
    const now = this.deps.clock.now();
    return persistTrip(this.deps.repository, current, bumpTrip({ ...current, itinerary }, now));
  }

  async reorderItineraryStop(
    identity: Identity,
    tripId: string,
    dayId: string,
    stopId: string,
    sequence: number,
  ): Promise<PlannedTripV1> {
    const current = requireTrip(await this.deps.repository.get(tripId), tripId);
    assertMinimumRole(current.collaborators, identity, "editor");
    assertEditable(current.lifecycle);
    const day = current.itinerary.days.find((candidate) => candidate.dayId === dayId);
    if (!day) throw new ErrorClass("not-found", `Day ${dayId} was not found.`);
    const itinerary = replaceDay(current.itinerary, reorderStop(day, stopId, sequence));
    validateItineraryDates(itinerary);
    const now = this.deps.clock.now();
    return persistTrip(this.deps.repository, current, bumpTrip({ ...current, itinerary }, now));
  }

  async removeItineraryStop(
    identity: Identity,
    tripId: string,
    dayId: string,
    stopId: string,
  ): Promise<PlannedTripV1> {
    const current = requireTrip(await this.deps.repository.get(tripId), tripId);
    assertMinimumRole(current.collaborators, identity, "editor");
    assertEditable(current.lifecycle);
    const day = current.itinerary.days.find((candidate) => candidate.dayId === dayId);
    if (!day) throw new ErrorClass("not-found", `Day ${dayId} was not found.`);
    const itinerary = replaceDay(current.itinerary, removeStop(day, stopId));
    validateItineraryDates(itinerary);
    const now = this.deps.clock.now();
    return persistTrip(this.deps.repository, current, bumpTrip({ ...current, itinerary }, now));
  }

  async publishTrip(
    identity: Identity,
    tripId: string,
    input: { readonly idempotencyKey: string },
  ): Promise<PlannedTripV1> {
    const current = requireTrip(await this.deps.repository.get(tripId), tripId);
    assertMinimumRole(current.collaborators, identity, "owner");
    const now = this.deps.clock.now();
    const lifecycle = transitionLifecycle(current.lifecycle, "published");
    const fingerprint = commandFingerprint(["publish", tripId, lifecycle]);
    const next = bumpTrip({
      ...current,
      lifecycle,
      joinCode: current.joinCode ?? generateJoinCode(),
      publishedAt: now,
    }, now);
    return persistTrip(this.deps.repository, current, next, {
      command: {
        idempotencyKey: input.idempotencyKey,
        fingerprint,
        expiresAt: commandExpiry(now),
      },
    });
  }

  async activateTrip(
    identity: Identity,
    tripId: string,
    input: { readonly idempotencyKey: string },
  ): Promise<PlannedTripV1> {
    const current = requireTrip(await this.deps.repository.get(tripId), tripId);
    assertMinimumRole(current.collaborators, identity, "owner");
    const now = this.deps.clock.now();
    const lifecycle = transitionLifecycle(current.lifecycle, "active");
    const fingerprint = commandFingerprint(["activate", tripId, lifecycle]);
    const next = bumpTrip({ ...current, lifecycle, activatedAt: now }, now);
    return persistTrip(this.deps.repository, current, next, {
      command: {
        idempotencyKey: input.idempotencyKey,
        fingerprint,
        expiresAt: commandExpiry(now),
      },
    });
  }

  async completeTrip(
    identity: Identity,
    tripId: string,
    input: { readonly idempotencyKey: string },
  ): Promise<PlannedTripV1> {
    const current = requireTrip(await this.deps.repository.get(tripId), tripId);
    assertMinimumRole(current.collaborators, identity, "owner");
    const now = this.deps.clock.now();
    const lifecycle = transitionLifecycle(current.lifecycle, "completed");
    const fingerprint = commandFingerprint(["complete", tripId, lifecycle]);
    const next = bumpTrip({ ...current, lifecycle, completedAt: now }, now);
    return persistTrip(this.deps.repository, current, next, {
      command: {
        idempotencyKey: input.idempotencyKey,
        fingerprint,
        expiresAt: commandExpiry(now),
      },
    });
  }

  async createInvite(
    identity: Identity,
    tripId: string,
    input: { readonly idempotencyKey: string },
  ): Promise<{ readonly trip: PlannedTripV1; readonly joinCode: string }> {
    const current = requireTrip(await this.deps.repository.get(tripId), tripId);
    assertMinimumRole(current.collaborators, identity, "owner");
    const now = this.deps.clock.now();
    const joinCode = current.joinCode ?? generateJoinCode();
    const fingerprint = commandFingerprint(["invite", tripId, joinCode]);
    const next = bumpTrip({ ...current, joinCode }, now);
    const trip = await persistTrip(this.deps.repository, current, next, {
      command: {
        idempotencyKey: input.idempotencyKey,
        fingerprint,
        expiresAt: commandExpiry(now),
      },
    });
    return { trip, joinCode: trip.joinCode ?? joinCode };
  }

  async joinTrip(identity: Identity, rawRequest: unknown): Promise<JoinTripResultV1> {
    const request = JoinTripRequestV1Schema.parse(rawRequest);
    const current = requireTrip(await this.deps.repository.findByJoinCode(request.joinCode), request.joinCode);
    const existing = current.collaborators.find((collaborator) => collaborator.userId === identity.userId);
    const now = this.deps.clock.now();
    let trip = current;
    if (!existing) {
      trip = await persistTrip(
        this.deps.repository,
        current,
        bumpTrip({
          ...current,
          collaborators: [
            ...current.collaborators,
            {
              schemaVersion: 1,
              userId: identity.userId,
              displayName: request.displayName,
              role: "viewer",
              joinedAt: now,
            },
          ],
        }, now),
      );
    }
    const route = buildRouteRequest(trip);
    return JoinTripResultV1Schema.parse({
      schemaVersion: 1,
      tripId: trip.tripId,
      memberId: identity.userId,
      role: "member",
      consentRequirements: ["location-while-driving", "driver-alerts"],
      routeOfflineSummary: {
        routeId: `route:${trip.tripId}:current`,
        distanceMeters: trip.estimates?.estimatedDistanceMeters ?? 0,
        durationSeconds: trip.estimates ? trip.estimates.estimatedTravelMinutes * 60 : 0,
        encodedGeometry: encodeOfflineRouteSummary(route),
        sourceVersion: "tasco-trip-planning-v1",
      },
    });
  }

  async getRouteRequest(identity: Identity, tripId: string): Promise<RouteRequestV1> {
    const trip = await this.getTrip(identity, tripId);
    return buildRouteRequest(trip);
  }

  async recommendPlaces(
    identity: Identity,
    tripId: string,
    request: RecommendPlacesRequestV1,
  ): Promise<TripRecommendationV1[]> {
    RecommendPlacesRequestV1Schema.parse(request);
    const trip = await this.getTrip(identity, tripId);
    assertMinimumRole(trip.collaborators, identity, "viewer");
    return rankPlaceRecommendations({
      tripId,
      preferences: trip.preferences,
      candidates: request.candidates,
      ...(request.anchorCoordinates ? { anchorCoordinates: request.anchorCoordinates } : {}),
    });
  }

  async getEstimates(identity: Identity, tripId: string): Promise<TripEstimatesV1> {
    const trip = await this.getTrip(identity, tripId);
    return trip.estimates ?? withUpdatedEstimates(trip).estimates!;
  }
}

export type LifecycleCommandResult = {
  readonly trip: PlannedTripV1;
  readonly lifecycle: TripLifecycle;
};

export function applyLifecycleTimestamp(
  trip: PlannedTripV1,
  lifecycle: TripLifecycle,
  now: string,
): PlannedTripV1 {
  const field = lifecycleTimestampField(lifecycle);
  if (!field) return trip;
  return { ...trip, [field]: now };
}

export type TripsHttpRequest = {
  readonly method: string;
  readonly path: string;
  readonly identity: Identity;
  readonly body?: unknown;
};

export type TripsHttpResponse = {
  readonly status: number;
  readonly body: Record<string, unknown>;
};

function parsePath(path: string): string[] {
  return path.replace(/^\/+|\/+$/g, "").split("/");
}

function errorResponse(error: unknown): TripsHttpResponse {
  if (error instanceof ErrorClass) {
    const status = error.code === "not-found" ? 404 : error.code === "forbidden" ? 403 : error.code === "conflict" ? 409 : 400;
    return { status, body: { error: { code: error.code, message: error.message } } };
  }
  return { status: 400, body: { error: { code: "invalid-request", message: "Invalid trip service request." } } };
}

export function createTripsHttpHandler(app: LoopinTripsApplication) {
  return async function handleTripsHttpRequest(request: TripsHttpRequest): Promise<TripsHttpResponse> {
    try {
      const method = request.method.toUpperCase();
      const parts = parsePath(request.path);
      if (parts[0] !== "v1" || parts[1] !== "trips") {
        return { status: 404, body: { error: { code: "not-found", message: "Route not found." } } };
      }

      if (method === "GET" && parts.length === 2) {
        return { status: 200, body: { schemaVersion: 1, items: await app.listTrips(request.identity) } };
      }
      if (method === "POST" && parts.length === 2) {
        return { status: 201, body: { schemaVersion: 1, trip: await app.createTrip(request.identity, request.body as CreateTripRequestV1) } };
      }
      if (method === "POST" && parts.length === 3 && parts[2] === "join") {
        return { status: 200, body: { schemaVersion: 1, result: await app.joinTrip(request.identity, request.body) } };
      }

      const tripId = parts[2];
      if (!tripId) return { status: 404, body: { error: { code: "not-found", message: "Route not found." } } };

      if (method === "GET" && parts.length === 3) {
        return { status: 200, body: { schemaVersion: 1, trip: await app.getTrip(request.identity, tripId) } };
      }
      if (method === "PATCH" && parts.length === 3) {
        const body = request.body as { preferences?: TripPreferencesV1; budget?: TripBudgetV1 };
        if (body.preferences) {
          return { status: 200, body: { schemaVersion: 1, trip: await app.updatePreferences(request.identity, tripId, body.preferences) } };
        }
        if (body.budget) {
          return { status: 200, body: { schemaVersion: 1, trip: await app.updateBudget(request.identity, tripId, body.budget) } };
        }
        return { status: 400, body: { error: { code: "invalid-request", message: "PATCH requires preferences or budget." } } };
      }
      if (method === "POST" && parts.length === 4 && parts[3] === "stops") {
        return { status: 201, body: { schemaVersion: 1, trip: await app.addItineraryStop(request.identity, tripId, request.body as AddItineraryStopRequestV1) } };
      }
      if (method === "POST" && parts.length === 4 && parts[3] === "invites") {
        return { status: 201, body: { schemaVersion: 1, ...(await app.createInvite(request.identity, tripId, request.body as { idempotencyKey: string })) } };
      }
      if (method === "POST" && parts.length === 5 && parts[3] === "routes" && parts[4] === "refresh") {
        return { status: 200, body: { schemaVersion: 1, route: await app.getRouteRequest(request.identity, tripId) } };
      }
      if (parts.length === 5 && parts[3] === "stops") {
        const stopId = parts[4]!;
        const body = request.body as { dayId?: string; sequence?: number };
        if (method === "PATCH" && body.dayId && body.sequence !== undefined) {
          return { status: 200, body: { schemaVersion: 1, trip: await app.reorderItineraryStop(request.identity, tripId, body.dayId, stopId, body.sequence) } };
        }
        if (method === "DELETE" && body.dayId) {
          return { status: 200, body: { schemaVersion: 1, trip: await app.removeItineraryStop(request.identity, tripId, body.dayId, stopId) } };
        }
      }
      return { status: 404, body: { error: { code: "not-found", message: "Route not found." } } };
    } catch (error) {
      return errorResponse(error);
    }
  };
}
