import * as THREE from 'three';
import { disposeObject } from '../../disposal';
import { withLuminance } from '../../effects/luminance';

export const TRAIL_CAPACITY = 72;

const CUBE_SIZE = 0.22;
const LIFETIME = 0.45;
const DRIFT_SPEED = 1.2;
const JITTER = 0.25;
const LUMINANCE = 1.4;
const SURGE_TINT = new THREE.Color(0xff3b30);
const TINT_SHARE = 0.55;
const FULL_TURN = Math.PI * 2;
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

interface Cube {
  readonly position: THREE.Vector3;
  readonly drift: THREE.Vector3;
  readonly rotation: THREE.Euler;
  readonly color: THREE.Color;
  age: number;
  alive: boolean;
}

const matrix = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();
const shade = new THREE.Color();

function createCube(): Cube {
  return {
    position: new THREE.Vector3(),
    drift: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    color: new THREE.Color(),
    age: 0,
    alive: false,
  };
}

export class SurgeTrail {
  readonly mesh: THREE.InstancedMesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
  private readonly cubes: Cube[];
  private cursor = 0;

  constructor(capacity = TRAIL_CAPACITY) {
    const material = new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, capacity);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.cubes = Array.from({ length: capacity }, createCube);
    for (let index = 0; index < capacity; index += 1) this.mesh.setMatrixAt(index, HIDDEN);
  }

  get liveCount(): number {
    return this.cubes.filter((cube) => cube.alive).length;
  }

  emit(origin: THREE.Vector3, color: THREE.Color): void {
    const cube = this.cubes[this.cursor];
    this.cursor = (this.cursor + 1) % this.cubes.length;
    cube.alive = true;
    cube.age = 0;
    cube.position.set(
      origin.x + THREE.MathUtils.randFloatSpread(JITTER),
      origin.y + THREE.MathUtils.randFloatSpread(JITTER),
      origin.z + THREE.MathUtils.randFloatSpread(JITTER),
    );
    cube.drift.set(origin.x, 0, origin.z).normalize().multiplyScalar(DRIFT_SPEED);
    cube.rotation.set(Math.random() * FULL_TURN, Math.random() * FULL_TURN, 0);
    cube.color.copy(color).lerp(SURGE_TINT, TINT_SHARE);
    withLuminance(cube.color, LUMINANCE);
    this.mesh.visible = true;
  }

  update(delta: number): void {
    if (!this.mesh.visible) return;
    this.cubes.forEach((cube, index) => this.step(cube, index, delta));
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    if (this.liveCount === 0) this.mesh.visible = false;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    disposeObject(this.mesh);
  }

  private step(cube: Cube, index: number, delta: number): void {
    if (!cube.alive) return;
    cube.age += delta;
    if (cube.age >= LIFETIME) {
      cube.alive = false;
      this.mesh.setMatrixAt(index, HIDDEN);
      return;
    }
    cube.position.addScaledVector(cube.drift, delta);
    const fade = 1 - cube.age / LIFETIME;
    scale.setScalar(CUBE_SIZE * fade);
    quaternion.setFromEuler(cube.rotation);
    this.mesh.setMatrixAt(index, matrix.compose(cube.position, quaternion, scale));
    this.mesh.setColorAt(index, shade.copy(cube.color).multiplyScalar(fade));
  }
}
