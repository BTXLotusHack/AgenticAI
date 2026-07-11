import type { GoldenReplayFrameV1, GoldenReplayPhase } from "./golden-r001-replay";

export type ReplaySpeed = 1 | 2 | 4;

export type ReplayScheduler = {
  schedule(callback: () => void, delayMs: number): unknown;
  cancel(handle: unknown): void;
  now(): string;
};

export type ReplayApproval = {
  readonly candidateId: string;
  readonly approvedAt: string;
  readonly graphRevision: number;
  readonly policyVersion: string;
};

export type ReplaySnapshot = {
  readonly frameIndex: number;
  readonly frame: GoldenReplayFrameV1;
  readonly phase: GoldenReplayPhase;
  readonly isPlaying: boolean;
  readonly speed: ReplaySpeed;
  readonly approvedCandidateId: string | undefined;
  readonly approval: ReplayApproval | undefined;
};

export type ReplayController = {
  getSnapshot(): ReplaySnapshot;
  subscribe(listener: () => void): () => void;
  play(): void;
  pause(): void;
  stepForward(): void;
  stepBackward(): void;
  seek(frameIndex: number): void;
  setSpeed(speed: ReplaySpeed): void;
  restart(): void;
  approveRegroup(candidateId: string): void;
  destroy(): void;
};

function browserScheduler(): ReplayScheduler {
  return {
    schedule: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
    cancel: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
    now: () => new Date().toISOString(),
  };
}

export function createReplayController(options: {
  readonly frames: readonly GoldenReplayFrameV1[];
  readonly scheduler?: ReplayScheduler;
  readonly initialFrameIndex?: number;
}): ReplayController {
  if (options.frames.length === 0) throw new Error("replay-frames-empty");
  const frames = options.frames;
  const scheduler = options.scheduler ?? browserScheduler();
  const listeners = new Set<() => void>();
  const splitIndex = frames.findIndex((frame) => frame.phase === "split");
  let destroyed = false;
  let timerHandle: unknown;
  let frameIndex = Math.max(0, Math.min(options.initialFrameIndex ?? 0, frames.length - 1));
  let isPlaying = false;
  let speed: ReplaySpeed = 1;
  let approvedCandidateId: string | undefined;
  let approval: ReplayApproval | undefined;
  let snapshot = makeSnapshot();

  function assertActive(): void {
    if (destroyed) throw new Error("replay-controller-destroyed");
  }

  function makeSnapshot(): ReplaySnapshot {
    const frame = frames[frameIndex]!;
    return { frameIndex, frame, phase: frame.phase, isPlaying, speed, approvedCandidateId, approval };
  }

  function publish(): void {
    snapshot = makeSnapshot();
    listeners.forEach((listener) => listener());
  }

  function cancelTimer(): void {
    if (timerHandle === undefined) return;
    scheduler.cancel(timerHandle);
    timerHandle = undefined;
  }

  function scheduleNext(): void {
    cancelTimer();
    if (!isPlaying) return;
    timerHandle = scheduler.schedule(onTick, 900 / speed);
  }

  function onTick(): void {
    timerHandle = undefined;
    if (!isPlaying) return;
    const nextIndex = frameIndex + 1;
    if (nextIndex >= frames.length) {
      isPlaying = false;
      publish();
      return;
    }
    frameIndex = nextIndex;
    if (frames[frameIndex]?.phase === "split" && !approvedCandidateId) isPlaying = false;
    if (frameIndex === frames.length - 1) isPlaying = false;
    publish();
    scheduleNext();
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      assertActive();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    play() {
      assertActive();
      if (frameIndex >= frames.length - 1 || (frames[frameIndex]?.phase === "split" && !approvedCandidateId)) return;
      if (isPlaying) return;
      isPlaying = true;
      publish();
      scheduleNext();
    },
    pause() {
      assertActive();
      if (!isPlaying && timerHandle === undefined) return;
      isPlaying = false;
      cancelTimer();
      publish();
    },
    stepForward() {
      assertActive();
      isPlaying = false;
      cancelTimer();
      if (frames[frameIndex]?.phase === "split" && !approvedCandidateId) return;
      if (frameIndex < frames.length - 1) frameIndex += 1;
      publish();
    },
    stepBackward() {
      assertActive();
      isPlaying = false;
      cancelTimer();
      if (frameIndex > 0) frameIndex -= 1;
      publish();
    },
    seek(targetFrameIndex) {
      assertActive();
      isPlaying = false;
      cancelTimer();
      const bounded = Math.max(0, Math.min(Math.trunc(targetFrameIndex), frames.length - 1));
      frameIndex = !approvedCandidateId && splitIndex >= 0 && bounded > splitIndex ? splitIndex : bounded;
      publish();
    },
    setSpeed(nextSpeed) {
      assertActive();
      if (![1, 2, 4].includes(nextSpeed)) throw new Error("unsupported-replay-speed");
      if (speed === nextSpeed) return;
      speed = nextSpeed;
      publish();
      scheduleNext();
    },
    restart() {
      assertActive();
      isPlaying = false;
      cancelTimer();
      frameIndex = 0;
      speed = 1;
      approvedCandidateId = undefined;
      approval = undefined;
      publish();
    },
    approveRegroup(candidateId) {
      assertActive();
      const frame = frames[frameIndex]!;
      if (frame.phase !== "split" || !frame.regroupRanking) throw new Error("regroup-not-available");
      const eligible = frame.regroupRanking.rankedCandidates.some((candidate) => candidate.poiId === candidateId);
      if (!eligible) throw new Error("candidate-not-eligible");
      const recoveryIndex = frames.findIndex((candidate, index) => index > frameIndex && candidate.phase === "recovering");
      if (recoveryIndex < 0) throw new Error("recovery-frame-missing");
      approvedCandidateId = candidateId;
      approval = {
        candidateId,
        approvedAt: scheduler.now(),
        graphRevision: frame.graph.graphRevision,
        policyVersion: frame.graph.policyVersion,
      };
      isPlaying = false;
      cancelTimer();
      frameIndex = recoveryIndex;
      publish();
    },
    destroy() {
      if (destroyed) return;
      isPlaying = false;
      cancelTimer();
      listeners.clear();
      destroyed = true;
    },
  };
}
