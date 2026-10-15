import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { handAhead, handToward, strikeTarget } from './aim';

const HAND_HEIGHT = 1.2;
const HAND_REACH = 0.35;

function enemy(distanceToCenter: number, typedLength: number, isComplete = false) {
  return { distanceToCenter, typedLength, isComplete };
}

describe('strikeTarget', () => {
  it('picks the nearest enemy that is being typed', () => {
    const far = enemy(8, 2);
    const untyped = enemy(2, 0);
    const near = enemy(5, 1);
    expect(strikeTarget([far, untyped, near])).toBe(near);
  });

  it('leaves completed and untouched enemies to the word strike', () => {
    expect(strikeTarget([enemy(3, 3, true), enemy(1, 0)])).toBeUndefined();
  });
});

describe('hand position', () => {
  it('reaches from the hero toward the target at hand height', () => {
    const hand = handToward(new THREE.Vector3(), new THREE.Vector3(0, 2, -6), new THREE.Vector3());
    expect(hand.x).toBeCloseTo(0);
    expect(hand.y).toBeCloseTo(HAND_HEIGHT);
    expect(hand.z).toBeCloseTo(-HAND_REACH);
  });

  it('sits in front of the hero when there is no target', () => {
    const hero = new THREE.Object3D();
    hero.rotation.y = Math.PI / 2;
    const hand = handAhead(hero, new THREE.Vector3());
    expect(hand.x).toBeCloseTo(HAND_REACH);
    expect(hand.y).toBeCloseTo(HAND_HEIGHT);
    expect(hand.z).toBeCloseTo(0);
  });
});
