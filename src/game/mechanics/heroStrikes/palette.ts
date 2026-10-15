import * as THREE from 'three';
import type { ThemeId } from '../../../course/regions';
import { FEVER_COMBO } from '../../combo';

const STRIKE_ACCENTS: Record<ThemeId, number> = {
  meadow: 0x38d9ff,
  forest: 0x8ab4ff,
  mountains: 0x4d9dff,
  cave: 0x6ff7ff,
  island: 0x3fe0c5,
};
const STRIKE_GOLD = new THREE.Color(0xffc23d);
const GOLD_BEFORE_FEVER = 0.6;

export function strikeAccent(theme: ThemeId): THREE.Color {
  return new THREE.Color(STRIKE_ACCENTS[theme]);
}

export function chargeFor(combo: number): number {
  return THREE.MathUtils.clamp(combo / FEVER_COMBO, 0, 1);
}

export function strikeColor(
  accent: THREE.Color,
  combo: number,
  fever: boolean,
  target: THREE.Color,
): THREE.Color {
  const golden = fever ? 1 : chargeFor(combo) ** 2 * GOLD_BEFORE_FEVER;
  return target.copy(accent).lerp(STRIKE_GOLD, golden);
}
