export type BossPhase = 'armour' | 'weakPoint' | 'rage';

const WEAK_POINT_FROM = 0.66;
const RAGE_BELOW = 0.33;

export function phaseFor(health: number): BossPhase {
  if (health < RAGE_BELOW) return 'rage';
  if (health <= WEAK_POINT_FROM) return 'weakPoint';
  return 'armour';
}
