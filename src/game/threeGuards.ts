import * as THREE from 'three';

export function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return object instanceof THREE.Mesh;
}

export function isTexture(value: unknown): value is THREE.Texture {
  return value instanceof THREE.Texture;
}
