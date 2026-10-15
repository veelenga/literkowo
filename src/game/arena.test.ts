import { describe, expect, it } from 'vitest';
import {
  BOSS_SPAWN_RADIUS,
  CAMERA_FOV,
  CAMERA_POSITION,
  CAMERA_TARGET,
  CLEARING_RADIUS,
  REACH_DISTANCE,
  SPAWN_RADIUS,
  cameraFovFor,
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
