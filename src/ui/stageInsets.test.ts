import { describe, expect, it } from 'vitest';
import { arenaInsets } from './stageInsets';

const PORTRAIT = { stageTop: 0, stageHeight: 476, visibleHeight: Number.POSITIVE_INFINITY };

describe('arenaInsets', () => {
  it('keeps the arena below the HUD with a gutter at the sides', () => {
    expect(arenaInsets({ ...PORTRAIT, hudBottom: 44 })).toEqual({ top: 44, bottom: 0, side: 16 });
  });

  it('measures the HUD from the top of the stage', () => {
    expect(arenaInsets({ ...PORTRAIT, stageTop: 20, hudBottom: 44 })).toEqual({
      top: 24,
      bottom: 0,
      side: 16,
    });
  });

  it('covers the part of the stage under the native keyboard', () => {
    expect(arenaInsets({ ...PORTRAIT, hudBottom: 44, visibleHeight: 390 })).toEqual({
      top: 44,
      bottom: 86,
      side: 16,
    });
  });

  it('never reaches outside the stage', () => {
    expect(arenaInsets({ ...PORTRAIT, hudBottom: -10, visibleHeight: 900 })).toEqual({
      top: 0,
      bottom: 0,
      side: 16,
    });
    expect(arenaInsets({ ...PORTRAIT, hudBottom: 600, visibleHeight: -50 })).toEqual({
      top: 476,
      bottom: 476,
      side: 16,
    });
  });
});
