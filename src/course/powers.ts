export const PET_POWER_KINDS = [
  'zap',
  'doubleChest',
  'popBalloon',
  'catchThief',
  'catchGhost',
  'catchBat',
  'catchBomber',
  'freezeBoard',
  'restoreHeart',
  'stopNear',
] as const;

export const HAT_POWER_KINDS = [
  'coins',
  'xp',
  'solidGhosts',
  'bossGuard',
  'longFreeze',
  'defuse',
  'feverSlip',
] as const;

export type PetPowerKind = (typeof PET_POWER_KINDS)[number];
export type HatPowerKind = (typeof HAT_POWER_KINDS)[number];
export type PowerKind = PetPowerKind | HatPowerKind;

export interface ItemPower<Kind extends PowerKind = PowerKind> {
  readonly kind: Kind;
  readonly strength: number;
}

export type PetPower = ItemPower<PetPowerKind>;
export type HatPower = ItemPower<HatPowerKind>;

export type StrengthUnit = 'times' | 'seconds' | 'share' | 'switch';

export const STRENGTH_UNITS: Readonly<Record<PowerKind, StrengthUnit>> = {
  zap: 'times',
  doubleChest: 'times',
  popBalloon: 'times',
  catchThief: 'times',
  catchGhost: 'times',
  catchBat: 'times',
  catchBomber: 'times',
  freezeBoard: 'seconds',
  restoreHeart: 'times',
  stopNear: 'seconds',
  coins: 'share',
  xp: 'share',
  solidGhosts: 'switch',
  bossGuard: 'times',
  longFreeze: 'share',
  defuse: 'switch',
  feverSlip: 'times',
};

export const MAX_TIMES = 3;
export const SWITCH_ON = 1;
export const PERCENT = 100;

export const POWER_COMBOS = {
  zap: 5,
  restoreHeart: 15,
  stopNear: 10,
} as const satisfies Partial<Record<PetPowerKind, number>>;

export function percentOf(power: ItemPower): number {
  return Math.round(power.strength * PERCENT);
}
