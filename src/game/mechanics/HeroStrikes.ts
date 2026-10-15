import * as THREE from 'three';
import { disposeObject } from '../disposal';
import type { Enemy } from '../Enemy';
import { handAhead, handToward, strikeTarget } from './heroStrikes/aim';
import { ChargeGlow } from './heroStrikes/ChargeGlow';
import { GlowBatch } from './heroStrikes/GlowBatch';
import { GlowBursts, type GlowStyle } from './heroStrikes/GlowBursts';
import { LetterBolts, MAX_LETTER_BOLTS } from './heroStrikes/LetterBolts';
import { chargeFor, strikeAccent, strikeColor } from './heroStrikes/palette';
import { MAX_WORD_BOLTS, WordBolts } from './heroStrikes/WordBolts';
import type { Mechanic, MechanicContext } from './Mechanic';

const GLOW_BURSTS = 120;
const WORD_STAGGER = 0.03;
const WORD_SHAKE = { strength: 0.08, seconds: 0.12 };
const WORD_CRACK = 0.25;
const MISTAKE_COLOR = new THREE.Color(0xb3413a);
const MISTAKE_SPARKS = 3;
const MISTAKE_SPARK_SPEED = 1.6;

const MISTAKE_GLOW: GlowStyle = {
  shape: 'glow',
  duration: 0.2,
  startSize: 0.55,
  endSize: 0.25,
  opacity: 0.6,
  whiteness: 0,
  luminance: 0.5,
  drag: 0,
};

const MISTAKE_SPARK: GlowStyle = {
  shape: 'glow',
  duration: 0.25,
  startSize: 0.12,
  endSize: 0.04,
  opacity: 0.7,
  whiteness: 0,
  luminance: 0.5,
  drag: 4,
};

export type HeroStrikesContext = Pick<
  MechanicContext,
  'enemies' | 'player' | 'scene' | 'stats' | 'theme' | 'sfx' | 'shakeCamera'
>;

interface QueuedStrike {
  readonly target: THREE.Vector3;
  fever: boolean;
  wait: number;
  queued: boolean;
}

export class HeroStrikes implements Mechanic {
  private readonly root = new THREE.Group();
  private readonly glowBatch = new GlowBatch(GLOW_BURSTS + MAX_LETTER_BOLTS);
  private readonly glows = new GlowBursts(this.glowBatch, GLOW_BURSTS);
  private readonly letterBolts = new LetterBolts(this.glows, this.glowBatch);
  private readonly wordBolts = new WordBolts(this.glows);
  private readonly charge = new ChargeGlow();
  private readonly queue = Array.from({ length: MAX_WORD_BOLTS }, createQueuedStrike);
  private readonly accent: THREE.Color;
  private readonly color = new THREE.Color();
  private readonly hand = new THREE.Vector3();
  private completedThisKey = 0;

  constructor(private readonly context: HeroStrikesContext) {
    this.accent = strikeAccent(context.theme.id);
    this.root.add(
      this.charge.mesh,
      this.letterBolts.object,
      this.wordBolts.object,
      this.glowBatch.mesh,
    );
    context.scene.add(this.root);
  }

  get letterBoltsInFlight(): number {
    return this.letterBolts.inFlight;
  }

  get wordBoltsInFlight(): number {
    return this.wordBolts.inFlight;
  }

  get chargeBrightness(): number {
    return this.charge.brightness;
  }

  update(delta: number, elapsed: number): void {
    this.releaseQueued(delta);
    this.letterBolts.update(delta);
    this.wordBolts.update(delta);
    this.glows.update(delta);
    this.glowBatch.flush();
    const { combo, fever } = this.context.stats;
    this.charge.follow(this.heroPosition);
    this.charge.update(delta, elapsed, chargeFor(combo), this.currentColor(fever));
  }

  onHit(): void {
    this.completedThisKey = 0;
    const enemy = strikeTarget(this.context.enemies);
    if (!enemy) return;
    const target = enemy.burstPosition;
    const hand = handToward(this.heroPosition, target, this.hand);
    this.letterBolts.fire(hand, target, this.currentColor(this.context.stats.fever));
  }

  onWordComplete(enemy: Pick<Enemy, 'burstPosition'>): void {
    const wait = this.completedThisKey * WORD_STAGGER;
    this.completedThisKey += 1;
    const fever = this.context.stats.fever;
    if (wait <= 0) this.strikeWord(enemy.burstPosition, fever);
    else this.enqueue(enemy.burstPosition, fever, wait);
  }

  onMistake(): void {
    const hand = handAhead(this.context.player.object, this.hand);
    this.glows.emit(hand, MISTAKE_COLOR, MISTAKE_GLOW);
    this.glows.scatter(hand, MISTAKE_COLOR, MISTAKE_SPARK, MISTAKE_SPARKS, MISTAKE_SPARK_SPEED);
    this.charge.dim();
  }

  dispose(): void {
    this.root.removeFromParent();
    disposeObject(this.root);
  }

  private get heroPosition(): THREE.Vector3 {
    return this.context.player.object.position;
  }

  private currentColor(fever: boolean): THREE.Color {
    return strikeColor(this.accent, this.context.stats.combo, fever, this.color);
  }

  private strikeWord(target: THREE.Vector3, fever: boolean): void {
    const hand = handToward(this.heroPosition, target, this.hand);
    this.wordBolts.fire(hand, target, this.currentColor(fever), fever);
    this.context.shakeCamera(WORD_SHAKE.strength, WORD_SHAKE.seconds);
    this.context.sfx.impact(WORD_CRACK);
  }

  private enqueue(target: THREE.Vector3, fever: boolean, wait: number): void {
    const slot = this.queue.find((strike) => !strike.queued);
    if (!slot) return this.strikeWord(target, fever);
    slot.target.copy(target);
    slot.fever = fever;
    slot.wait = wait;
    slot.queued = true;
  }

  private releaseQueued(delta: number): void {
    for (const strike of this.queue) {
      if (!strike.queued) continue;
      strike.wait -= delta;
      if (strike.wait > 0) continue;
      strike.queued = false;
      this.strikeWord(strike.target, strike.fever);
    }
  }
}

function createQueuedStrike(): QueuedStrike {
  return { target: new THREE.Vector3(), fever: false, wait: 0, queued: false };
}
