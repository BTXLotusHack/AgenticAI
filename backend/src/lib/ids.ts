import { randomUUID, randomBytes } from "node:crypto";

/** Domain identifiers. Kept in one place so formats stay consistent. */
export function newTeamId(): string {
  return randomUUID();
}

export function newInviteId(): string {
  return randomUUID();
}

/** Opaque, URL-safe invite token. Delivered out-of-band; never logged. */
export function newInviteToken(): string {
  return randomBytes(24).toString("base64url");
}
