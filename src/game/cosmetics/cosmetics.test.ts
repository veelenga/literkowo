import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { HATS, PETS } from '../../course/shop';
import { buildHat } from './hats';
import { buildPet } from './pets';

const SAMPLE_TIMES = [0, 0.4, 1.3];
const MAX_PET_SIZE = 1;

function sizeOf(object: THREE.Object3D): THREE.Vector3 {
  return new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
}

describe('pets', () => {
  it.each(PETS)('builds a small animated $id', (spec) => {
    const pet = buildPet(spec);
    for (const time of SAMPLE_TIMES) pet.animate(time);
    const size = sizeOf(pet.object);
    expect(size.length()).toBeGreaterThan(0);
    expect(Math.max(size.x, size.y, size.z)).toBeLessThan(MAX_PET_SIZE);
  });
});

describe('hats', () => {
  it.each(HATS)('builds the $id over a head of unit width', (spec) => {
    const bounds = new THREE.Box3().setFromObject(buildHat(spec));
    expect(bounds.isEmpty()).toBe(false);
    expect(bounds.max.y).toBeGreaterThan(0);
  });
});
