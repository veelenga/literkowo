import {
  applyEnvelope,
  createFilter,
  createGain,
  disconnectWhenEnded,
  playNoise,
  playTone,
  playUntil,
  routeVoice,
  type Envelope,
  type FilterSettings,
  type VoiceTarget,
} from '../synthesis';

const MAX_FILTER_HZ = 12000;
const PLUCK_FILTER_TAIL_RATIO = 1.5;
const PLUCK_RESONANCE_DB = 1;
const FM_INDEX_FLOOR = 0.05;

export interface Strike extends VoiceTarget {
  velocity: number;
}

export type Instrument = (strike: Strike, frequency: number) => number;
export type Drum = (strike: Strike) => number;

interface Loudness {
  attack: number;
  decay: number;
  gain: number;
}

interface PluckRecipe extends Loudness {
  wave: OscillatorType;
  brightness: number;
}

interface MalletRecipe extends Loudness {
  overtoneRatio: number;
  overtoneLevel: number;
  overtoneDecay: number;
}

interface BellRecipe extends Loudness {
  ratio: number;
  index: number;
  indexDecay: number;
}

interface BassRecipe extends Loudness {
  cutoff: number;
  punch: number;
  punchTime: number;
  harmonicLevel: number;
}

interface GlideRecipe extends Loudness {
  glideTime: number;
}

interface DripRecipe extends GlideRecipe {
  rise: number;
}

interface PitchedDrumRecipe extends GlideRecipe {
  startFrequency: number;
  endFrequency: number;
}

interface NoiseRecipe extends Loudness {
  filter: FilterSettings;
}

function envelopeOf(recipe: Loudness, velocity: number): Envelope {
  return { peak: recipe.gain * velocity, attack: recipe.attack, decay: recipe.decay };
}

function pluck(recipe: PluckRecipe): Instrument {
  return (strike, frequency) => {
    const brightCutoff = Math.min(frequency * recipe.brightness, MAX_FILTER_HZ);
    const filter = createFilter(strike.context, 'lowpass', brightCutoff, PLUCK_RESONANCE_DB);
    filter.frequency.setValueAtTime(brightCutoff, strike.time);
    filter.frequency.exponentialRampToValueAtTime(
      frequency * PLUCK_FILTER_TAIL_RATIO,
      strike.time + recipe.decay,
    );
    return playTone(strike, {
      frequency,
      wave: recipe.wave,
      envelope: envelopeOf(recipe, strike.velocity),
      chain: [filter],
    });
  };
}

function mallet(recipe: MalletRecipe): Instrument {
  return (strike, frequency) => {
    const body = envelopeOf(recipe, strike.velocity);
    const overtone: Envelope = {
      peak: body.peak * recipe.overtoneLevel,
      attack: recipe.attack,
      decay: recipe.overtoneDecay,
    };
    playTone(strike, { frequency: frequency * recipe.overtoneRatio, envelope: overtone });
    return playTone(strike, { frequency, envelope: body });
  };
}

function fmBell(recipe: BellRecipe): Instrument {
  return ({ context, destination, time, velocity }, frequency) => {
    const carrier = context.createOscillator();
    carrier.frequency.value = frequency;
    const modulator = context.createOscillator();
    modulator.frequency.value = frequency * recipe.ratio;
    const peakDepth = frequency * recipe.index;
    const depth = context.createGain();
    depth.gain.setValueAtTime(peakDepth, time);
    depth.gain.exponentialRampToValueAtTime(peakDepth * FM_INDEX_FLOOR, time + recipe.indexDecay);
    modulator.connect(depth).connect(carrier.frequency);
    disconnectWhenEnded(modulator, [depth]);
    const gain = context.createGain();
    const end = applyEnvelope(gain.gain, time, envelopeOf(recipe, velocity));
    routeVoice(carrier, [gain], destination);
    playUntil([carrier, modulator], time, end);
    return end;
  };
}

