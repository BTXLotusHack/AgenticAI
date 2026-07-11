import { createGoldenR001Replay, createReplayController } from '@loopin/demo-scenarios';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { appendAuditEntry } from '../demo-session/audit';
import type { DemoSessionV1 } from '../demo-session/schema';
import { writeDemoSession } from '../demo-session/storage';

export function useReplayController(session: DemoSessionV1) {
  const [controller] = useState(() =>
    createReplayController({ frames: createGoldenR001Replay(), initialFrameIndex: session.frameIndex }),
  );
  const sessionRef = useRef(session);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  useEffect(() => {
    const nextSession = {
      ...sessionRef.current,
      frameIndex: snapshot.frameIndex,
      speed: snapshot.speed,
      isPlaying: false,
      approvedCandidateId: snapshot.approvedCandidateId ?? null,
    } as const;
    sessionRef.current = nextSession;
    writeDemoSession(window.sessionStorage, nextSession);
  }, [snapshot]);

  useEffect(() => () => controller.destroy(), [controller]);
  const approveRegroup = (candidateId: string) => {
    const before = controller.getSnapshot();
    controller.approveRegroup(candidateId);
    const after = controller.getSnapshot();
    const nextSession = appendAuditEntry(
      { ...sessionRef.current, frameIndex: after.frameIndex, approvedCandidateId: candidateId },
      {
        eventType: 'RegroupApproved',
        occurredAt: after.approval?.approvedAt ?? new Date().toISOString(),
        frameIndex: after.frameIndex,
        graphRevision: before.frame.graph.graphRevision,
        candidateId,
      },
    );
    sessionRef.current = nextSession;
    writeDemoSession(window.sessionStorage, nextSession);
  };
  const completeTrip = useCallback(() => {
    if (sessionRef.current.auditEntries.some((entry) => entry.eventType === 'DemoTripCompleted')) return;
    const current = controller.getSnapshot();
    const nextSession = appendAuditEntry(
      { ...sessionRef.current, frameIndex: current.frameIndex },
      { eventType: 'DemoTripCompleted', occurredAt: current.frame.occurredAt, frameIndex: current.frameIndex, graphRevision: current.frame.graph.graphRevision },
    );
    sessionRef.current = nextSession;
    writeDemoSession(window.sessionStorage, nextSession);
  }, [controller]);
  return { approveRegroup, completeTrip, controller, snapshot };
}
