import { describe, expect, it, vi } from 'vitest';
import { HeldClaim } from './HeldClaim';

function setup() {
  const release = vi.fn();
  const claim = vi.fn(() => release);
  return { claim, release, held: new HeldClaim(claim) };
}

describe('HeldClaim', () => {
  it('holds at most one claim', () => {
    const { claim, held } = setup();
    held.hold();
    held.hold();
    expect(claim).toHaveBeenCalledTimes(1);
    expect(held.isHeld).toBe(true);
  });

  it('releases the claim once and can hold again', () => {
    const { claim, release, held } = setup();
    held.hold();
    held.release();
    held.release();
    expect(release).toHaveBeenCalledTimes(1);
    expect(held.isHeld).toBe(false);
    held.hold();
    expect(claim).toHaveBeenCalledTimes(2);
  });
});
