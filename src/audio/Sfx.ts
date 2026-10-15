import { StoredToggle } from './StoredToggle';
import { isAudioRunning, peekAudioOutput, unlockAudio, type AudioOutput } from './audioContext';
import {
  SEMITONES_PER_OCTAVE,
  createCompressor,
  createFilter,
  midiToFrequency,
  playNoise,
  playTone,
  type CompressorSettings,
  type Envelope,
  type FilterSettings,
  type Glide,
  type VoiceTarget,
} from './synthesis';

const STORAGE_KEY = 'literkowo.sound';
const DEFAULT_ATTACK = 0.004;
const MAJOR_PENTATONIC = [0, 2, 4, 7, 9] as const;

const BUS_COMPRESSOR: CompressorSettings = {
  threshold: -10,
  knee: 6,
  ratio: 8,
  attack: 0.003,
  release: 0.15,
};

const HIT_BASE_MIDI = 67;
const HIT_MAX_STEP = 12;
const WORD_ARPEGGIO = [72, 76, 79, 84] as const;
const CALLOUT_BASE_MIDI = 79;
const CALLOUT_STEP_PER_COMBO = 0.2;
const CALLOUT_MAX_STEP = 7;
const CALLOUT_INTERVAL = 7;
const CALLOUT_SPACING = 0.09;
const CALLOUT_DECAY = 0.45;
const FEVER_ARPEGGIO = [72, 76, 79, 84, 88, 91] as const;
const FEVER_SPACING = 0.055;
const FEVER_DECAY = 0.7;
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

interface Loudness {
  volume: number;
  decay: number;
  attack?: number;
  delay?: number;
}

interface ToneSpec extends Loudness {
  frequency: number;
  wave: OscillatorType;
  glide?: Glide;
  cutoff?: number;
}

interface NoiseSpec extends Loudness {
  filter: FilterSettings;
}

type Voice = Omit<ToneSpec, 'frequency'>;

interface SfxBus {
  context: BaseAudioContext;
  input: AudioNode;
}

const HIT_CLICK: NoiseSpec = {
  filter: { type: 'highpass', frequency: 4200 },
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
  glide: { to: 70, seconds: 0.1 },
  wave: 'sine',
  volume: 0.55,
  decay: 0.16,
};
const MISTAKE_MUFFLE: NoiseSpec = {
  filter: { type: 'lowpass', frequency: 500 },
  volume: 0.18,
  attack: 0.002,
  decay: 0.05,
};

const LIFE_LOST_NOTE: Voice = { wave: 'triangle', volume: 0.32, decay: 0.26, cutoff: 1800 };
const LIFE_LOST_LAST_DECAY = 0.5;
const LIFE_LOST_THUD: ToneSpec = {
  frequency: 110,
  glide: { to: 55, seconds: 0.2 },
  wave: 'sine',
  volume: 0.4,
  decay: 0.3,
};

const BOSS_IMPACT: ToneSpec = {
  frequency: 160,
  glide: { to: 42, seconds: 0.25 },
  wave: 'sine',
  volume: 0.85,
  attack: 0.002,
  decay: 0.34,
};
const BOSS_BODY: ToneSpec = {
  frequency: 110,
  glide: { to: 60, seconds: 0.2 },
  wave: 'triangle',
  volume: 0.28,
  decay: 0.2,
  cutoff: 900,
};
const BOSS_BURST: NoiseSpec = {
  filter: { type: 'lowpass', frequency: 1800 },
  volume: 0.45,
  attack: 0.001,
  decay: 0.22,
};
const BOSS_CRACK: NoiseSpec = {
  filter: { type: 'highpass', frequency: 5000 },
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
  private readonly toggle = new StoredToggle(STORAGE_KEY);
  private bus: SfxBus | undefined;

  get enabled(): boolean {
    return this.toggle.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.toggle.set(enabled);
  }

  unlock(): void {
    unlockAudio();
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

  callout(combo: number): void {
    const step = Math.min(CALLOUT_MAX_STEP, Math.round(combo * CALLOUT_STEP_PER_COMBO));
    this.chime(CALLOUT_BASE_MIDI + step, 0, CALLOUT_DECAY);
    this.chime(CALLOUT_BASE_MIDI + step + CALLOUT_INTERVAL, CALLOUT_SPACING, CALLOUT_DECAY);
  }

  fever(): void {
    FEVER_ARPEGGIO.forEach((midi, index) => this.chime(midi, index * FEVER_SPACING, FEVER_DECAY));
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
    const target = this.target(spec.delay);
    if (!target) return;
    const chain = spec.cutoff ? [createFilter(target.context, 'lowpass', spec.cutoff)] : [];
    playTone(target, {
      frequency: spec.frequency,
      wave: spec.wave,
      glide: spec.glide,
      envelope: envelopeOf(spec),
      chain,
    });
  }

  private noise(spec: NoiseSpec): void {
    const target = this.target(spec.delay);
    if (target) playNoise(target, { filter: spec.filter, envelope: envelopeOf(spec) });
  }

  private target(delay = 0): VoiceTarget | undefined {
    const bus = this.activeBus();
    if (!bus) return undefined;
    const { context, input } = bus;
    return { context, destination: input, time: context.currentTime + delay };
  }

  private activeBus(): SfxBus | undefined {
    const output = this.enabled ? peekAudioOutput() : undefined;
    if (!output || !isAudioRunning()) return undefined;
    this.bus ??= createBus(output);
    return this.bus;
  }
}

function createBus({ context, sfx }: AudioOutput): SfxBus {
  const input = createCompressor(context, BUS_COMPRESSOR);
  input.connect(sfx);
  return { context, input };
}

function envelopeOf(spec: Loudness): Envelope {
  return { peak: spec.volume, attack: spec.attack ?? DEFAULT_ATTACK, decay: spec.decay };
}

function pentatonicSemitones(step: number): number {
  const octave = Math.floor(step / MAJOR_PENTATONIC.length);
  return octave * SEMITONES_PER_OCTAVE + MAJOR_PENTATONIC[step % MAJOR_PENTATONIC.length];
}

export const sfx = new Sfx();
