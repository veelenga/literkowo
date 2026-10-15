import type { Sfx } from '../../../audio/Sfx';
import type { WaveEventKind } from './events';

export type EventCue = WaveEventKind | 'meteorLand' | 'chestOpen';

const CHIME_SPACING = 0.08;
const SHORT_DECAY = 0.35;
const LONG_DECAY = 0.6;
const LANDING_IMPACT = 0.25;

export const EVENT_SOUNDS: Readonly<Record<EventCue, (sfx: Sfx) => void>> = {
  rush: (sfx) => {
    sfx.chimes([60, 64, 67, 72], CHIME_SPACING, SHORT_DECAY);
    sfx.sweep(60, 72, 0.4);
  },
  meteors: (sfx) => sfx.sweep(96, 60, 1.2),
  chest: (sfx) => sfx.chimes([79, 84, 88], CHIME_SPACING, LONG_DECAY),
  meteorLand: (sfx) => sfx.impact(LANDING_IMPACT),
  chestOpen: (sfx) => {
    sfx.chimes([84, 88, 91, 96, 100], CHIME_SPACING / 2, LONG_DECAY);
    sfx.sparkle();
  },
};
