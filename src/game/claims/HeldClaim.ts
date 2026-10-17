import type { Release } from './Claims';

export class HeldClaim {
  private releaseClaim: Release | undefined;

  constructor(private readonly claim: () => Release) {}

  get isHeld(): boolean {
    return this.releaseClaim !== undefined;
  }

  hold(): void {
    this.releaseClaim ??= this.claim();
  }

  release(): void {
    this.releaseClaim?.();
    this.releaseClaim = undefined;
  }
}
