import { Boss } from '../Boss';
import type { Enemy } from '../Enemy';
import { BossFight } from './bossPhases/BossFight';
import type { Fight } from './bossPhases/Fight';
import { MiniBossFight } from './bossPhases/MiniBossFight';
import type { Mechanic, MechanicContext } from './Mechanic';

export class BossPhases implements Mechanic {
  private fight: Fight | undefined;

  constructor(private readonly context: MechanicContext) {}

  update(delta: number): void {
    const boss = this.activeBoss();
    if (this.fight && this.fight.boss !== boss) this.endFight();
    if (!boss) return;
    this.fight ??= this.startFight(boss);
    this.fight.update(delta);
  }

  onSpawn(enemy: Enemy): void {
    this.fight?.onSpawn(enemy);
  }

  onWordComplete(enemy: Enemy): void {
    const { fight } = this;
    if (fight && enemy === fight.boss) fight.beforeHit();
  }

  dispose(): void {
    this.endFight();
  }

  private startFight(boss: Boss): Fight {
    const { context } = this;
    return context.phase.miniBoss ? new MiniBossFight(context, boss) : new BossFight(context, boss);
  }

  private activeBoss(): Boss | undefined {
    const { playing, phase, enemies } = this.context;
    if (!playing || phase.kind !== 'boss') return undefined;
    return enemies.find((enemy): enemy is Boss => enemy instanceof Boss);
  }

  private endFight(): void {
    this.fight?.end();
    this.fight = undefined;
  }
}
