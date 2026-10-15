import * as THREE from 'three';
import { createAssetCache } from '../assetCache';
import { withLuminance } from './luminance';

const SPARK_SIZE = 0.09;
const SPARK_SPIN = 4;
const BASE_ORBIT_RADIUS = 0.8;
const ORBIT_RADIUS_STEP = 0.12;
const BASE_ORBIT_SPEED = 2.4;
const ORBIT_SPEED_STEP = 0.6;
const ORBIT_TILT = 0.5;
const TWINKLE_SPEED = 11;
const TWINKLE_AMOUNT = 0.35;
const SPARK_LUMINANCE = 2.8;
const SPARK_WHITENESS = 0.3;
const FULL_TURN = Math.PI * 2;
const WHITE = new THREE.Color(0xffffff);

interface Orbit {
  mesh: THREE.Mesh;
  plane: THREE.Quaternion;
  radius: number;
  speed: number;
  angle: number;
}

const geometries = createAssetCache<THREE.BufferGeometry>();
const materials = createAssetCache<THREE.MeshBasicMaterial>();

function sparkGeometry(): THREE.BufferGeometry {
  return geometries.get('spark', () => new THREE.BoxGeometry(SPARK_SIZE, SPARK_SIZE, SPARK_SIZE));
}

function sparkMaterial(color: THREE.Color): THREE.MeshBasicMaterial {
  return materials.get(color.getHexString(), () => {
    const glow = withLuminance(color.clone().lerp(WHITE, SPARK_WHITENESS), SPARK_LUMINANCE);
    return new THREE.MeshBasicMaterial({ color: glow });
  });
}

export class OrbitingSparks {
  readonly group = new THREE.Group();
  private readonly orbits: Orbit[] = [];
  private time = 0;

  constructor(count: number, color: THREE.Color) {
    const material = sparkMaterial(color);
    for (let index = 0; index < count; index += 1) {
      const orbit = this.createOrbit(index, count, material);
      this.orbits.push(orbit);
      this.group.add(orbit.mesh);
    }
  }

  update(delta: number, speedBoost: number): void {
    this.time += delta;
    for (const orbit of this.orbits) {
      orbit.angle += orbit.speed * speedBoost * delta;
      orbit.mesh.position
        .set(Math.cos(orbit.angle) * orbit.radius, 0, Math.sin(orbit.angle) * orbit.radius)
        .applyQuaternion(orbit.plane);
      orbit.mesh.rotation.x += SPARK_SPIN * delta;
      orbit.mesh.rotation.y += SPARK_SPIN * delta;
      orbit.mesh.scale.setScalar(
        1 + Math.sin(this.time * TWINKLE_SPEED + orbit.angle) * TWINKLE_AMOUNT,
      );
    }
  }

  private createOrbit(index: number, count: number, material: THREE.Material): Orbit {
    const direction = index % 2 === 0 ? 1 : -1;
    const yaw = (index / count) * FULL_TURN;
    return {
      mesh: new THREE.Mesh(sparkGeometry(), material),
      plane: new THREE.Quaternion().setFromEuler(new THREE.Euler(ORBIT_TILT * direction, yaw, 0)),
      radius: BASE_ORBIT_RADIUS + index * ORBIT_RADIUS_STEP,
      speed: (BASE_ORBIT_SPEED + index * ORBIT_SPEED_STEP) * direction,
      angle: yaw,
    };
  }
}
