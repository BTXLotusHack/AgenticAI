import { describe, expect, it, vi } from "vitest";

import { createGoldenR001Replay, createReplayController, type ReplayScheduler } from "../src/index";

class ManualScheduler implements ReplayScheduler {
  readonly tasks = new Map<number, () => void>();
  readonly delays: number[] = [];
  readonly cancelled: number[] = [];
  #nextHandle = 1;

  schedule(callback: () => void, delayMs: number): number {
    const handle = this.#nextHandle++;
    this.tasks.set(handle, callback);
    this.delays.push(delayMs);
    return handle;
  }

  cancel(handle: unknown): void {
    const numericHandle = Number(handle);
    this.tasks.delete(numericHandle);
    this.cancelled.push(numericHandle);
  }

  now(): string {
    return "2026-07-20T00:00:36.000Z";
  }

  flushNext(): void {
    const entry = this.tasks.entries().next().value as [number, () => void] | undefined;
    if (!entry) throw new Error("no-scheduled-task");
    this.tasks.delete(entry[0]);
    entry[1]();
  }
}

describe("createReplayController", () => {
  it("starts paused and supports deterministic stepping and restart", () => {
    const controller = createReplayController({ frames: createGoldenR001Replay(), scheduler: new ManualScheduler() });

    expect(controller.getSnapshot()).toMatchObject({ frameIndex: 0, isPlaying: false, speed: 1, phase: "together" });
    controller.stepForward();
    expect(controller.getSnapshot()).toMatchObject({ frameIndex: 1, phase: "degraded" });
    controller.stepBackward();
    expect(controller.getSnapshot().frameIndex).toBe(0);
    controller.seek(4);
    expect(controller.getSnapshot().frameIndex).toBe(4);
    controller.restart();
    expect(controller.getSnapshot()).toMatchObject({ frameIndex: 0, isPlaying: false, approvedCandidateId: undefined });
  });

  it("plays with exact supported speeds and pauses cleanly", () => {
    const scheduler = new ManualScheduler();
    const controller = createReplayController({ frames: createGoldenR001Replay(), scheduler });
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.play();
    expect(controller.getSnapshot().isPlaying).toBe(true);
    expect(scheduler.delays.at(-1)).toBe(900);
    scheduler.flushNext();
    expect(controller.getSnapshot().frameIndex).toBe(1);
    controller.setSpeed(2);
    expect(scheduler.delays.at(-1)).toBe(450);
    controller.setSpeed(4);
    expect(scheduler.delays.at(-1)).toBe(225);
    controller.pause();
    expect(controller.getSnapshot().isPlaying).toBe(false);
    expect(scheduler.tasks.size).toBe(0);
    expect(listener).toHaveBeenCalled();
    expect(() => controller.setSpeed(3 as 1)).toThrow("unsupported-replay-speed");
  });

  it("automatically pauses when playback reaches the confirmed split", () => {
    const scheduler = new ManualScheduler();
    const frames = createGoldenR001Replay();
    const splitIndex = frames.findIndex((frame) => frame.phase === "split");
    const controller = createReplayController({ frames, scheduler, initialFrameIndex: splitIndex - 1 });

    controller.play();
    scheduler.flushNext();

    expect(controller.getSnapshot()).toMatchObject({ frameIndex: splitIndex, phase: "split", isPlaying: false });
    expect(scheduler.tasks.size).toBe(0);
    controller.stepForward();
    expect(controller.getSnapshot().frameIndex).toBe(splitIndex);
    controller.seek(frames.length - 1);
    expect(controller.getSnapshot().frameIndex).toBe(splitIndex);
  });

  it("approves only an eligible candidate at the confirmed split", () => {
    const frames = createGoldenR001Replay();
    const splitIndex = frames.findIndex((frame) => frame.phase === "split");
    const recoveryIndex = frames.findIndex((frame) => frame.phase === "recovering");
    const controller = createReplayController({ frames, scheduler: new ManualScheduler() });

    expect(() => controller.approveRegroup("POI001")).toThrow("regroup-not-available");
    controller.seek(splitIndex);
    expect(() => controller.approveRegroup("POI002")).toThrow("candidate-not-eligible");
    expect(() => controller.approveRegroup("POI999")).toThrow("candidate-not-eligible");

    controller.approveRegroup("POI001");

    expect(controller.getSnapshot()).toMatchObject({
      frameIndex: recoveryIndex,
      phase: "recovering",
      approvedCandidateId: "POI001",
      approval: {
        candidateId: "POI001",
        approvedAt: "2026-07-20T00:00:36.000Z",
        graphRevision: frames[splitIndex]?.graph.graphRevision,
        policyVersion: "convoy-v1",
      },
    });
  });

  it("bounds completion, unsubscribes listeners, and destroys pending work", () => {
    const scheduler = new ManualScheduler();
    const frames = createGoldenR001Replay();
    const controller = createReplayController({ frames, scheduler, initialFrameIndex: frames.length - 1 });
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    controller.stepForward();
    expect(controller.getSnapshot()).toMatchObject({ frameIndex: frames.length - 1, isPlaying: false });
    listener.mockClear();
    unsubscribe();
    controller.restart();
    expect(listener).not.toHaveBeenCalled();
    controller.play();
    expect(scheduler.tasks.size).toBe(1);
    controller.destroy();
    expect(scheduler.tasks.size).toBe(0);
    expect(() => controller.play()).toThrow("replay-controller-destroyed");
  });
});
