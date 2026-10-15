import { describe, expect, it } from 'vitest';
import {
  BOSS_SPAWN_RADIUS,
  CAMERA_FOV,
  CAMERA_POSITION,
  CAMERA_TARGET,
  CLEARING_RADIUS,
  NO_INSETS,
  REACH_DISTANCE,
  SPAWN_RADIUS,
  cameraFovFor,
  frameArena,
} from './arena';
import { ARENA, inView } from './environment/layout';
import { TERRAIN_EXTENT } from './environment/Terrain';

describe('arena', () => {
  it('orders the rings from the player outwards', () => {
    expect(REACH_DISTANCE).toBeLessThan(CLEARING_RADIUS);
    expect(CLEARING_RADIUS).toBeLessThan(SPAWN_RADIUS);
    expect(SPAWN_RADIUS).toBeLessThanOrEqual(BOSS_SPAWN_RADIUS);
    expect(BOSS_SPAWN_RADIUS).toBeLessThan(ARENA.walkable);
  });

  it('shares the clearing with the environment layout', () => {
    expect(ARENA.clearing).toBe(CLEARING_RADIUS);
  });

  it('places the camera above and in front of the arena', () => {
    expect(CAMERA_POSITION.y).toBeGreaterThan(CAMERA_TARGET.y);
    expect(CAMERA_POSITION.z).toBeGreaterThan(BOSS_SPAWN_RADIUS);
  });

  it('keeps the reach zone and the far spawn ring in view', () => {
    expect(inView(0, REACH_DISTANCE)).toBe(true);
    expect(inView(0, -SPAWN_RADIUS)).toBe(true);
  });

  it('extends the terrain behind the camera', () => {
    expect(TERRAIN_EXTENT.maxZ).toBeGreaterThan(CAMERA_POSITION.z);
  });
});

describe('cameraFovFor', () => {
  const horizontalFov = (aspect: number) => {
    const half = Math.tan((cameraFovFor(aspect) * Math.PI) / 360) * aspect;
    return (Math.atan(half) * 360) / Math.PI;
  };

  it('keeps the base field of view on wide screens', () => {
    expect(cameraFovFor(16 / 9)).toBe(CAMERA_FOV);
  });

  it('widens the view on narrow screens so the spawn arc stays in frame', () => {
    expect(cameraFovFor(390 / 844)).toBeGreaterThan(CAMERA_FOV);
    expect(horizontalFov(390 / 844)).toBeCloseTo(62);
    expect(horizontalFov(820 / 1180)).toBeCloseTo(62);
  });
});

describe('frameArena', () => {
  const PORTRAIT = { width: 390, height: 432 };
  const halfTan = (fov: number) => Math.tan((fov * Math.PI) / 360);

  it('matches the plain camera when nothing covers the stage', () => {
    const framing = frameArena({ ...PORTRAIT, ...NO_INSETS });
    expect(framing.fov).toBeCloseTo(cameraFovFor(390 / 432));
    expect(framing.fullHeight).toBe(432);
    expect(framing.offsetY).toBe(0);
  });

  it('centres the arena in the band below the HUD', () => {
    const framing = frameArena({ ...PORTRAIT, top: 44, bottom: 0, side: 0 });
    const band = 432 - 44;
    expect(framing.fullHeight).toBe(432 + 44);
    expect(framing.offsetY).toBe(0);
    const bandHalfTan = (halfTan(framing.fov) * band) / framing.fullHeight;
    expect(bandHalfTan).toBeCloseTo(halfTan(cameraFovFor(390 / band)));
  });

  it('widens the view to keep a gutter at the sides', () => {
    const plain = frameArena({ ...PORTRAIT, ...NO_INSETS });
    const framing = frameArena({ ...PORTRAIT, top: 0, bottom: 0, side: 16 });
    const fittedWidth = 390 - 2 * 16;
    expect(framing.fov).toBeGreaterThan(plain.fov);
    expect(halfTan(framing.fov)).toBeCloseTo(halfTan(cameraFovFor(fittedWidth / 432)));
  });

  it('extends the view above the stage when the bottom is covered', () => {
    const framing = frameArena({ ...PORTRAIT, top: 0, bottom: 100, side: 0 });
    expect(framing.fullHeight).toBe(432 + 100);
    expect(framing.offsetY).toBe(100);
  });

  it('keeps at least part of the stage for the arena when the covers are too large', () => {
    const framing = frameArena({ ...PORTRAIT, top: 300, bottom: 300, side: 0 });
    const band = 432 * 0.4;
    expect(framing.fullHeight).toBe(432);
    const bandHalfTan = (halfTan(framing.fov) * band) / framing.fullHeight;
    expect(bandHalfTan).toBeCloseTo(halfTan(cameraFovFor(390 / band)));
  });
});
