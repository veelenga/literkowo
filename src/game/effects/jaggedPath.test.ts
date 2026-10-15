import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { traceJaggedPath } from './jaggedPath';

const POINTS = 9;
const JITTER = 0.5;
const PRECISION = 5;

function emptyPath(): THREE.Vector3[] {
  return Array.from({ length: POINTS }, () => new THREE.Vector3());
}

function offsetFromLine(point: THREE.Vector3, from: THREE.Vector3, to: THREE.Vector3) {
  const line = new THREE.Line3(from, to);
  const closest = line.closestPointToPoint(point, false, new THREE.Vector3());
  return { across: point.distanceTo(closest), along: line.closestPointToPointParameter(point) };
}

describe('traceJaggedPath', () => {
  it.each([
    ['sideways', new THREE.Vector3(0, 1, 0), new THREE.Vector3(4, 1.5, -6)],
    ['straight down', new THREE.Vector3(0, 16, 0), new THREE.Vector3(0, 1, 0)],
  ])('keeps the ends and only bends across the bolt going %s', (_, from, to) => {
    const path = emptyPath();
    traceJaggedPath(path, from, to, JITTER);
    expect(path[0].toArray()).toEqual(from.toArray());
    path
      .at(-1)
      ?.toArray()
      .forEach((value, axis) => expect(value).toBeCloseTo(to.getComponent(axis), PRECISION));
    path.forEach((point, index) => {
      const { across, along } = offsetFromLine(point, from, to);
      expect(along).toBeCloseTo(index / (POINTS - 1), PRECISION);
      expect(across).toBeLessThanOrEqual(JITTER * Math.SQRT2);
    });
  });

  it('bows the middle of the path', () => {
    const path = emptyPath();
    const bow = new THREE.Vector3(0, 2, 0);
    traceJaggedPath(path, new THREE.Vector3(0, 0, 0), new THREE.Vector3(8, 0, 0), 0, bow);
    expect(path[(POINTS - 1) / 2].y).toBeCloseTo(2, PRECISION);
  });
});
