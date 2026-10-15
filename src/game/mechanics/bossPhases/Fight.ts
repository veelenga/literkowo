import type { Boss } from '../../Boss';
import type { Enemy } from '../../Enemy';

export interface Fight {
  readonly boss: Boss;
  update(delta: number): void;
  beforeHit(): void;
  onSpawn(enemy: Enemy): void;
  end(): void;
}
