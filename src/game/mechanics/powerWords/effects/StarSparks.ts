import * as THREE from 'three';
import { createAssetCache } from '../../../assetCache';
import { withLuminance } from '../../../effects/luminance';

const STAR_POINTS = 5;
const OUTER_RADIUS = 0.13;
const INNER_RADIUS = 0.055;
const STAR_COLOR = 0xfff1b0;
const STAR_LUMINANCE = 3;
const ORBIT_RADIUS = 1.05;
const ORBIT_SPEED = 1.1;
const ORBIT_TILT = 0.45;
const BOB_HEIGHT = 0.18;
const BOB_SPEED = 2.4;
const STAR_SPIN = 3;
const TWINKLE_SPEED = 7;
const TWINKLE_AMOUNT = 0.35;
const FULL_TURN = Math.PI * 2;

const geometries = createAssetCache<THREE.BufferGeometry>();
const materials = createAssetCache<THREE.MeshBasicMaterial>();

function starGeometry(): THREE.BufferGeometry {
  return geometries.get('star', () => new THREE.ShapeGeometry(starShape()));
}

function starMaterial(): THREE.MeshBasicMaterial {
  return materials.get(
    'star',
    () =>
      new THREE.MeshBasicMaterial({
        color: withLuminance(new THREE.Color(STAR_COLOR), STAR_LUMINANCE),
        side: THREE.DoubleSide,
      }),
  );
}

function starShape(): THREE.Shape {
  const shape = new THREE.Shape();
  const corners = STAR_POINTS * 2;
  for (let index = 0; index <= corners; index += 1) {
    const radius = index % 2 === 0 ? OUTER_RADIUS : INNER_RADIUS;
    const angle = (index / corners) * FULL_TURN + Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return shape;
}

export class StarSparks {
  readonly group = new THREE.Group();
  private readonly stars: THREE.Mesh[];
  private time = 0;

  constructor(count: number) {
    this.stars = Array.from(
      { length: count },
      () => new THREE.Mesh(starGeometry(), starMaterial()),
    );
    this.group.add(...this.stars);
    this.group.rotation.x = ORBIT_TILT;
  }

  update(delta: number): void {
    this.time += delta;
    this.stars.forEach((star, index) => this.place(star, index));
  }

  private place(star: THREE.Mesh, index: number): void {
    const offset = (index / this.stars.length) * FULL_TURN;
    const angle = this.time * ORBIT_SPEED + offset;
    star.position.set(
      Math.cos(angle) * ORBIT_RADIUS,
      Math.sin(this.time * BOB_SPEED + offset) * BOB_HEIGHT,
      Math.sin(angle) * ORBIT_RADIUS,
    );
    star.rotation.y = this.time * STAR_SPIN + offset;
    star.scale.setScalar(1 + Math.sin(this.time * TWINKLE_SPEED + offset) * TWINKLE_AMOUNT);
  }
}
