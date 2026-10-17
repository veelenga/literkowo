// @vitest-environment jsdom
import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trackDisposal } from '../../testing/disposal';
import { groundPlaneGeometry, shockwaveTexture } from './glowAssets';
import { luminanceOf } from './luminance';
import {
  GROUND_RING_LIFT,
  groundRing,
  PulsePool,
  type PulseSettings,
  type PulseVisual,
} from './PulsePool';

const RING: PulseSettings = {
  poolSize: 2,
  duration: 1,
  startScale: 1,
  endScale: 9,
  opacity: 0.8,
  groundLift: GROUND_RING_LIFT,
};
const TINTED: PulseSettings = {
  poolSize: 1,
  duration: 1,
  startScale: 1,
  endScale: 2,
  tint: { luminance: 1.3, whiteBlend: 0.2 },
};
const EMBER = new THREE.Color(0xff6a2a);
const SPOT = new THREE.Vector3(2, 1, -3);
const PRECISION = 6;

function ringPool(settings: PulseSettings) {
  const rings: PulseVisual[] = [];
  const pool = new PulsePool(settings, () => {
    const ring = groundRing();
    rings.push(ring);
    return ring;
  });
  return { pool, rings };
}

describe('PulsePool', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  it('grows with a cubic ease out and fades out over its duration', () => {
    const { pool, rings } = ringPool(RING);
    const [ring] = rings;
    pool.play(SPOT, EMBER);
    expect(ring.object.scale.x).toBe(1);
    expect(ring.material.opacity).toBeCloseTo(0.8, PRECISION);
    pool.update(0.5);
    expect(ring.object.scale.x).toBeCloseTo(8, PRECISION);
    expect(ring.material.opacity).toBeCloseTo(0.2, PRECISION);
    pool.update(0.5);
    expect(ring.object.visible).toBe(false);
  });

  it('keeps a pulse on its ground lift in the colour it is given without a tint', () => {
    const { pool, rings } = ringPool(RING);
    pool.play(SPOT, EMBER);
    const [ring] = rings;
    expect(ring.object.position.toArray()).toEqual([SPOT.x, GROUND_RING_LIFT, SPOT.z]);
    expect(ring.material.color.equals(EMBER)).toBe(true);
  });

  it('tints a copy of the colour toward white and plays it where asked', () => {
    const { pool, rings } = ringPool(TINTED);
    pool.play(SPOT, EMBER);
    const [ring] = rings;
    expect(ring.object.position.equals(SPOT)).toBe(true);
    expect(luminanceOf(ring.material.color)).toBeCloseTo(1.3, PRECISION);
    expect(EMBER.getHex()).toBe(0xff6a2a);
  });

  it('reuses its pulses in turn', () => {
    const { pool, rings } = ringPool(RING);
    const later = new THREE.Vector3(5, 0, 5);
    pool.play(SPOT, EMBER);
    pool.update(0.5);
    pool.play(SPOT, EMBER);
    pool.play(later, EMBER);
    expect(rings[0].object.position.x).toBe(later.x);
    expect(rings[0].object.scale.x).toBe(1);
    expect(rings.every((ring) => ring.object.visible)).toBe(true);
  });

  it('frees its own materials on dispose and keeps the shared ring assets', () => {
    const { pool, rings } = ringPool(RING);
    const scene = new THREE.Scene();
    scene.add(pool.group);
    const materials = rings.map((ring) => ring.material);
    const counts = trackDisposal(...materials, groundPlaneGeometry(), shockwaveTexture());
    pool.dispose();
    expect(scene.children).toHaveLength(0);
    expect(materials.map((material) => counts.get(material))).toEqual([1, 1]);
    expect(counts.get(groundPlaneGeometry())).toBe(0);
    expect(counts.get(shockwaveTexture())).toBe(0);
  });
});
