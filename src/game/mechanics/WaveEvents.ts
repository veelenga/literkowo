import * as THREE from 'three';
import { allowedKeysFor } from '../../course/regions';
import { i18n } from '../../i18n/i18n';
import { MAX_ENEMIES } from '../board';
import { Boss } from '../Boss';
import type { Enemy } from '../Enemy';
import type { Phase, PhaseKind } from '../RunPlan';
import type { Mechanic, MechanicContext } from './Mechanic';
import { ChestEnemy } from './waveEvents/ChestEnemy';
import type { EventHost } from './waveEvents/EventEnemy';
import {
  EVENT_PLANS,
  WAVE_EVENT_KINDS,
  type EventKit,
  type EventPlan,
  type Random,
  type WaveEventKind,
} from './waveEvents/events';
import { EVENT_SOUNDS, type EventCue } from './waveEvents/sounds';

export const EVENT_WINDOW = { start: 1 / 3, end: 2 / 3 };
export const CHEST_COINS = 15;

const EVENT_PHASE: PhaseKind = 'words';
const LETTER = /\p{L}/u;
const ACCENTS: Readonly<Record<WaveEventKind, string>> = {
  rush: '#7dd3ff',
  meteors: '#ff7a1a',
  chest: '#ffc63a',
};
const TREASURE_COLORS = [0xffd23f, 0xffe58a, 0xffb52a].map((hex) => new THREE.Color(hex));
const TREASURE_SPREAD = 0.6;

interface ActiveEvent {
  readonly plan: EventPlan;
  spawned: number;
  sinceLast: number;
}

export function eventDelay(phase: Phase, random: Random): number {
  const share = THREE.MathUtils.lerp(EVENT_WINDOW.start, EVENT_WINDOW.end, random());
  return phase.count * phase.spawnInterval * share;
}

export class WaveEvents implements Mechanic {
  private readonly kit: EventKit;
  private readonly scatter = new THREE.Vector3();
  private countdown: number | undefined;
  private active: ActiveEvent | undefined;
  private fired = false;

  constructor(
    private readonly context: MechanicContext,
    private readonly random: Random = Math.random,
  ) {
    this.kit = this.createKit();
  }

  get hasFired(): boolean {
    return this.fired;
  }

  update(delta: number): void {
    if (!this.isRunning) return;
    this.tickCountdown(delta);
    this.spawnPieces(delta);
  }

  onPhaseChange(phase: Phase): void {
    this.active = undefined;
    this.countdown =
      phase.kind === EVENT_PHASE && !this.fired ? eventDelay(phase, this.random) : undefined;
  }

  onWordComplete(enemy: Enemy): void {
    if (enemy instanceof ChestEnemy) this.openChest(enemy);
  }

  dispose(): void {
    this.active = undefined;
    this.countdown = undefined;
  }

  private get isRunning(): boolean {
    const { playing, phase, enemies } = this.context;
    return playing && phase.kind === EVENT_PHASE && !enemies.some((enemy) => enemy instanceof Boss);
  }

  private get hasRoom(): boolean {
    return this.context.enemies.length < MAX_ENEMIES;
  }

  private tickCountdown(delta: number): void {
    if (this.countdown === undefined) return;
    this.countdown -= delta;
    if (this.countdown <= 0) this.start(this.pickKind());
  }

  private pickKind(): WaveEventKind {
    return WAVE_EVENT_KINDS[Math.floor(this.random() * WAVE_EVENT_KINDS.length)];
  }

  private start(kind: WaveEventKind): void {
    const plan = EVENT_PLANS[kind];
    this.fired = true;
    this.countdown = undefined;
    this.active = { plan, spawned: 0, sinceLast: plan.spacing };
    this.context.announce(i18n.t.features.waveEvents.banners[kind], 'banner', ACCENTS[kind]);
    this.play(kind);
  }

  private spawnPieces(delta: number): void {
    const event = this.active;
    if (!event) return;
    event.sinceLast += delta;
    if (event.sinceLast < event.plan.spacing || !this.hasRoom) return;
    event.sinceLast = 0;
    event.spawned += 1;
    if (event.spawned >= event.plan.pieces) this.active = undefined;
    this.context.addEnemy(event.plan.create(this.kit), event.plan.radius);
  }

  private openChest(chest: ChestEnemy): void {
    this.context.addCoins(CHEST_COINS);
    for (const color of TREASURE_COLORS) {
      this.scatter.randomDirection().multiplyScalar(TREASURE_SPREAD).add(chest.burstPosition);
      this.context.particles.burst(this.scatter, color);
    }
    this.play('chestOpen');
    this.context.announce(i18n.t.features.waveEvents.treasure, 'callout', ACCENTS.chest);
  }

  private land(position: THREE.Vector3, color: THREE.Color): void {
    this.context.particles.burst(position, color);
    this.play('meteorLand');
  }

  private play(cue: EventCue): void {
    EVENT_SOUNDS[cue](this.context.sfx);
  }

  private createKit(): EventKit {
    const { context } = this;
    const host: EventHost = {
      dismiss: (enemy) => context.removeEnemy(enemy),
      land: (position, color) => this.land(position, color),
    };
    return {
      words: context.words,
      letters: [...allowedKeysFor(context.level, context.language)]
        .filter((char) => LETTER.test(char))
        .join(''),
      get phase() {
        return context.phase;
      },
      look: { shape: context.theme.enemyShape, colors: context.theme.enemyColors },
      enemies: context.enemies,
      host,
      random: this.random,
      createLabel: () => context.createLabel(),
    };
  }
}
