import type { ChannelSpec } from './Channel';
import type { ModeName } from './harmony';
import type { DrumId, InstrumentId } from './instruments';

export type MusicMood = 'calm' | 'boss';

interface LayerBase {
  channel: ChannelSpec;
  mood?: MusicMood;
  sections?: readonly number[];
}

export interface PadSpec extends LayerBase {
  kind: 'pad';
  wave: OscillatorType;
  octave: number;
  voicing: 'close' | 'open';
  followsChords: boolean;
  cutoff: number;
  sweepDepth: number;
  sweepRate: number;
  detuneCents: number;
  chorus: boolean;
  attack: number;
  tremoloDepth?: number;
  tremoloPerBeat?: number;
}

export interface BedSpec extends LayerBase {
  kind: 'bed';
  filter: BiquadFilterType;
  frequency: number;
  q: number;
  sweepDepth: number;
  sweepRate: number;
  swellDepth: number;
  swellRate: number;
}

export type MotifNotes = 'arpeggio' | 'melody' | 'ostinato';

export interface MotifSpec extends LayerBase {
  kind: 'motif';
  instrument: InstrumentId;
  notes: MotifNotes;
  octave: number;
  grid: number;
  fill: number;
  restChance: number;
  variationChance: number;
  velocity: number;
  span?: number;
  harmonyAbove?: number;
  followsIntensity?: boolean;
}

export interface BassSpec extends LayerBase {
  kind: 'bass';
  instrument: InstrumentId;
  octave: number;
  pattern: string;
  velocity: number;
  restChance: number;
}

export interface DrumSpec extends LayerBase {
  kind: 'drum';
  instrument: DrumId;
  pattern: string;
  velocity: number;
}

export interface SporadicSpec extends LayerBase {
  kind: 'sporadic';
  instrument: InstrumentId;
  octave: number;
  span: number;
  chancePerStep: number;
  velocity: number;
}

export type LayerSpec = PadSpec | BedSpec | MotifSpec | BassSpec | DrumSpec | SporadicSpec;

export interface SpaceSpec {
  reverbSeconds: number;
  damping: number;
  echoBeats: number;
  echoFeedback: number;
  echoTone: number;
}

export interface ThemeSpec {
  tonicMidi: number;
  tempo: number;
  swing: number;
  calmMode: ModeName;
  bossMode: ModeName;
  melodyDegrees?: readonly number[];
  progression: readonly number[];
  barsPerChord: number;
  space: SpaceSpec;
  layers: readonly LayerSpec[];
}

export interface ArrangedLayer {
  spec: LayerSpec;
  seed: number;
}

export interface Arrangement {
  tempo: number;
  swing: number;
  tonicMidi: number;
  mode: ModeName;
  melodyDegrees?: readonly number[];
  progression: readonly number[];
  barsPerChord: number;
  space: SpaceSpec;
  layers: readonly ArrangedLayer[];
}
