import { getAudioContext, unlockAudio } from './audioContext';
import {
  BUTTERWORTH_Q_DB,
  STOP_MARGIN_SECONDS,
  applyEnvelope,
  getNoiseBuffer,
  midiToFrequency,
  playUntil,
  routeVoice,
} from './synthesis';

const STORAGE_KEY = 'literkowo.sound';
const MASTER_GAIN = 0.3;
const DEFAULT_ATTACK = 0.004;
const BANDPASS_Q = 1;
const SEMITONES_PER_OCTAVE = 12;
const MAJOR_PENTATONIC = [0, 2, 4, 7, 9] as const;

const LIMITER = { threshold: -10, knee: 6, ratio: 8, attack: 0.003, release: 0.15 } as const;

const HIT_BASE_MIDI = 67;
const HIT_MAX_STEP = 12;
const WORD_ARPEGGIO = [72, 76, 79, 84] as const;
const WORD_NOTE_SPACING = 0.05;
const LIFE_LOST_MOTIF = [74, 70, 67] as const;
const LIFE_LOST_SPACING = 0.12;
const FANFARE_PICKUP = [67, 72, 76] as const;
const FANFARE_PICKUP_SPACING = 0.1;
const FANFARE_CHORD = [72, 76, 79, 84] as const;
const FANFARE_CHORD_DELAY = 0.32;
const FAILED_CADENCE = [
  { notes: [62, 65, 69], delay: 0, decay: 0.55 },
  { notes: [57, 60, 64], delay: 0.5, decay: 1.2 },
] as const;

interface ToneSpec {
  frequency: number;
  wave: OscillatorType;
  volume: number;
  decay: number;
  attack?: number;
  delay?: number;
  glideTo?: number;
  glideTime?: number;
  cutoff?: number;
}

interface NoiseSpec {
  filter: BiquadFilterType;
  frequency: number;
  volume: number;
  decay: number;
  attack?: number;
  delay?: number;
  q?: number;
}

type Voice = Omit<ToneSpec, 'frequency'>;

interface SfxBus {
  context: AudioContext;
  input: AudioNode;
}

const HIT_CLICK: NoiseSpec = {
  filter: 'highpass',
  frequency: 4200,
  volume: 0.22,
  attack: 0.001,
  decay: 0.012,
};
const HIT_TONE: Voice = {
  wave: 'triangle',
  volume: 0.42,
  attack: 0.002,
  decay: 0.11,
  cutoff: 5200,
};
const HIT_SHIMMER: Voice = { wave: 'sine', volume: 0.1, attack: 0.002, decay: 0.06 };
const CHIME: Voice = { wave: 'sine', volume: 0.3, attack: 0.003, decay: 0.28 };
const CHIME_OVERTONE: Voice = { wave: 'sine', volume: 0.05, attack: 0.002, decay: 0.12 };
const CHIME_LAST_DECAY = 0.6;
const CHIME_OVERTONE_RATIO = 3;

const MISTAKE_THUD: ToneSpec = {
  frequency: 150,
  glideTo: 70,
  glideTime: 0.1,
  wave: 'sine',
  volume: 0.55,
  decay: 0.16,
};
const MISTAKE_MUFFLE: NoiseSpec = {
  filter: 'lowpass',
  frequency: 500,
  volume: 0.18,
  attack: 0.002,
  decay: 0.05,
};

const LIFE_LOST_NOTE: Voice = { wave: 'triangle', volume: 0.32, decay: 0.26, cutoff: 1800 };
const LIFE_LOST_LAST_DECAY = 0.5;
const LIFE_LOST_THUD: ToneSpec = {
  frequency: 110,
  glideTo: 55,
  glideTime: 0.2,
  wave: 'sine',
  volume: 0.4,
  decay: 0.3,
};

const BOSS_IMPACT: ToneSpec = {
  frequency: 160,
  glideTo: 42,
  glideTime: 0.25,
  wave: 'sine',
  volume: 0.85,
  attack: 0.002,
  decay: 0.34,
};
const BOSS_BODY: ToneSpec = {
  frequency: 110,
  glideTo: 60,
  wave: 'triangle',
  volume: 0.28,
  decay: 0.2,
  cutoff: 900,
};
const BOSS_BURST: NoiseSpec = {
  filter: 'lowpass',
  frequency: 1800,
  volume: 0.45,
  attack: 0.001,
  decay: 0.22,
};
const BOSS_CRACK: NoiseSpec = {
  filter: 'highpass',
  frequency: 5000,
  volume: 0.16,
  attack: 0.001,
  decay: 0.035,
};

const FANFARE_PICKUP_NOTE: Voice = { wave: 'triangle', volume: 0.3, decay: 0.16, cutoff: 3200 };
const FANFARE_BRASS: Voice = {
  wave: 'sawtooth',
  volume: 0.09,
  attack: 0.02,
  decay: 0.9,
  cutoff: 2400,
};
const FANFARE_BODY: Voice = { wave: 'triangle', volume: 0.12, attack: 0.01, decay: 1 };
const CADENCE_VOICE: Omit<Voice, 'decay'> = {
  wave: 'triangle',
  volume: 0.14,
  attack: 0.03,
  cutoff: 1400,
};

