const A4_MIDI = 69;
const A4_FREQUENCY = 440;
const NOISE_SECONDS = 4;
const DEFAULT_WAVE: OscillatorType = 'sine';

export const SEMITONES_PER_OCTAVE = 12;
export const HALF = 0.5;
export const SILENCE = 0.0001;
export const BUTTERWORTH_Q_DB = -3.0103;
export const STOP_MARGIN_SECONDS = 0.05;

export interface Envelope {
  peak: number;
  attack: number;
  decay: number;
}

export interface FilterSettings {
  type: BiquadFilterType;
  frequency: number;
  q?: number;
}

export interface CompressorSettings {
  threshold: number;
  knee: number;
  ratio: number;
  attack: number;
  release: number;
}

export interface Glide {
  to: number;
  seconds: number;
}

export interface VoiceTarget {
  context: BaseAudioContext;
  destination: AudioNode;
  time: number;
}

export interface ToneVoice {
  frequency: number;
  envelope: Envelope;
  wave?: OscillatorType;
  glide?: Glide;
  chain?: readonly AudioNode[];
}

export interface NoiseVoice {
  filter: FilterSettings;
  envelope: Envelope;
}

export class NodeGroup {
  private readonly nodes: AudioNode[] = [];

  track<T extends AudioNode>(node: T): T {
    this.nodes.push(node);
    return node;
  }

  dispose(): void {
    this.nodes.forEach((node) => node.disconnect());
    this.nodes.length = 0;
  }
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

export function midiToFrequency(midi: number): number {
  return A4_FREQUENCY * 2 ** ((midi - A4_MIDI) / SEMITONES_PER_OCTAVE);
}

export function getNoiseBuffer(context: BaseAudioContext): AudioBuffer {
  const cached = noiseBuffers.get(context);
  if (cached) return cached;
  const buffer = context.createBuffer(1, context.sampleRate * NOISE_SECONDS, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;
  noiseBuffers.set(context, buffer);
  return buffer;
}

export function createGain(context: BaseAudioContext, value = 1): GainNode {
  const gain = context.createGain();
  gain.gain.value = value;
  return gain;
}

export function createFilter(
  context: BaseAudioContext,
  type: BiquadFilterType,
  frequency: number,
  q = BUTTERWORTH_Q_DB,
): BiquadFilterNode {
  const filter = context.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  return filter;
}

export function createCompressor(
  context: BaseAudioContext,
  settings: CompressorSettings,
): DynamicsCompressorNode {
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = settings.threshold;
  compressor.knee.value = settings.knee;
  compressor.ratio.value = settings.ratio;
  compressor.attack.value = settings.attack;
  compressor.release.value = settings.release;
  return compressor;
}

export function applyEnvelope(param: AudioParam, start: number, envelope: Envelope): number {
  const peakTime = start + envelope.attack;
  const end = peakTime + envelope.decay;
  param.setValueAtTime(SILENCE, start);
  param.linearRampToValueAtTime(Math.max(envelope.peak, SILENCE), peakTime);
  param.exponentialRampToValueAtTime(SILENCE, end);
  return end;
}

export function disconnectWhenEnded(
  source: AudioScheduledSourceNode,
  nodes: readonly AudioNode[],
): void {
  source.onended = () => {
    source.disconnect();
    nodes.forEach((node) => node.disconnect());
  };
}

export function routeVoice(
  source: AudioScheduledSourceNode,
  chain: readonly AudioNode[],
  destination: AudioNode,
): void {
  chain.reduce<AudioNode>((previous, node) => previous.connect(node), source).connect(destination);
  disconnectWhenEnded(source, chain);
}

export function playUntil(
  sources: readonly AudioScheduledSourceNode[],
  start: number,
  end: number,
): void {
  const stopTime = end + STOP_MARGIN_SECONDS;
  sources.forEach((source) => {
    source.start(start);
    source.stop(stopTime);
  });
}

export function playTone(target: VoiceTarget, voice: ToneVoice): number {
  const { context, destination, time } = target;
  const oscillator = context.createOscillator();
  oscillator.type = voice.wave ?? DEFAULT_WAVE;
  oscillator.frequency.setValueAtTime(voice.frequency, time);
  if (voice.glide) {
    oscillator.frequency.exponentialRampToValueAtTime(voice.glide.to, time + voice.glide.seconds);
  }
  const gain = context.createGain();
  const end = applyEnvelope(gain.gain, time, voice.envelope);
  routeVoice(oscillator, [...(voice.chain ?? []), gain], destination);
  playUntil([oscillator], time, end);
  return end;
}

export function playNoise(target: VoiceTarget, voice: NoiseVoice): number {
  const { context, destination, time } = target;
  const source = context.createBufferSource();
  const buffer = getNoiseBuffer(context);
  source.buffer = buffer;
  const { type, frequency, q } = voice.filter;
  const filter = createFilter(context, type, frequency, q);
  const gain = context.createGain();
  const end = applyEnvelope(gain.gain, time, voice.envelope);
  routeVoice(source, [filter, gain], destination);
  source.start(time, Math.random() * Math.max(0, buffer.duration - (end - time)));
  source.stop(end + STOP_MARGIN_SECONDS);
  return end;
}
