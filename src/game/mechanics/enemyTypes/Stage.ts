import * as THREE from 'three';
import { disposeObject } from '../../disposal';
import type { Enemy } from '../../Enemy';
import { softGlowTexture } from '../../effects/glowAssets';
import { PulsePool, type PulseSettings, type PulseVisual } from '../../effects/PulsePool';
import type { MechanicContext } from '../Mechanic';
import { SOUNDS, type SoundCue } from './sounds';
import type { SpecialHost } from './SpecialEnemy';
import { Tumbles, type Landing } from './Tumbles';

export const BOMB_SHAKE = { strength: 0.5, seconds: 0.8 };

export type StageContext = Pick<
  MechanicContext,
  | 'scene'
  | 'particles'
  | 'sfx'
  | 'shakeCamera'
  | 'loseLife'
  | 'removeEnemy'
  | 'addEnemy'
  | 'createLabel'
>;

const DUST_COLOR = new THREE.Color(0xe8dcc0);
const BOMB_COLORS = [new THREE.Color(0xff7a1a), new THREE.Color(0x3a2a4a)];
const CONFETTI_COLORS = [0xff3b5c, 0xffd23f, 0x3da5ff, 0x5cf28a, 0xff7ad9].map(
  (hex) => new THREE.Color(hex),
);
const CONFETTI_SPREAD = 0.7;

const DUST: PulseSettings = {
  poolSize: 10,
  duration: 0.5,
  startScale: 0.5,
  endScale: 2.2,
  luminance: 0.9,
  whiteBlend: 0.4,
};

const SPARK: PulseSettings = {
  poolSize: 12,
  duration: 0.35,
  startScale: 0.3,
  endScale: 1.7,
  luminance: 2.2,
  whiteBlend: 0.35,
};

function puffVisual(blending: THREE.Blending): () => PulseVisual {
  return () => {
    const material = new THREE.SpriteMaterial({
      map: softGlowTexture(),
      blending,
      depthWrite: false,
    });
    return { object: new THREE.Sprite(material), material };
  };
}

export class Stage implements SpecialHost {
  private readonly root = new THREE.Group();
  private readonly dustPuffs = new PulsePool(DUST, puffVisual(THREE.NormalBlending));
  private readonly sparks = new PulsePool(SPARK, puffVisual(THREE.AdditiveBlending));
  private readonly tumbles = new Tumbles();
  private readonly scatter = new THREE.Vector3();

  constructor(private readonly context: StageContext) {
    this.root.add(this.dustPuffs.group, this.sparks.group, this.tumbles.group);
    context.scene.add(this.root);
  }

  update(delta: number): void {
    this.dustPuffs.update(delta);
    this.sparks.update(delta);
    this.tumbles.update(delta).forEach((landing) => this.crash(landing));
  }

  dust(position: THREE.Vector3): void {
    this.dustPuffs.play(position, DUST_COLOR);
  }

  pop(position: THREE.Vector3, color: THREE.Color): void {
    this.sparks.play(position, color);
  }

  confetti(position: THREE.Vector3): void {
    for (const color of CONFETTI_COLORS) {
      this.scatter.randomDirection().multiplyScalar(CONFETTI_SPREAD).add(position);
      this.context.particles.burst(this.scatter, color);
    }
  }

  tumble(body: THREE.Object3D, color: THREE.Color): void {
    this.tumbles.add(body, color);
  }

  bomb(position: THREE.Vector3): void {
    BOMB_COLORS.forEach((color) => this.context.particles.burst(position, color));
    this.dust(position);
    this.play('bombBlast');
    this.context.loseLife();
    this.context.shakeCamera(BOMB_SHAKE.strength, BOMB_SHAKE.seconds);
  }

  dismiss(enemy: Enemy): void {
    this.context.removeEnemy(enemy);
  }

  spawn(enemy: Enemy): void {
    this.context.addEnemy(enemy);
  }

  createLabel(): HTMLElement {
    return this.context.createLabel();
  }

  play(cue: SoundCue): void {
    SOUNDS[cue](this.context.sfx);
  }

  dispose(): void {
    this.tumbles.dispose();
    this.root.removeFromParent();
    disposeObject(this.root);
  }

  private crash({ position, color }: Landing): void {
    this.context.particles.burst(position, color);
    this.dust(position);
    this.play('batCrash');
  }
}
