import * as THREE from 'three';
import { withLuminance } from './luminance';

const GRAVITY = -16;
const MIN_SPEED = 4;
const MAX_SPEED = 8.5;
const UPWARD_BIAS = 0.35;
const MIN_SIZE = 0.08;
const MAX_SIZE = 0.2;
const MIN_LIFETIME = 0.8;
const MAX_LIFETIME = 1.3;
const SPIN_RANGE = 28;
const SPAWN_JITTER = 0.4;
const BOUNCE = 0.35;
const GROUND_FRICTION = 0.55;
const POP_IN_TIME = 0.06;
const SHRINK_START = 0.55;
const SPARKLE_CHANCE = 0.3;
const SPARKLE_WHITENESS = 0.65;
const FRAGMENT_LUMINANCE = 1.6;
const EMISSIVE_STRENGTH = 0.9;
const ROUGHNESS = 0.25;
const METALNESS = 0.15;
const FULL_TURN = Math.PI * 2;
const EMISSIVE_CHUNK = '#include <emissivemap_fragment>';
const WHITE = new THREE.Color(0xffffff);
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

interface Fragment {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  spin: THREE.Vector3;
  size: number;
  age: number;
  lifetime: number;
  alive: boolean;
}

const matrix = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();
const tint = new THREE.Color();

function createFragment(): Fragment {
  return {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    spin: new THREE.Vector3(),
    size: 0,
    age: 0,
    lifetime: 1,
    alive: false,
  };
}

function createFragmentMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: WHITE,
    emissive: WHITE,
    emissiveIntensity: EMISSIVE_STRENGTH,
    roughness: ROUGHNESS,
    metalness: METALNESS,
    flatShading: true,
  });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      EMISSIVE_CHUNK,
      `${EMISSIVE_CHUNK}\ntotalEmissiveRadiance *= vColor.rgb;`,
    );
  };
  return material;
}

export class ShatterField {
  readonly mesh: THREE.InstancedMesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private readonly fragments: Fragment[];
  private readonly colors: THREE.InstancedBufferAttribute;
  private cursor = 0;
  private aliveCount = 0;

  constructor(capacity: number) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      createFragmentMaterial(),
      capacity,
    );
    this.colors = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.mesh.instanceColor = this.colors;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.fragments = Array.from({ length: capacity }, createFragment);
    for (let index = 0; index < capacity; index += 1) this.mesh.setMatrixAt(index, HIDDEN);
  }

  emit(origin: THREE.Vector3, color: THREE.Color, count: number): void {
    for (let spawned = 0; spawned < count; spawned += 1) this.spawn(this.nextSlot(), origin, color);
    this.colors.needsUpdate = true;
    this.mesh.visible = true;
  }

  update(delta: number): void {
    if (this.aliveCount === 0) return;
    for (let index = 0; index < this.fragments.length; index += 1) {
      if (this.fragments[index].alive) this.step(index, delta);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.aliveCount === 0) this.mesh.visible = false;
  }

  private nextSlot(): number {
    const slot = this.cursor;
    this.cursor = (this.cursor + 1) % this.fragments.length;
    return slot;
  }

  private spawn(index: number, origin: THREE.Vector3, color: THREE.Color): void {
    const fragment = this.fragments[index];
    if (!fragment.alive) this.aliveCount += 1;
    fragment.alive = true;
    fragment.age = 0;
    fragment.lifetime = THREE.MathUtils.randFloat(MIN_LIFETIME, MAX_LIFETIME);
    fragment.size = THREE.MathUtils.randFloat(MIN_SIZE, MAX_SIZE);
    fragment.position.set(
      origin.x + THREE.MathUtils.randFloatSpread(SPAWN_JITTER),
      origin.y + THREE.MathUtils.randFloatSpread(SPAWN_JITTER),
      origin.z + THREE.MathUtils.randFloatSpread(SPAWN_JITTER),
    );
    this.launch(fragment);
    this.mesh.setColorAt(index, this.fragmentTint(color));
  }

  private launch(fragment: Fragment): void {
    fragment.velocity
      .set(Math.random() - 0.5, Math.random() + UPWARD_BIAS, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(THREE.MathUtils.randFloat(MIN_SPEED, MAX_SPEED));
    fragment.rotation.set(
      Math.random() * FULL_TURN,
      Math.random() * FULL_TURN,
      Math.random() * FULL_TURN,
    );
    fragment.spin.set(
      THREE.MathUtils.randFloatSpread(SPIN_RANGE),
      THREE.MathUtils.randFloatSpread(SPIN_RANGE),
      THREE.MathUtils.randFloatSpread(SPIN_RANGE),
    );
  }

  private fragmentTint(color: THREE.Color): THREE.Color {
    tint.copy(color);
    if (Math.random() < SPARKLE_CHANCE) tint.lerp(WHITE, SPARKLE_WHITENESS);
    return withLuminance(tint, FRAGMENT_LUMINANCE);
  }

  private step(index: number, delta: number): void {
    const fragment = this.fragments[index];
    fragment.age += delta;
    if (fragment.age >= fragment.lifetime) {
      this.retire(index);
      return;
    }
    this.integrate(fragment, delta);
    this.mesh.setMatrixAt(index, this.composeMatrix(fragment));
  }

  private integrate(fragment: Fragment, delta: number): void {
    fragment.velocity.y += GRAVITY * delta;
    fragment.position.addScaledVector(fragment.velocity, delta);
    fragment.rotation.x += fragment.spin.x * delta;
    fragment.rotation.y += fragment.spin.y * delta;
    fragment.rotation.z += fragment.spin.z * delta;
    if (fragment.position.y < fragment.size) this.bounce(fragment);
  }

  private bounce(fragment: Fragment): void {
    fragment.position.y = fragment.size;
    fragment.velocity.y = Math.abs(fragment.velocity.y) * BOUNCE;
    fragment.velocity.x *= GROUND_FRICTION;
    fragment.velocity.z *= GROUND_FRICTION;
    fragment.spin.multiplyScalar(GROUND_FRICTION);
  }

  private composeMatrix(fragment: Fragment): THREE.Matrix4 {
    const progress = fragment.age / fragment.lifetime;
    const popIn = Math.min(1, fragment.age / POP_IN_TIME);
    const shrink = 1 - THREE.MathUtils.smoothstep(progress, SHRINK_START, 1);
    scale.setScalar(fragment.size * popIn * shrink);
    quaternion.setFromEuler(fragment.rotation);
    return matrix.compose(fragment.position, quaternion, scale);
  }

  private retire(index: number): void {
    this.fragments[index].alive = false;
    this.aliveCount -= 1;
    this.mesh.setMatrixAt(index, HIDDEN);
  }
}
