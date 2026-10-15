import type { Sfx } from '../../../audio/Sfx';

const LIT_SWEEP = { fromMidi: 72, toMidi: 91, seconds: 0.35 };
const TICK_BASE_MIDI = 86;
const TICK_RISE = 10;
const TICK_DECAY = 0.07;
const BLAST_IMPACT = 1;
const BLAST_SWEEP = { fromMidi: 62, toMidi: 30, seconds: 0.8 };
const BLOWBACK_IMPACT = 0.8;
const BLOWBACK_SWEEP = { fromMidi: 50, toMidi: 34, seconds: 0.5 };

type Sweep = typeof LIT_SWEEP;

function sweep(sfx: Sfx, { fromMidi, toMidi, seconds }: Sweep): void {
  sfx.sweep(fromMidi, toMidi, seconds);
}

export function playLit(sfx: Sfx): void {
  sweep(sfx, LIT_SWEEP);
  sfx.sparkle();
}

export function playTick(sfx: Sfx, urgency: number): void {
  sfx.chimes([TICK_BASE_MIDI + Math.round(urgency * TICK_RISE)], 0, TICK_DECAY);
}

export function playBlast(sfx: Sfx): void {
  sfx.impact(BLAST_IMPACT);
  sweep(sfx, BLAST_SWEEP);
}

export function playBlowback(sfx: Sfx): void {
  sfx.impact(BLOWBACK_IMPACT);
  sweep(sfx, BLOWBACK_SWEEP);
}
