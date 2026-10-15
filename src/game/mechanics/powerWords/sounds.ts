import type { Sfx } from '../../../audio/Sfx';
import type { Power } from './powers';

const SUMMON_CHIME = [84, 91, 96] as const;
const SUMMON_SPACING = 0.09;
const SUMMON_DECAY = 0.5;
const FREEZE_SWEEP = { from: 96, to: 74, seconds: 0.7 };
const STORM_SWEEP = { from: 88, to: 50, seconds: 0.4 };
const STORM_IMPACT = 1;
const QUAKE_SWEEP = { from: 45, to: 33, seconds: 0.7 };
const QUAKE_IMPACT = 1;
const SHIELD_CHIME = [67, 74, 79, 86] as const;
const SHIELD_SPACING = 0.07;
const SHIELD_DECAY = 0.8;

type Sweep = typeof FREEZE_SWEEP;

function sweep(sfx: Sfx, { from, to, seconds }: Sweep): void {
  sfx.sweep(from, to, seconds);
}

export const CAST_SOUNDS: Record<Power, (sfx: Sfx) => void> = {
  freeze: (sfx) => {
    sweep(sfx, FREEZE_SWEEP);
    sfx.sparkle();
  },
  storm: (sfx) => {
    sfx.impact(STORM_IMPACT);
    sweep(sfx, STORM_SWEEP);
  },
  quake: (sfx) => {
    sfx.impact(QUAKE_IMPACT);
    sweep(sfx, QUAKE_SWEEP);
  },
  shield: (sfx) => {
    sfx.chimes(SHIELD_CHIME, SHIELD_SPACING, SHIELD_DECAY);
    sfx.sparkle();
  },
};

export function playSummon(sfx: Sfx): void {
  sfx.chimes(SUMMON_CHIME, SUMMON_SPACING, SUMMON_DECAY);
}
