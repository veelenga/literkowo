import * as THREE from 'three';
import { blockAssembly, type Block } from '../../effects/chunkyGeometry';
import { cachedGeometry } from './bodies';

const SHELL_COLOR = 0xfff7e8;
const WARM_COLOR = 0xffa030;
const ROUGHNESS = 0.55;
const GLOW = { idle: 0.15, hatching: 2 };
const JIGGLE = { speed: 24, angle: 0.12 };

const EGGS: readonly Block[] = [
  { size: [0.28, 0.38, 0.28], position: [0.2, 0.12, 0.04], rotation: [0, 0.3, -0.22] },
  { size: [0.26, 0.35, 0.26], position: [-0.14, 0.1, 0.18], rotation: [0.18, 0.7, 0.14] },
  { size: [0.27, 0.36, 0.27], position: [-0.08, 0.11, -0.2], rotation: [-0.16, 0.2, 0.16] },
];

export class NestEggs {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;

  constructor() {
    const material = new THREE.MeshStandardMaterial({
      color: SHELL_COLOR,
      emissive: WARM_COLOR,
      emissiveIntensity: GLOW.idle,
      roughness: ROUGHNESS,
      flatShading: true,
    });
    this.mesh = new THREE.Mesh(
      cachedGeometry('nest-eggs', () => blockAssembly(EGGS)),
      material,
    );
    this.mesh.castShadow = true;
  }

  update(warmth: number, elapsed: number): void {
    this.mesh.material.emissiveIntensity = THREE.MathUtils.lerp(GLOW.idle, GLOW.hatching, warmth);
    this.mesh.rotation.z = Math.sin(elapsed * JIGGLE.speed) * JIGGLE.angle * warmth;
  }
}
