import { i18n } from '../../../i18n/i18n';
import type { Boss } from '../../Boss';
import type { Enemy } from '../../Enemy';
import type { MechanicContext } from '../Mechanic';
import { Minions } from './Minions';
import { phaseFor, type BossPhase } from './phases';
import { SignatureAttacks } from './SignatureAttacks';
import { WeakPoint } from './WeakPoint';

export const RAGE_SPEED = 1.3;

const PHASE_ACCENTS: Record<BossPhase, string> = {
  armour: '#cbd5e1',
  weakPoint: '#7cf5a8',
  rage: '#ff5a4f',
};

export class BossFight {
  private phase: BossPhase;
  private health: number;
  private readonly announced = new Set<BossPhase>();
  private readonly weakPoint: WeakPoint;
  private readonly minions: Minions;
  private readonly attacks: SignatureAttacks;

  constructor(
    private readonly context: MechanicContext,
    readonly boss: Boss,
  ) {
    this.health = boss.health;
    this.phase = phaseFor(boss.health);
    this.weakPoint = new WeakPoint(context);
    this.minions = new Minions(context);
    this.attacks = new SignatureAttacks(context);
  }

  update(delta: number): void {
    this.weakPoint.update(delta);
    if (this.phase === 'rage') this.minions.update(delta);
    this.attacks.update(delta);
    this.trackHealth();
  }

  beforeHit(): void {
    if (phaseFor(this.healthAfterHit) === 'weakPoint') this.weakPoint.prepareShortWord();
  }

  onSpawn(enemy: Enemy): void {
    this.attacks.onSpawn(enemy);
  }

  end(): void {
    this.weakPoint.close();
    this.attacks.stop();
  }

  private get healthAfterHit(): number {
    return this.boss.health - 1 / this.context.phase.count;
  }

  private trackHealth(): void {
    const { health } = this.boss;
    if (health >= this.health) return;
    this.health = health;
    this.takeDamage(phaseFor(health));
  }

  private takeDamage(phase: BossPhase): void {
    if (phase !== this.phase) this.enter(phase);
    this.announceOnce(phase);
    if (phase === 'weakPoint') this.weakPoint.expose(this.boss);
  }

  private enter(phase: BossPhase): void {
    this.phase = phase;
    if (phase === 'rage') this.boss.setSpeedScale(RAGE_SPEED);
  }

  private announceOnce(phase: BossPhase): void {
    if (this.announced.has(phase)) return;
    this.announced.add(phase);
    const banner = i18n.t.features.bossPhases.banners[phase];
    this.context.announce(banner, 'banner', PHASE_ACCENTS[phase]);
  }
}
