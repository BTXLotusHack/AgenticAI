import type { DemoAuditEntryV1, DemoAuditEventType, DemoSessionV1 } from './schema';

export type AuditEntryInput = {
  readonly eventType: DemoAuditEventType;
  readonly occurredAt: string;
  readonly frameIndex?: number;
  readonly graphRevision?: number;
  readonly candidateId?: string;
};

export function appendAuditEntry(session: DemoSessionV1, input: AuditEntryInput): DemoSessionV1 {
  const suffix = input.frameIndex ?? input.graphRevision ?? session.auditEntries.length;
  const entry: DemoAuditEntryV1 = {
    eventId: `${input.eventType}:${input.occurredAt}:${suffix}`,
    eventType: input.eventType,
    occurredAt: input.occurredAt,
    tripId: 'TRIP001',
    ...(input.frameIndex === undefined ? {} : { frameIndex: input.frameIndex }),
    ...(input.graphRevision === undefined ? {} : { graphRevision: input.graphRevision }),
    ...(input.candidateId === undefined ? {} : { candidateId: input.candidateId }),
  };
  return { ...session, auditEntries: [...session.auditEntries, entry] };
}