export class Sfx {
  private bus: SfxBus | undefined;
  enabled = localStorage.getItem(STORAGE_KEY) !== 'off';

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  }

  unlock(): void {
    unlockAudio();
    this.bus ??= createBus(getAudioContext());
  }

  hit(combo: number): void {
    const frequency = midiToFrequency(
      HIT_BASE_MIDI + pentatonicSemitones(Math.min(combo, HIT_MAX_STEP)),
    );
    this.noise(HIT_CLICK);
    this.tone({ ...HIT_TONE, frequency });
    this.tone({ ...HIT_SHIMMER, frequency: frequency * 2 });
  }

  mistake(): void {
    this.tone(MISTAKE_THUD);
    this.noise(MISTAKE_MUFFLE);
  }

  word(): void {
    const lastIndex = WORD_ARPEGGIO.length - 1;
    WORD_ARPEGGIO.forEach((midi, index) => {
      const decay = index === lastIndex ? CHIME_LAST_DECAY : CHIME.decay;
      this.chime(midi, index * WORD_NOTE_SPACING, decay);
    });
  }

  lifeLost(): void {
    const lastIndex = LIFE_LOST_MOTIF.length - 1;
    LIFE_LOST_MOTIF.forEach((midi, index) => {
      const decay = index === lastIndex ? LIFE_LOST_LAST_DECAY : LIFE_LOST_NOTE.decay;
      this.note(midi, { ...LIFE_LOST_NOTE, decay, delay: index * LIFE_LOST_SPACING });
    });
    this.tone({ ...LIFE_LOST_THUD, delay: lastIndex * LIFE_LOST_SPACING });
  }

  bossHit(): void {
    this.tone(BOSS_IMPACT);
    this.tone(BOSS_BODY);
    this.noise(BOSS_BURST);
    this.noise(BOSS_CRACK);
  }

  levelComplete(): void {
    FANFARE_PICKUP.forEach((midi, index) =>
      this.note(midi, { ...FANFARE_PICKUP_NOTE, delay: index * FANFARE_PICKUP_SPACING }),
    );
    FANFARE_CHORD.forEach((midi) => {
      this.note(midi, { ...FANFARE_BRASS, delay: FANFARE_CHORD_DELAY });
      this.note(midi, { ...FANFARE_BODY, delay: FANFARE_CHORD_DELAY });
    });
  }

  levelFailed(): void {
    FAILED_CADENCE.forEach(({ notes, delay, decay }) =>
      notes.forEach((midi) => this.note(midi, { ...CADENCE_VOICE, delay, decay })),
    );
  }

  private chime(midi: number, delay: number, decay: number): void {
    const frequency = midiToFrequency(midi);
    this.tone({ ...CHIME, frequency, delay, decay });
    this.tone({ ...CHIME_OVERTONE, frequency: frequency * CHIME_OVERTONE_RATIO, delay });
  }

  private note(midi: number, voice: Voice): void {
    this.tone({ ...voice, frequency: midiToFrequency(midi) });
  }

  private tone(spec: ToneSpec): void {
    const bus = this.activeBus();
    if (!bus) return;
    const { context } = bus;
    const start = context.currentTime + (spec.delay ?? 0);
    const oscillator = context.createOscillator();
    oscillator.type = spec.wave;
    oscillator.frequency.setValueAtTime(spec.frequency, start);
    if (spec.glideTo) {
      const glideEnd = start + (spec.glideTime ?? spec.decay);
      oscillator.frequency.exponentialRampToValueAtTime(spec.glideTo, glideEnd);
    }
    const gain = context.createGain();
    const end = applyEnvelope(gain.gain, start, {
      peak: spec.volume,
      attack: spec.attack ?? DEFAULT_ATTACK,
      decay: spec.decay,
    });
    const filters = spec.cutoff ? [createFilter(context, 'lowpass', spec.cutoff)] : [];
    routeVoice(oscillator, [...filters, gain], bus.input);
    playUntil([oscillator], start, end);
  }

  private noise(spec: NoiseSpec): void {
    const bus = this.activeBus();
    if (!bus) return;
    const { context } = bus;
    const start = context.currentTime + (spec.delay ?? 0);
    const source = context.createBufferSource();
    source.buffer = getNoiseBuffer(context);
    const filter = createFilter(context, spec.filter, spec.frequency, spec.q);
    const gain = context.createGain();
    const end = applyEnvelope(gain.gain, start, {
      peak: spec.volume,
      attack: spec.attack ?? DEFAULT_ATTACK,
      decay: spec.decay,
    });
    routeVoice(source, [filter, gain], bus.input);
    source.start(start, Math.random() * (source.buffer.duration - spec.decay));
    source.stop(end + STOP_MARGIN_SECONDS);
  }

  private activeBus(): SfxBus | undefined {
    return this.enabled ? this.bus : undefined;
  }
}

function createBus(context: AudioContext): SfxBus {
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = LIMITER.threshold;
  limiter.knee.value = LIMITER.knee;
  limiter.ratio.value = LIMITER.ratio;
  limiter.attack.value = LIMITER.attack;
  limiter.release.value = LIMITER.release;
  const master = context.createGain();
  master.gain.value = MASTER_GAIN;
  limiter.connect(master).connect(context.destination);
  return { context, input: limiter };
}

function createFilter(
  context: BaseAudioContext,
  type: BiquadFilterType,
  frequency: number,
  q?: number,
): BiquadFilterNode {
  const filter = context.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q ?? (type === 'bandpass' ? BANDPASS_Q : BUTTERWORTH_Q_DB);
  return filter;
}

function pentatonicSemitones(step: number): number {
  const octave = Math.floor(step / MAJOR_PENTATONIC.length);
  return octave * SEMITONES_PER_OCTAVE + MAJOR_PENTATONIC[step % MAJOR_PENTATONIC.length];
}

export const sfx = new Sfx();
