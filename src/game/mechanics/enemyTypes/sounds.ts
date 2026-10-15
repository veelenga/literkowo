import type { Sfx } from '../../../audio/Sfx';
import type { EnemyKind } from './kinds';

export type SoundCue =
  | EnemyKind
  | 'jumperPop'
  | 'balloonPop'
  | 'balloonAway'
  | 'bugPop'
  | 'swarmCleared'
  | 'bombDrop'
  | 'bombBlast'
  | 'batTumble'
  | 'batCrash'
  | 'splitterSplit'
  | 'halfPop'
  | 'shieldBreak'
  | 'shieldDown'
  | 'ghostPop'
  | 'chameleonShift'
  | 'chameleonPop'
  | 'bullStamp'
  | 'bullCharge'
  | 'bullKnock'
  | 'bullDown'
  | 'nestHatch'
  | 'nestPopped';

const CHIME_SPACING = 0.07;
const SHORT_DECAY = 0.35;
const LONG_DECAY = 0.6;
const BOMB_IMPACT = 1;
const CRASH_IMPACT = 0.45;
const BLAST_RUMBLE = { from: 45, to: 30, seconds: 0.6 };
const ROCK_IMPACT = 0.3;
const SPLIT_IMPACT = 0.6;
const STEEL_IMPACT = 0.25;
const CLANG_IMPACT = 0.8;
const CLANG_SPACING = 0.03;
const SNORT_IMPACT = 0.3;
const STAMP_IMPACT = 0.15;
const CHARGE_IMPACT = 0.4;
const KNOCK_IMPACT = 0.35;

export const SOUNDS: Readonly<Record<SoundCue, (sfx: Sfx) => void>> = {
  jumper: (sfx) => sfx.chimes([67, 74, 67, 79], CHIME_SPACING, SHORT_DECAY),
  balloon: (sfx) => sfx.sweep(72, 88, 0.45),
  bat: (sfx) => sfx.sweep(62, 50, 0.5),
  swarm: (sfx) => {
    sfx.sweep(80, 86, 0.25);
    sfx.sparkle();
  },
  jumperPop: (sfx) => sfx.chimes([72, 79, 84], CHIME_SPACING, SHORT_DECAY),
  balloonPop: (sfx) => {
    sfx.chimes([79, 84, 88, 91, 96], CHIME_SPACING, LONG_DECAY);
    sfx.sparkle();
  },
  balloonAway: (sfx) => sfx.sweep(84, 96, 0.6),
  bugPop: (sfx) => sfx.sparkle(),
  swarmCleared: (sfx) => sfx.chimes([76, 83, 88], CHIME_SPACING, LONG_DECAY),
  bombDrop: (sfx) => sfx.sweep(88, 55, 1),
  bombBlast: (sfx) => {
    sfx.impact(BOMB_IMPACT);
    sfx.sweep(BLAST_RUMBLE.from, BLAST_RUMBLE.to, BLAST_RUMBLE.seconds);
  },
  batTumble: (sfx) => sfx.sweep(79, 55, 0.5),
  batCrash: (sfx) => sfx.impact(CRASH_IMPACT),
  splitter: (sfx) => {
    sfx.impact(ROCK_IMPACT);
    sfx.sweep(52, 64, 0.4);
  },
  splitterSplit: (sfx) => {
    sfx.impact(SPLIT_IMPACT);
    sfx.chimes([64, 71, 76], CHIME_SPACING, SHORT_DECAY);
  },
  halfPop: (sfx) => sfx.chimes([76, 83], CHIME_SPACING, SHORT_DECAY),
  shield: (sfx) => {
    sfx.impact(STEEL_IMPACT);
    sfx.chimes([60, 67], CHIME_SPACING, SHORT_DECAY);
  },
  shieldBreak: (sfx) => {
    sfx.impact(CLANG_IMPACT);
    sfx.chimes([84, 91, 96], CLANG_SPACING, SHORT_DECAY);
  },
  shieldDown: (sfx) => sfx.chimes([67, 72, 79], CHIME_SPACING, SHORT_DECAY),
  ghost: (sfx) => {
    sfx.sweep(67, 74, 0.7);
    sfx.sweep(74, 62, 0.9);
  },
  chameleon: (sfx) => sfx.chimes([64, 68, 71, 75], CHIME_SPACING, SHORT_DECAY),
  chameleonShift: (sfx) => sfx.sweep(70, 77, 0.2),
  chameleonPop: (sfx) => {
    sfx.chimes([72, 76, 79, 84], CHIME_SPACING, SHORT_DECAY);
    sfx.sparkle();
  },
  bull: (sfx) => {
    sfx.impact(SNORT_IMPACT);
    sfx.sweep(48, 43, 0.5);
  },
  bullStamp: (sfx) => sfx.impact(STAMP_IMPACT),
  bullCharge: (sfx) => {
    sfx.impact(CHARGE_IMPACT);
    sfx.sweep(43, 55, 0.6);
  },
  bullKnock: (sfx) => sfx.impact(KNOCK_IMPACT),
  bullDown: (sfx) => sfx.chimes([55, 62, 67], CHIME_SPACING, LONG_DECAY),
  nest: (sfx) => sfx.chimes([72, 76, 72, 79], CHIME_SPACING, SHORT_DECAY),
  nestHatch: (sfx) => sfx.chimes([84, 88], CHIME_SPACING, SHORT_DECAY),
  nestPopped: (sfx) => {
    sfx.chimes([67, 72, 76, 79, 84], CHIME_SPACING, LONG_DECAY);
    sfx.sparkle();
  },
  ghostPop: (sfx) => {
    sfx.chimes([79, 86, 91], CHIME_SPACING, LONG_DECAY);
    sfx.sparkle();
  },
};
