import * as THREE from 'three';
import { Enemy, type EnemyBody, type EnemyLook, type EnemyMotion } from './Enemy';
import { BossArmor } from './effects/BossArmor';
import { BossAura } from './effects/BossAura';
import { BOSS_FACE, bossBodyGeometry, bossCoreGeometry } from './effects/bossParts';
import { SHAPE_STYLES } from './effects/enemyStyles';
import type { EnemyShape } from './themes';

const BOSS_SCALE = 2.4;
const BOSS_HEIGHT = 2.4;
const LABEL_GAP = 2.2;
const KNOCKBACK = 2.6;
const RESET_DISTANCE = 9;
const SPEED_GROWTH = 1.12;
const BOSS_MOTION: EnemyMotion = {
  hoverHeight: BOSS_HEIGHT,
  bob: { speed: 1.4, height: 0.2, ripple: 0.15 },
  facesViewer: true,
};
const SHELL_SHADE = 0.45;
const SHELL_OPACITY = 0.78;
const HIT_FLASH_COLOR = new THREE.Color(0xffffff);
const HIT_FLASH_DURATION = 0.28;
const RECOIL_RATE = 9;
const RECOIL_LEAN = 0.35;

function bossBody(shape: EnemyShape): EnemyBody {
  const style = SHAPE_STYLES[shape];
  return {
    shell: bossBodyGeometry(),
    core: bossCoreGeometry(),
    shellShade: style.shellShade * SHELL_SHADE,
    shellOpacity: SHELL_OPACITY,
    motion: BOSS_MOTION,
    sparkCount: style.sparkCount,
    hasTrail: style.hasTrail,
    face: BOSS_FACE,
  };
}

export class Boss extends Enemy {
  private wordsLeft: number;
  private readonly hitsNeeded: number;
  private readonly armor: BossArmor;
  private readonly aura: BossAura;
  private recoilLeft = 0;

  constructor(
    label: HTMLElement,
    speed: number,
    look: EnemyLook,
    private readonly nextWord: () => string,
    hitsNeeded: number,
  ) {
    super(nextWord(), label, speed, { ...look, scale: BOSS_SCALE }, bossBody(look.shape));
    this.hitsNeeded = hitsNeeded;
    this.wordsLeft = hitsNeeded;
    this.armor = new BossArmor(this.color);
    this.aura = new BossAura(this.color);
    this.rig.add(this.armor.group);
    this.object.add(this.aura.points);
    this.label.classList.add('is-boss');
  }

  get health(): number {
    return this.wordsLeft / this.hitsNeeded;
  }

  get isDefeated(): boolean {
    return this.wordsLeft <= 0;
  }

  override get labelHeight(): number {
    return BOSS_HEIGHT + LABEL_GAP;
  }

  override update(delta: number, elapsed: number, viewer: THREE.Vector3Like): void {
    super.update(delta, elapsed, viewer);
    this.applyRecoil(delta);
    this.armor.update(delta, this.health);
    this.aura.update(delta);
  }

  takeHit(): void {
    this.wordsLeft -= 1;
    this.speed *= SPEED_GROWTH;
    this.recoilLeft += KNOCKBACK;
    this.startFlash(HIT_FLASH_COLOR, HIT_FLASH_DURATION);
    this.armor.shed(this.health);
    this.face?.flare();
    this.startWord();
  }

  reset(): void {
    this.recoilLeft = 0;
    this.refreshOutward();
    this.object.position.copy(this.outward).multiplyScalar(RESET_DISTANCE);
    this.startWord();
  }

  private startWord(): void {
    if (this.isDefeated) return;
    this.setWord(this.nextWord());
  }

  private applyRecoil(delta: number): void {
    const step = this.recoilLeft * (1 - Math.exp(-RECOIL_RATE * delta));
    this.recoilLeft -= step;
    this.object.position.addScaledVector(this.outward, step);
    const lean = Math.min(1, this.recoilLeft / KNOCKBACK) * RECOIL_LEAN;
    this.rig.rotation.set(this.outward.z * lean, 0, -this.outward.x * lean);
  }
}
