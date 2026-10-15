import * as THREE from 'three';
import { blockAssembly, type Block } from '../../effects/chunkyGeometry';
import { groundPlaneGeometry, softGlowTexture } from '../../effects/glowAssets';
import { cachedGeometry } from '../enemyTypes/bodies';
import { FadingMaterials } from '../enemyTypes/fading';
import { Motes, type MoteStyle } from '../powerWords/effects/Motes';

const RIM = {
  count: 12,
  radius: 0.74,
  wobble: 0.05,
  height: 0.06,
  color: 0x5b4433,
  roughness: 0.9,
};
const RIM_SIZES: readonly Block['size'][] = [
  [0.42, 0.16, 0.22],
  [0.34, 0.12, 0.2],
  [0.38, 0.2, 0.24],
];
const SCORCH = { color: 0x1c0f08, size: 2.4, height: 0.05, opacity: 0.6 };
const EMBER_STYLE: MoteStyle = {
  color: 0xffa43a,
  size: 0.24,
  lifetime: 1.1,
  gravity: 0.6,
  drag: 1.2,
  opacity: 1,
};
const EMBER_CAPACITY = 24;
const EMBER_RATE = 9;
const EMBER_SOURCE = { spread: 0.5, height: 0.8 };
const EMBER_SPEED = { spread: 0.7, rise: { min: 0.6, max: 1.4 } };
const FULL_TURN = Math.PI * 2;
const QUARTER_TURN = Math.PI / 2;

function rimBlocks(): Block[] {
  return Array.from({ length: RIM.count }, (_, index): Block => {
    const angle = (index / RIM.count) * FULL_TURN;
    const radius = RIM.radius + (index % 2) * RIM.wobble;
    return {
      size: RIM_SIZES[index % RIM_SIZES.length],
      position: [Math.cos(angle) * radius, RIM.height, Math.sin(angle) * radius],
      rotation: [0, -(angle + QUARTER_TURN), 0],
    };
  });
}

function createRim(): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({
    color: RIM.color,
    roughness: RIM.roughness,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(
    cachedGeometry('meteor-crater-rim', () => blockAssembly(rimBlocks())),
    material,
  );
  mesh.receiveShadow = true;
  return mesh;
}

function createScorch(): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({
    color: SCORCH.color,
    map: softGlowTexture(),
    transparent: true,
    opacity: SCORCH.opacity,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(groundPlaneGeometry(), material);
  mesh.scale.setScalar(SCORCH.size);
  mesh.position.y = SCORCH.height;
  return mesh;
}

export class Crater {
  readonly group = new THREE.Group();
  private readonly embers = new Motes(EMBER_CAPACITY, EMBER_STYLE);
  private readonly fading: FadingMaterials;
  private readonly source = new THREE.Vector3();
  private readonly velocity = new THREE.Vector3();
  private emberDebt = 0;

  constructor() {
    this.group.add(createScorch(), createRim());
    this.fading = new FadingMaterials(this.group);
    this.group.add(this.embers.points);
    this.group.visible = false;
  }

  open(): void {
    this.group.visible = true;
  }

  update(delta: number, heat: number, presence: number): void {
    this.fading.apply(presence);
    this.throwEmbers(delta * heat * presence);
    this.embers.update(delta);
  }

  private throwEmbers(share: number): void {
    this.emberDebt += share * EMBER_RATE;
    while (this.emberDebt >= 1) {
      this.emberDebt -= 1;
      this.source.set(
        THREE.MathUtils.randFloatSpread(EMBER_SOURCE.spread),
        EMBER_SOURCE.height,
        THREE.MathUtils.randFloatSpread(EMBER_SOURCE.spread),
      );
      this.velocity.set(
        THREE.MathUtils.randFloatSpread(EMBER_SPEED.spread),
        THREE.MathUtils.randFloat(EMBER_SPEED.rise.min, EMBER_SPEED.rise.max),
        THREE.MathUtils.randFloatSpread(EMBER_SPEED.spread),
      );
      this.embers.spawn(this.source, this.velocity);
    }
  }
}
