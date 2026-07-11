import { z } from 'zod';

export const DemoAuditEventTypeSchema = z.enum([
  'DemoTripStarted',
  'ReplayPaused',
  'RegroupApproved',
  'DemoTripCompleted',
  'DemoSessionReset',
]);

export const DemoAuditEntryV1Schema = z
  .object({
    eventId: z.string().min(1),
    eventType: DemoAuditEventTypeSchema,
    occurredAt: z.iso.datetime(),
    tripId: z.literal('TRIP001'),
    frameIndex: z.number().int().nonnegative().optional(),
    graphRevision: z.number().int().positive().optional(),
    candidateId: z.string().min(1).optional(),
  })
  .strict();

export const DemoSessionV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    tripId: z.literal('TRIP001'),
    setupComplete: z.boolean(),
    frameIndex: z.number().int().nonnegative(),
    speed: z.union([z.literal(1), z.literal(2), z.literal(4)]),
    isPlaying: z.literal(false),
    consents: z
      .object({ M001: z.boolean(), M002: z.boolean(), M003: z.boolean(), M004: z.boolean() })
      .strict(),
    approvedCandidateId: z.string().min(1).nullable(),
    auditEntries: z.array(DemoAuditEntryV1Schema),
  })
  .strict();

export type DemoAuditEventType = z.infer<typeof DemoAuditEventTypeSchema>;
export type DemoAuditEntryV1 = z.infer<typeof DemoAuditEntryV1Schema>;
export type DemoSessionV1 = z.infer<typeof DemoSessionV1Schema>;

export function createInitialDemoSession(
  consents: DemoSessionV1['consents'] = { M001: true, M002: true, M003: true, M004: true },
): DemoSessionV1 {
  return {
    schemaVersion: 1,
    tripId: 'TRIP001',
    setupComplete: true,
    frameIndex: 0,
    speed: 1,
    isPlaying: false,
    consents: { ...consents },
    approvedCandidateId: null,
    auditEntries: [],
  };
}
