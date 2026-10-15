import * as THREE from 'three';
import { groundPlaneGeometry, shockwaveTexture, softGlowTexture } from './effects/glowAssets';
import { PulsePool, type PulseSettings, type PulseVisual } from './effects/PulsePool';
import { ShatterField } from './effects/ShatterField';

const FRAGMENTS_PER_BURST = 26;
const CONCURRENT_BURSTS = 8;
const SHOCKWAVE_HEIGHT = 0.06;

const FLASH: PulseSettings = {
  poolSize: 6,
  duration: 0.3,
  startScale: 0.6,
  endScale: 3.6,
  luminance: 2.6,
  whiteBlend: 0.55,
};

const SHOCKWAVE: PulseSettings = {
  poolSize: 6,
  duration: 0.65,
  startScale: 0.4,
  endScale: 6,
  luminance: 1.3,
  whiteBlend: 0.2,
};

function createFlash(): PulseVisual {
  const material = new THREE.SpriteMaterial({
    map: softGlowTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
  return { object: new THREE.Sprite(material), material };
}

function createShockwave(): PulseVisual {
  const material = new THREE.MeshBasicMaterial({
    map: shockwaveTexture(),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  return { object: new THREE.Mesh(groundPlaneGeometry(), material), material };
}

export class Particles {
  private readonly shatter = new ShatterField(FRAGMENTS_PER_BURST * CONCURRENT_BURSTS);
  private readonly flashes = new PulsePool(FLASH, createFlash);
  private readonly shockwaves = new PulsePool(SHOCKWAVE, createShockwave);
  private readonly groundPoint = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    scene.add(this.shatter.mesh, this.flashes.group, this.shockwaves.group);
  }

  burst(position: THREE.Vector3, color: THREE.Color): void {
    this.shatter.emit(position, color, FRAGMENTS_PER_BURST);
    this.flashes.play(position, color);
    this.groundPoint.set(position.x, SHOCKWAVE_HEIGHT, position.z);
    this.shockwaves.play(this.groundPoint, color);
  }

  update(delta: number): void {
    this.shatter.update(delta);
    this.flashes.update(delta);
    this.shockwaves.update(delta);
  }
}
