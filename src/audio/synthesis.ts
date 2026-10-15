const A4_MIDI = 69;
const A4_FREQUENCY = 440;
const SEMITONES_PER_OCTAVE = 12;
const NOISE_SECONDS = 4;

export const SILENCE = 0.0001;
export const BUTTERWORTH_Q_DB = -3.0103;
export const STOP_MARGIN_SECONDS = 0.05;

export interface Envelope {
  peak: number;
  attack: number;
  decay: number;
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
