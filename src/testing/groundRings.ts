import * as THREE from 'three';
import { shockwaveTexture } from '../game/effects/glowAssets';

export type GroundRingMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;

export function groundRingsIn(root: THREE.Object3D): GroundRingMesh[] {
  const rings: GroundRingMesh[] = [];
  root.traverse((object) => {
    if (isGroundRing(object)) rings.push(object);
  });
  return rings;
}

function isGroundRing(object: THREE.Object3D): object is GroundRingMesh {
  return (
    object instanceof THREE.Mesh &&
    object.material instanceof THREE.MeshBasicMaterial &&
    object.material.map === shockwaveTexture()
  );
}
