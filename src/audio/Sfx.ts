const STORAGE_KEY = 'literkowo.sound';
const MASTER_GAIN = 0.25;

type Wave = OscillatorType;

export class Sfx {
  private context: AudioContext | undefined;
  private master: GainNode | undefined;
  enabled = localStorage.getItem(STORAGE_KEY) !== 'off';

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  }

  unlock(): void {
    if (this.context) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = MASTER_GAIN;
    this.master.connect(this.context.destination);
  }

  hit(combo: number): void {
    const pitch = 520 + Math.min(combo, 20) * 22;
    this.tone(pitch, 0.08, 'triangle');
  }

  mistake(): void {
    this.tone(140, 0.18, 'sawtooth', 0.6);
  }

  word(): void {
    [660, 880, 1320].forEach((pitch, index) =>
      this.tone(pitch, 0.14, 'triangle', 0.8, index * 0.05),
    );
  }

  lifeLost(): void {
    [330, 262, 196].forEach((pitch, index) => this.tone(pitch, 0.22, 'square', 0.5, index * 0.12));
  }

  bossHit(): void {
    this.tone(90, 0.35, 'sawtooth', 0.9);
    this.tone(180, 0.2, 'square', 0.4, 0.05);
  }

  levelComplete(): void {
    [523, 659, 784, 1047].forEach((pitch, index) =>
      this.tone(pitch, 0.3, 'triangle', 0.8, index * 0.12),
    );
  }

  levelFailed(): void {
    [392, 349, 311, 262].forEach((pitch, index) =>
      this.tone(pitch, 0.35, 'triangle', 0.7, index * 0.18),
    );
  }

  private tone(frequency: number, duration: number, wave: Wave, volume = 1, delay = 0): void {
    if (!this.enabled || !this.context || !this.master) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }
}

export const sfx = new Sfx();
