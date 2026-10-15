import * as THREE from 'three';

export interface Placement {
  x: number;
  y: number;
  z: number;
  scale?: number;
  stretch?: number;
  rotation?: number;
  tiltX?: number;
  tiltZ?: number;
  tint?: THREE.Color;
}

export interface InstanceOptions {
  castShadow?: boolean;
  receiveShadow?: boolean;
  tinted?: boolean;
}

const WHITE = new THREE.Color(1, 1, 1);

export function instances(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  placements: Placement[],
  options: InstanceOptions = {},
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const scale = new THREE.Vector3();
  const tinted = options.tinted !== false && placements.some((placement) => placement.tint);
  placements.forEach((placement, index) => {
    const size = placement.scale ?? 1;
    position.set(placement.x, placement.y, placement.z);
    euler.set(placement.tiltX ?? 0, placement.rotation ?? 0, placement.tiltZ ?? 0);
    rotation.setFromEuler(euler);
    scale.set(size, size * (placement.stretch ?? 1), size);
    mesh.setMatrixAt(index, matrix.compose(position, rotation, scale));
    if (tinted) mesh.setColorAt(index, placement.tint ?? WHITE);
  });
  mesh.castShadow = options.castShadow ?? false;
  mesh.receiveShadow = options.receiveShadow ?? true;
  mesh.computeBoundingSphere();
  return mesh;
}
