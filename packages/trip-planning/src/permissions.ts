import type { CollaboratorRole } from "./contracts.js";
import { TripPlanningError } from "./errors.js";

export type Identity = { readonly userId: string };

const ROLE_RANK: Readonly<Record<CollaboratorRole, number>> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export function collaboratorRole(
  collaborators: ReadonlyArray<{ readonly userId: string; readonly role: CollaboratorRole }>,
  userId: string,
): CollaboratorRole | undefined {
  return collaborators.find((collaborator) => collaborator.userId === userId)?.role;
}

export function assertMinimumRole(
  collaborators: ReadonlyArray<{ readonly userId: string; readonly role: CollaboratorRole }>,
  identity: Identity,
  minimum: CollaboratorRole,
): CollaboratorRole {
  const role = collaboratorRole(collaborators, identity.userId);
  if (!role) throw new TripPlanningError("forbidden", "Caller is not a trip collaborator.");
  if (ROLE_RANK[role] < ROLE_RANK[minimum]) {
    throw new TripPlanningError("forbidden", `Role ${role} cannot perform this action.`);
  }
  return role;
}

export function canViewTrip(
  collaborators: ReadonlyArray<{ readonly userId: string }>,
  identity: Identity,
): boolean {
  return collaborators.some((collaborator) => collaborator.userId === identity.userId);
}
