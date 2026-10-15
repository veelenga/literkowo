import type { Enemy } from '../../Enemy';

export interface BossAttack {
  strike(): void;
  update?(delta: number): void;
  onSpawn?(enemy: Enemy): void;
  stop?(): void;
}

export abstract class LingeringAttack implements BossAttack {
  private left = 0;

  constructor(private readonly seconds: number) {}

  get isActive(): boolean {
    return this.left > 0;
  }

  strike(): void {
    this.left = this.seconds;
    this.begin();
  }

  update(delta: number): void {
    if (!this.isActive) return;
    this.left = Math.max(0, this.left - delta);
    if (!this.isActive) this.end();
  }

  stop(): void {
    if (!this.isActive) return;
    this.left = 0;
    this.end();
  }

  protected abstract begin(): void;
  protected abstract end(): void;
}
