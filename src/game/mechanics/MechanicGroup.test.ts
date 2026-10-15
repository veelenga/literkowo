import { describe, expect, it } from 'vitest';
import { Enemy } from '../Enemy';
import type { Phase } from '../LevelPlan';
import type { Mechanic } from './Mechanic';
import { MechanicGroup } from './MechanicGroup';

const PHASE: Phase = { kind: 'words', count: 3, speed: 1, spawnInterval: 1 };

class RecordingMechanic implements Required<Mechanic> {
  constructor(
    private readonly name: string,
    private readonly log: string[],
  ) {}

  update(delta: number, elapsed: number): void {
    this.record(`update ${delta} ${elapsed}`);
  }

  onSpawn(enemy: Enemy): void {
    this.record(`spawn ${String(enemy === ENEMY)}`);
  }

  onHit(): void {
    this.record('hit');
  }

  onMistake(): void {
    this.record('mistake');
  }

  onWordComplete(enemy: Enemy): void {
    this.record(`word ${String(enemy === ENEMY)}`);
  }

  onEnemyReached(enemy: Enemy): void {
    this.record(`reached ${String(enemy === ENEMY)}`);
  }

  onPhaseChange(phase: Phase): void {
    this.record(`phase ${phase.kind}`);
  }

  dispose(): void {
    this.record('dispose');
  }

  private record(entry: string): void {
    this.log.push(`${this.name} ${entry}`);
  }
}

const ENEMY: Enemy = Object.create(Enemy.prototype);

describe('MechanicGroup', () => {
  it('forwards every hook to each mechanic in registration order', () => {
    const log: string[] = [];
    const group = new MechanicGroup();
    group.register([new RecordingMechanic('a', log), new RecordingMechanic('b', log)]);

    group.onPhaseChange(PHASE);
    group.onSpawn(ENEMY);
    group.update(0.5, 2);
    group.onHit();
    group.onWordComplete(ENEMY);
    group.onMistake();
    group.onEnemyReached(ENEMY);
    group.dispose();

    expect(log).toEqual([
      'a phase words',
      'b phase words',
      'a spawn true',
      'b spawn true',
      'a update 0.5 2',
      'b update 0.5 2',
      'a hit',
      'b hit',
      'a word true',
      'b word true',
      'a mistake',
      'b mistake',
      'a reached true',
      'b reached true',
      'a dispose',
      'b dispose',
    ]);
  });

  it('skips hooks a mechanic does not implement and forgets mechanics once disposed', () => {
    const log: string[] = [];
    const group = new MechanicGroup();
    group.register([{ dispose: () => log.push('minimal dispose') }]);
    group.register([new RecordingMechanic('full', log)]);

    group.onHit();
    group.dispose();
    group.onHit();

    expect(log).toEqual(['full hit', 'minimal dispose', 'full dispose']);
  });
});
