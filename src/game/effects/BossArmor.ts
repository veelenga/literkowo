import * as THREE from 'three';
import { createAssetCache } from '../assetCache';
import { chunkyBlock } from './chunkyGeometry';
import { setEmissiveLuminance } from './luminance';

const CHUNK_COUNT = 8;
const CHUNK = { width: 0.3, height: 0.24, depth: 0.16 };
const ORBIT_RADIUS = 1.05;
const ORBIT_TILT = 0.22;
const ORBIT_SPEED = 0.5;
const ORBIT_SPEED_GAIN = 2.5;
const CHUNK_LEAN = 0.3;
const WOBBLE_SPEED = 1.7;
const WOBBLE_HEIGHT = 0.06;
const SHED_DURATION = 0.95;
const SHED_GRAVITY = -4.5;
const SHED_OUTWARD_SPEED = 1.4;
const SHED_LIFT = 1.2;
const SHED_SPIN = 8;
const SHED_SHRINK_START = 0.45;
const CHUNK_SHADE = 0.3;
const CHUNK_GLOW = 0.22;
const CHUNK_ROUGHNESS = 0.3;
const CHUNK_METALNESS = 0.55;
const FULL_TURN = Math.PI * 2;
const QUARTER_TURN = Math.PI / 2;

interface Chunk {
  mesh: THREE.Mesh;
  slot: number;
  attached: boolean;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  shedAge: number;
}

const geometries = createAssetCache<THREE.BufferGeometry>();

function chunkGeometry(): THREE.BufferGeometry {
  return geometries.get('armor-chunk', () => chunkyBlock(CHUNK.width, CHUNK.height, CHUNK.depth));
}

export class BossArmor {
  readonly group = new THREE.Group();
  private readonly material: THREE.MeshStandardMaterial;
  private readonly chunks: Chunk[] = [];
  private orbitAngle = 0;
  private time = 0;

  constructor(color: THREE.Color) {
    this.material = new THREE.MeshStandardMaterial({
      color: color.clone().multiplyScalar(CHUNK_SHADE),
      emissive: color,
      roughness: CHUNK_ROUGHNESS,
      metalness: CHUNK_METALNESS,
      flatShading: true,
    });
    setEmissiveLuminance(this.material, CHUNK_GLOW);
    for (let slot = 0; slot < CHUNK_COUNT; slot += 1) {
      const chunk = this.createChunk(slot);
      this.chunks.push(chunk);
      this.group.add(chunk.mesh);
    }
  }

  private get attachedChunks(): Chunk[] {
    return this.chunks.filter((chunk) => chunk.attached);
  }

  update(delta: number, health: number): void {
    this.time += delta;
    this.orbitAngle += ORBIT_SPEED * (1 + (1 - health) * ORBIT_SPEED_GAIN) * delta;
    for (const chunk of this.chunks) {
      if (chunk.attached) this.orbit(chunk);
      else if (chunk.mesh.visible) this.fall(chunk, delta);
    }
  }

  shed(health: number): void {
    const keep = Math.ceil(health * CHUNK_COUNT);
    let attached = this.attachedChunks;
    while (attached.length > keep) {
      this.detach(attached[Math.floor(Math.random() * attached.length)]);
      attached = this.attachedChunks;
    }
  }

  private orbit(chunk: Chunk): void {
    const angle = this.orbitAngle + (chunk.slot / CHUNK_COUNT) * FULL_TURN;
    const x = Math.cos(angle) * ORBIT_RADIUS;
    const z = Math.sin(angle) * ORBIT_RADIUS;
    const wobble = Math.sin(this.time * WOBBLE_SPEED + chunk.slot) * WOBBLE_HEIGHT;
    chunk.mesh.position.set(x, z * ORBIT_TILT + wobble, z);
    chunk.mesh.rotation.set(CHUNK_LEAN, QUARTER_TURN - angle, 0);
  }

  private detach(chunk: Chunk): void {
    const { x, z } = chunk.mesh.position;
    const length = Math.hypot(x, z) || 1;
    chunk.attached = false;
    chunk.shedAge = 0;
    chunk.velocity.set(
      (x / length) * SHED_OUTWARD_SPEED,
      SHED_LIFT,
      (z / length) * SHED_OUTWARD_SPEED,
    );
    chunk.spin.set(
      THREE.MathUtils.randFloatSpread(SHED_SPIN),
      THREE.MathUtils.randFloatSpread(SHED_SPIN),
      THREE.MathUtils.randFloatSpread(SHED_SPIN),
    );
  }

  private fall(chunk: Chunk, delta: number): void {
    chunk.shedAge += delta;
    const progress = chunk.shedAge / SHED_DURATION;
    if (progress >= 1) {
      chunk.mesh.visible = false;
      return;
    }
    chunk.velocity.y += SHED_GRAVITY * delta;
    chunk.mesh.position.addScaledVector(chunk.velocity, delta);
    chunk.mesh.rotation.x += chunk.spin.x * delta;
    chunk.mesh.rotation.y += chunk.spin.y * delta;
    chunk.mesh.rotation.z += chunk.spin.z * delta;
    chunk.mesh.scale.setScalar(1 - THREE.MathUtils.smoothstep(progress, SHED_SHRINK_START, 1));
  }

  private createChunk(slot: number): Chunk {
    const mesh = new THREE.Mesh(chunkGeometry(), this.material);
    mesh.rotation.order = 'YXZ';
    mesh.castShadow = true;
    return {
      mesh,
      slot,
      attached: true,
      velocity: new THREE.Vector3(),
      spin: new THREE.Vector3(),
      shedAge: 0,
    };
  }
}
