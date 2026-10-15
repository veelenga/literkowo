import * as THREE from 'three';
import { createAssetCache } from '../assetCache';
import { withLuminance } from './luminance';

const PUFF_COUNT = 5;
const PUFF_SIZE = 0.2;
const PUFF_LAG = 0.08;
const PUFF_MIN_SPACING = 0.14;
const PUFF_SHRINK = 0.15;
const PUFF_OPACITY = 0.3;
const PUFF_LUMINANCE = 0.9;

const geometries = createAssetCache<THREE.BufferGeometry>();
const materials = createAssetCache<THREE.MeshBasicMaterial>();

function puffGeometry(): THREE.BufferGeometry {
  return geometries.get('puff', () => new THREE.BoxGeometry(PUFF_SIZE, PUFF_SIZE, PUFF_SIZE));
}

function puffMaterial(color: THREE.Color): THREE.MeshBasicMaterial {
  return materials.get(
    color.getHexString(),
    () =>
      new THREE.MeshBasicMaterial({
        color: withLuminance(color.clone(), PUFF_LUMINANCE),
        transparent: true,
        opacity: PUFF_OPACITY,
        depthWrite: false,
      }),
  );
}

export class WispTrail {
  readonly group = new THREE.Group();
  private readonly puffs: THREE.Mesh[] = [];

  constructor(
    color: THREE.Color,
    private readonly scale: number,
    private readonly heightAt: (time: number) => number,
  ) {
    const material = puffMaterial(color);
    for (let step = 1; step <= PUFF_COUNT; step += 1) {
      const puff = new THREE.Mesh(puffGeometry(), material);
      puff.scale.setScalar(scale * (1 - step * PUFF_SHRINK));
      puff.rotation.set(Math.random(), Math.random(), Math.random());
      this.puffs.push(puff);
      this.group.add(puff);
    }
  }

  update(outward: THREE.Vector3, speed: number, elapsed: number): void {
    const spacing = Math.max(speed * PUFF_LAG, PUFF_MIN_SPACING) * this.scale;
    for (let index = 0; index < this.puffs.length; index += 1) {
      const step = index + 1;
      const distance = spacing * step;
      this.puffs[index].position.set(
        outward.x * distance,
        this.heightAt(elapsed - step * PUFF_LAG),
        outward.z * distance,
      );
    }
  }
}
