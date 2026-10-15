import { BUTTERWORTH_Q_DB } from '../synthesis';

const MASTER_GAIN = 0.18;
const CALM_CUTOFF_HZ = 5500;
const BRIGHT_CUTOFF_HZ = 12000;
const BRIGHTNESS_GLIDE_SECONDS = 0.6;
const COMPRESSOR = { threshold: -20, knee: 10, ratio: 3, attack: 0.02, release: 0.3 } as const;

export class MusicBus {
  readonly input: BiquadFilterNode;

  constructor(private readonly context: AudioContext) {
    this.input = context.createBiquadFilter();
    this.input.frequency.value = CALM_CUTOFF_HZ;
    this.input.Q.value = BUTTERWORTH_Q_DB;
    const master = context.createGain();
    master.gain.value = MASTER_GAIN;
    this.input.connect(this.createCompressor()).connect(master).connect(context.destination);
  }

  setBrightness(amount: number): void {
    const cutoff = CALM_CUTOFF_HZ * (BRIGHT_CUTOFF_HZ / CALM_CUTOFF_HZ) ** amount;
    const now = this.context.currentTime;
    const { frequency } = this.input;
    frequency.cancelScheduledValues(now);
    frequency.setValueAtTime(frequency.value, now);
    frequency.exponentialRampToValueAtTime(cutoff, now + BRIGHTNESS_GLIDE_SECONDS);
  }

  private createCompressor(): DynamicsCompressorNode {
    const compressor = this.context.createDynamicsCompressor();
    compressor.threshold.value = COMPRESSOR.threshold;
    compressor.knee.value = COMPRESSOR.knee;
    compressor.ratio.value = COMPRESSOR.ratio;
    compressor.attack.value = COMPRESSOR.attack;
    compressor.release.value = COMPRESSOR.release;
    return compressor;
  }
}
