import { describe, expect, it } from 'vitest';
import { DynamicResolution } from './DynamicResolution';

const SLOW_MS = 25;
const STEADY_MS = 16.7;
const FAST_MS = 8;
const WINDOW_MS = 2000;
const RECOVERY_MS = 10000;

function play(controller: DynamicResolution, frameMs: number, durationMs: number): number[] {
  const changes: number[] = [];
  for (let elapsed = 0; elapsed < durationMs; elapsed += frameMs) {
    if (controller.record(frameMs)) changes.push(controller.pixelRatio);
  }
  return changes;
}

describe('DynamicResolution', () => {
  it('starts at the cap', () => {
    expect(new DynamicResolution(1.5).pixelRatio).toBe(1.5);
  });

  it('drops one step after two slow seconds', () => {
    const controller = new DynamicResolution(1.5);
    expect(play(controller, SLOW_MS, WINDOW_MS - SLOW_MS)).toEqual([]);
    expect(play(controller, SLOW_MS, SLOW_MS)).toEqual([1.25]);
  });

  it('keeps dropping while slow but never below the floor', () => {
    const controller = new DynamicResolution(1.5);
    expect(play(controller, SLOW_MS, WINDOW_MS * 6)).toEqual([1.25, 1, 0.75]);
    expect(controller.pixelRatio).toBe(0.75);
  });

  it('holds steady frames at the current ratio', () => {
    const controller = new DynamicResolution(1.25);
    play(controller, SLOW_MS, WINDOW_MS);
    expect(play(controller, STEADY_MS, RECOVERY_MS * 2)).toEqual([]);
    expect(controller.pixelRatio).toBe(1);
  });

  it('raises one step after ten fast seconds and stops at the cap', () => {
    const controller = new DynamicResolution(1.25);
    play(controller, SLOW_MS, WINDOW_MS * 2);
    expect(controller.pixelRatio).toBe(0.75);
    expect(play(controller, FAST_MS, RECOVERY_MS - WINDOW_MS)).toEqual([]);
    expect(play(controller, FAST_MS, WINDOW_MS)).toEqual([1]);
    expect(play(controller, FAST_MS, RECOVERY_MS * 3)).toEqual([1.25]);
  });

  it('restarts the recovery count after a window that is not fast', () => {
    const controller = new DynamicResolution(1);
    play(controller, SLOW_MS, WINDOW_MS);
    play(controller, FAST_MS, RECOVERY_MS - WINDOW_MS);
    play(controller, STEADY_MS, WINDOW_MS);
    expect(play(controller, FAST_MS, RECOVERY_MS - WINDOW_MS)).toEqual([]);
    expect(controller.pixelRatio).toBe(0.75);
  });

  it('never goes above a cap that is already below the floor', () => {
    const controller = new DynamicResolution(0.5);
    expect(play(controller, SLOW_MS, WINDOW_MS * 2)).toEqual([]);
    expect(play(controller, FAST_MS, RECOVERY_MS * 2)).toEqual([]);
    expect(controller.pixelRatio).toBe(0.5);
  });
});
