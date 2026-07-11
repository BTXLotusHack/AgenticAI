import { createGoldenR001Replay, createReplayController } from '@loopin/demo-scenarios';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { DemoSessionV1 } from '../demo-session/schema';
import { writeDemoSession } from '../demo-session/storage';

export function useReplayController(session: DemoSessionV1) {
  const [controller] = useState(() =>
    createReplayController({ frames: createGoldenR001Replay(), initialFrameIndex: session.frameIndex }),
  );
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  useEffect(() => {
    writeDemoSession(window.sessionStorage, {
      ...session,
      frameIndex: snapshot.frameIndex,
      speed: snapshot.speed,
      isPlaying: false,
      approvedCandidateId: snapshot.approvedCandidateId ?? null,
    });
  }, [session, snapshot]);

  useEffect(() => () => controller.destroy(), [controller]);
  return { controller, snapshot };
}