function bass(recipe: BassRecipe): Instrument {
  return (strike, frequency) => {
    const { context, time } = strike;
    const filter = createFilter(context, 'lowpass', recipe.cutoff);
    const end = playTone(strike, {
      frequency: frequency * recipe.punch,
      glide: { to: frequency, seconds: recipe.punchTime },
      envelope: envelopeOf(recipe, strike.velocity),
      chain: [filter],
    });
    const harmonic = context.createOscillator();
    harmonic.type = 'triangle';
    harmonic.frequency.value = frequency;
    routeVoice(harmonic, [createGain(context, recipe.harmonicLevel)], filter);
    playUntil([harmonic], time, end);
    return end;
  };
}

function glide(strike: Strike, from: number, to: number, recipe: GlideRecipe): number {
  return playTone(strike, {
    frequency: from,
    glide: { to, seconds: recipe.glideTime },
    envelope: envelopeOf(recipe, strike.velocity),
  });
}

function drip(recipe: DripRecipe): Instrument {
  return (strike, frequency) => glide(strike, frequency, frequency * recipe.rise, recipe);
}

function pitchedDrum(recipe: PitchedDrumRecipe): Drum {
  return (strike) => glide(strike, recipe.startFrequency, recipe.endFrequency, recipe);
}

function noiseHit(recipe: NoiseRecipe): Drum {
  return (strike) =>
    playNoise(strike, { filter: recipe.filter, envelope: envelopeOf(recipe, strike.velocity) });
}

export const INSTRUMENTS = {
  pluck: pluck({ wave: 'triangle', attack: 0.004, decay: 0.5, gain: 0.55, brightness: 7 }),
  softLead: pluck({ wave: 'triangle', attack: 0.06, decay: 1.1, gain: 0.42, brightness: 3 }),
  ukulele: pluck({ wave: 'triangle', attack: 0.002, decay: 0.26, gain: 0.5, brightness: 10 }),
  sparkle: pluck({ wave: 'sine', attack: 0.003, decay: 0.28, gain: 0.35, brightness: 4 }),
  ostinato: pluck({ wave: 'sawtooth', attack: 0.003, decay: 0.22, gain: 0.3, brightness: 5 }),
  marimba: mallet({
    attack: 0.002,
    decay: 0.55,
    gain: 0.55,
    overtoneRatio: 4,
    overtoneLevel: 0.3,
    overtoneDecay: 0.07,
  }),
  bell: fmBell({ attack: 0.003, decay: 1.8, gain: 0.28, ratio: 3.5, index: 2.4, indexDecay: 0.8 }),
  glass: fmBell({ attack: 0.01, decay: 2.2, gain: 0.26, ratio: 2, index: 1.2, indexDecay: 1.2 }),
  bass: bass({
    attack: 0.008,
    decay: 0.75,
    gain: 0.6,
    cutoff: 450,
    punch: 1,
    punchTime: 0.01,
    harmonicLevel: 0.35,
  }),
  subBass: bass({
    attack: 0.02,
    decay: 1.3,
    gain: 0.75,
    cutoff: 180,
    punch: 1.6,
    punchTime: 0.08,
    harmonicLevel: 0.12,
  }),
  drip: drip({ attack: 0.002, decay: 0.14, gain: 0.3, glideTime: 0.045, rise: 1.9 }),
} satisfies Record<string, Instrument>;

export const DRUMS = {
  kick: pitchedDrum({
    attack: 0.002,
    decay: 0.36,
    gain: 0.9,
    glideTime: 0.11,
    startFrequency: 115,
    endFrequency: 44,
  }),
  tom: pitchedDrum({
    attack: 0.003,
    decay: 0.42,
    gain: 0.65,
    glideTime: 0.2,
    startFrequency: 165,
    endFrequency: 95,
  }),
  brush: noiseHit({
    filter: { type: 'bandpass', frequency: 5200, q: 0.7 },
    attack: 0.012,
    decay: 0.09,
    gain: 0.35,
  }),
  shaker: noiseHit({
    filter: { type: 'highpass', frequency: 6500 },
    attack: 0.018,
    decay: 0.055,
    gain: 0.3,
  }),
} satisfies Record<string, Drum>;

export type InstrumentId = keyof typeof INSTRUMENTS;
export type DrumId = keyof typeof DRUMS;
