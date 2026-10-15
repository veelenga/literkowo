import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { FEVER_COMBO } from '../../combo';
import { chargeFor, strikeAccent, strikeColor } from './palette';

const GOLD = new THREE.Color(0xffc23d);

function colorAt(combo: number, fever = false): THREE.Color {
  return strikeColor(strikeAccent('meadow'), combo, fever, new THREE.Color());
}

function distanceToGold(color: THREE.Color): number {
  return Math.hypot(color.r - GOLD.r, color.g - GOLD.g, color.b - GOLD.b);
}

describe('strike palette', () => {
  it('starts from the theme accent', () => {
    expect(colorAt(0).equals(strikeAccent('meadow'))).toBe(true);
    expect(strikeAccent('cave').equals(strikeAccent('meadow'))).toBe(false);
  });

  it('shifts toward gold as the combo rises', () => {
    const steps = [0, 5, 10, FEVER_COMBO - 1].map((combo) => distanceToGold(colorAt(combo)));
    steps.slice(1).forEach((distance, index) => expect(distance).toBeLessThan(steps[index]));
    expect(steps.at(-1)).toBeGreaterThan(0);
  });

  it('is fully golden in fever', () => {
    expect(colorAt(FEVER_COMBO, true).getHexString()).toBe(GOLD.getHexString());
    expect(colorAt(0, true).getHexString()).toBe(GOLD.getHexString());
  });

  it('charges from nothing to full at the fever combo', () => {
    expect(chargeFor(0)).toBe(0);
    expect(chargeFor(FEVER_COMBO / 3)).toBeCloseTo(1 / 3);
    expect(chargeFor(FEVER_COMBO * 2)).toBe(1);
  });
});
