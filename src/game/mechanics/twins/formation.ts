import * as THREE from 'three';

export type FormationShape = 'line' | 'vee';

export interface FormationSlot {
  readonly lateral: number;
  readonly depth: number;
}

export const LINE_SPACING = 1.6;
export const VEE_SPREAD = 1.1;
export const VEE_DEPTH = 0.9;
export const AIM_SHARE = 0.35;

const UP = new THREE.Vector3(0, 1, 0);

export function formationSlots(count: number, shape: FormationShape): FormationSlot[] {
  return Array.from({ length: count }, (_, index) =>
    shape === 'line' ? lineSlot(index, count) : veeSlot(index),
  );
}

export function slotPosition(anchor: THREE.Vector3, slot: FormationSlot): THREE.Vector3 {
  const outward = outwardOf(anchor);
  const sideways = sidewaysOf(outward);
  return anchor
    .clone()
    .addScaledVector(sideways, slot.lateral)
    .addScaledVector(outward, slot.depth);
}

export function slotAim(anchor: THREE.Vector3, slot: FormationSlot): THREE.Vector3 {
  return sidewaysOf(outwardOf(anchor)).multiplyScalar(slot.lateral * AIM_SHARE);
}

function lineSlot(index: number, count: number): FormationSlot {
  return { lateral: (index - (count - 1) / 2) * LINE_SPACING, depth: 0 };
}

function veeSlot(index: number): FormationSlot {
  const row = Math.ceil(index / 2);
  const side = index % 2 === 0 ? 1 : -1;
  return { lateral: side * row * VEE_SPREAD, depth: row * VEE_DEPTH };
}

function outwardOf(anchor: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(anchor.x, 0, anchor.z).normalize();
}

function sidewaysOf(outward: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3().crossVectors(UP, outward).normalize();
}
