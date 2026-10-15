import { createCompressor, createFilter, type CompressorSettings } from '../synthesis';

const CALM_CUTOFF_HZ = 5500;
const BRIGHT_CUTOFF_HZ = 12000;
const BRIGHTNESS_GLIDE_SECONDS = 0.6;
const COMPRESSOR: CompressorSettings = {
  threshold: -20,
  knee: 10,
  ratio: 3,
  attack: 0.02,
  release: 0.3,
};

export class MusicBus {
  readonly input: BiquadFilterNode;

  constructor(
    private readonly context: BaseAudioContext,
    destination: AudioNode,
  ) {
    this.input = createFilter(context, 'lowpass', CALM_CUTOFF_HZ);
    this.input.connect(createCompressor(context, COMPRESSOR)).connect(destination);
  }

  setBrightness(amount: number): void {
    const cutoff = CALM_CUTOFF_HZ * (BRIGHT_CUTOFF_HZ / CALM_CUTOFF_HZ) ** amount;
    const now = this.context.currentTime;
    const { frequency } = this.input;
    frequency.cancelScheduledValues(now);
    frequency.setValueAtTime(frequency.value, now);
    frequency.exponentialRampToValueAtTime(cutoff, now + BRIGHTNESS_GLIDE_SECONDS);
  }
}
