import type { ThemeId } from '../../../course/regions';
import { i18n } from '../../../i18n/i18n';
import type { Enemy } from '../../Enemy';
import type { MechanicContext } from '../Mechanic';
import { AttackSchedule } from './AttackSchedule';
import type { BossAttack } from './BossAttack';
import { Darkness } from './Darkness';
import { Earthquake } from './Earthquake';
import { Fog } from './Fog';

type AttackKind = 'darkness' | 'fog' | 'earthquake';

const SIGNATURE_ATTACKS: Record<ThemeId, readonly AttackKind[]> = {
  meadow: [],
  forest: ['darkness'],
  mountains: ['fog'],
  cave: ['earthquake'],
  island: ['darkness', 'fog', 'earthquake'],
};

const TELEGRAPH_SWEEP = { fromMidi: 45, toMidi: 31, seconds: 1.3 };
const STRIKE_IMPACT = 0.85;

export type SignatureContext = Pick<
  MechanicContext,
  'theme' | 'enemies' | 'shakeCamera' | 'particles' | 'sfx' | 'announce' | 'random'
>;

const ATTACK_FACTORIES: Record<AttackKind, (context: SignatureContext) => BossAttack> = {
  darkness: () => new Darkness(),
  fog: (context) => new Fog(context),
  earthquake: (context) => new Earthquake(context),
};

export class SignatureAttacks {
  private readonly attacks: readonly BossAttack[];
  private readonly schedule = new AttackSchedule({
    telegraph: () => this.telegraph(),
    strike: () => this.strike(),
  });
  private turn = 0;

  constructor(private readonly context: SignatureContext) {
    this.attacks = SIGNATURE_ATTACKS[context.theme.id].map((kind) =>
      ATTACK_FACTORIES[kind](context),
    );
  }

  update(delta: number): void {
    if (this.attacks.length === 0) return;
    this.attacks.forEach((attack) => attack.update?.(delta));
    this.schedule.update(delta);
  }

  onSpawn(enemy: Enemy): void {
    this.attacks.forEach((attack) => attack.onSpawn?.(enemy));
  }

  stop(): void {
    this.attacks.forEach((attack) => attack.stop?.());
  }

  private telegraph(): void {
    const { fromMidi, toMidi, seconds } = TELEGRAPH_SWEEP;
    this.context.sfx.sweep(fromMidi, toMidi, seconds);
    this.context.announce(i18n.t.features.bossPhases.telegraph, 'warning');
  }

  private strike(): void {
    const attack = this.attacks[this.turn % this.attacks.length];
    this.turn += 1;
    this.context.sfx.impact(STRIKE_IMPACT);
    attack.strike();
  }
}
