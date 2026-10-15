import * as THREE from 'three';

const NEARLY_VERTICAL = 0.99;
const UP = new THREE.Vector3(0, 1, 0);
const ACROSS = new THREE.Vector3(1, 0, 0);
const NO_BOW = new THREE.Vector3();
const direction = new THREE.Vector3();
const side = new THREE.Vector3();
const normal = new THREE.Vector3();

export function traceJaggedPath(
  path: readonly THREE.Vector3[],
  from: THREE.Vector3,
  to: THREE.Vector3,
  jitter: number,
  bow: THREE.Vector3 = NO_BOW,
): void {
  const segments = path.length - 1;
  perpendicularAxes(from, to);
  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const swell = Math.sin(progress * Math.PI);
    const reach = jitter * swell;
    path[index]
      .lerpVectors(from, to, progress)
      .addScaledVector(bow, swell)
      .addScaledVector(side, THREE.MathUtils.randFloatSpread(reach * 2))
      .addScaledVector(normal, THREE.MathUtils.randFloatSpread(reach * 2));
  }
}

function perpendicularAxes(from: THREE.Vector3, to: THREE.Vector3): void {
  direction.subVectors(to, from).normalize();
  const helper = Math.abs(direction.y) < NEARLY_VERTICAL ? UP : ACROSS;
  side.crossVectors(direction, helper).normalize();
  normal.crossVectors(side, direction);
}
