import {
  BUTTERWORTH_Q_DB,
  STOP_MARGIN_SECONDS,
  applyEnvelope,
  disconnectWhenEnded,
  getNoiseBuffer,
  playUntil,
  routeVoice,
  type Envelope,
} from '../synthesis';

const MAX_FILTER_HZ = 12000;
const PLUCK_FILTER_TAIL_RATIO = 1.5;
const FM_INDEX_FLOOR = 0.05;

export interface Strike {
  context: BaseAudioContext;
  destination: AudioNode;
  time: number;
  velocity: number;
}

export type Instrument = (strike: Strike, frequency: number) => number;
export type Drum = (strike: Strike) => number;

interface PluckRecipe {
  wave: OscillatorType;
  attack: number;
  decay: number;
  gain: number;
  brightness: number;
}

interface MalletRecipe {
  attack: number;
  decay: number;
  gain: number;
  overtoneRatio: number;
  overtoneLevel: number;
  overtoneDecay: number;
}

interface BellRecipe {
  attack: number;
  decay: number;
  gain: number;
  ratio: number;
  index: number;
  indexDecay: number;
}

interface BassRecipe {
  attack: number;
  decay: number;
  gain: number;
  cutoff: number;
  punch: number;
  punchTime: number;
  harmonicLevel: number;
}

interface GlideRecipe {
  attack: number;
  decay: number;
  gain: number;
  glideTime: number;
}

interface PitchedDrumRecipe extends GlideRecipe {
  startFrequency: number;
  endFrequency: number;
}

interface NoiseRecipe {
  filter: BiquadFilterType;
  frequency: number;
  q: number;
  attack: number;
  decay: number;
  gain: number;
}

function envelopeOf(
  recipe: { attack: number; decay: number; gain: number },
  velocity: number,
): Envelope {
  return { peak: recipe.gain * velocity, attack: recipe.attack, decay: recipe.decay };
}

function pluck(recipe: PluckRecipe): Instrument {
  return ({ context, destination, time, velocity }, frequency) => {
    const oscillator = context.createOscillator();
    oscillator.type = recipe.wave;
    oscillator.frequency.value = frequency;
    const filter = context.createBiquadFilter();
    filter.frequency.setValueAtTime(Math.min(frequency * recipe.brightness, MAX_FILTER_HZ), time);
    filter.frequency.exponentialRampToValueAtTime(
      frequency * PLUCK_FILTER_TAIL_RATIO,
      time + recipe.decay,
    );
    const gain = context.createGain();
    const end = applyEnvelope(gain.gain, time, envelopeOf(recipe, velocity));
    routeVoice(oscillator, [filter, gain], destination);
    playUntil([oscillator], time, end);
    return end;
  };
}

function sinePartial(strike: Strike, frequency: number, envelope: Envelope): number {
  const { context, destination, time } = strike;
  const oscillator = context.createOscillator();
  oscillator.frequency.value = frequency;
  const gain = context.createGain();
  const end = applyEnvelope(gain.gain, time, envelope);
  routeVoice(oscillator, [gain], destination);
  playUntil([oscillator], time, end);
  return end;
}

function mallet(recipe: MalletRecipe): Instrument {
  return (strike, frequency) => {
    const body = envelopeOf(recipe, strike.velocity);
    const overtone: Envelope = {
      peak: body.peak * recipe.overtoneLevel,
      attack: recipe.attack,
      decay: recipe.overtoneDecay,
    };
    sinePartial(strike, frequency * recipe.overtoneRatio, overtone);
    return sinePartial(strike, frequency, body);
  };
}

function fmBell(recipe: BellRecipe): Instrument {
  return ({ context, destination, time, velocity }, frequency) => {
    const carrier = context.createOscillator();
    carrier.frequency.value = frequency;
    const modulator = context.createOscillator();
    modulator.frequency.value = frequency * recipe.ratio;
    const depth = context.createGain();
    const peakDepth = frequency * recipe.index;
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
  return ({ context, destination, time, velocity }, frequency) => {
    const fundamental = context.createOscillator();
    fundamental.frequency.setValueAtTime(frequency * recipe.punch, time);
    fundamental.frequency.exponentialRampToValueAtTime(frequency, time + recipe.punchTime);
    const harmonic = context.createOscillator();
    harmonic.type = 'triangle';
    harmonic.frequency.value = frequency;
    const harmonicGain = context.createGain();
    harmonicGain.gain.value = recipe.harmonicLevel;
    const filter = context.createBiquadFilter();
    filter.frequency.value = recipe.cutoff;
    filter.Q.value = BUTTERWORTH_Q_DB;
    const gain = context.createGain();
    const end = applyEnvelope(gain.gain, time, envelopeOf(recipe, velocity));
    routeVoice(harmonic, [harmonicGain], filter);
    routeVoice(fundamental, [filter, gain], destination);
    playUntil([fundamental, harmonic], time, end);
    return end;
  };
}

function glide(strike: Strike, from: number, to: number, recipe: GlideRecipe): number {
  const { context, destination, time, velocity } = strike;
  const oscillator = context.createOscillator();
  oscillator.frequency.setValueAtTime(from, time);
  oscillator.frequency.exponentialRampToValueAtTime(to, time + recipe.glideTime);
  const gain = context.createGain();
  const end = applyEnvelope(gain.gain, time, envelopeOf(recipe, velocity));
  routeVoice(oscillator, [gain], destination);
  playUntil([oscillator], time, end);
  return end;
}

function drip(recipe: GlideRecipe & { rise: number }): Instrument {
  return (strike, frequency) => glide(strike, frequency, frequency * recipe.rise, recipe);
}

function pitchedDrum(recipe: PitchedDrumRecipe): Drum {
  return (strike) => glide(strike, recipe.startFrequency, recipe.endFrequency, recipe);
}

function noiseHit(recipe: NoiseRecipe): Drum {
  return ({ context, destination, time, velocity }) => {
    const source = context.createBufferSource();
    source.buffer = getNoiseBuffer(context);
    const filter = context.createBiquadFilter();
    filter.type = recipe.filter;
    filter.frequency.value = recipe.frequency;
    filter.Q.value = recipe.q;
    const gain = context.createGain();
    const end = applyEnvelope(gain.gain, time, envelopeOf(recipe, velocity));
    routeVoice(source, [filter, gain], destination);
    source.start(time, Math.random() * (source.buffer.duration - (end - time)));
    source.stop(end + STOP_MARGIN_SECONDS);
    return end;
  };
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
    filter: 'bandpass',
    frequency: 5200,
    q: 0.7,
    attack: 0.012,
    decay: 0.09,
    gain: 0.35,
  }),
  shaker: noiseHit({
    filter: 'highpass',
    frequency: 6500,
    q: BUTTERWORTH_Q_DB,
    attack: 0.018,
    decay: 0.055,
    gain: 0.3,
  }),
} satisfies Record<string, Drum>;

export type InstrumentId = keyof typeof INSTRUMENTS;
export type DrumId = keyof typeof DRUMS;
