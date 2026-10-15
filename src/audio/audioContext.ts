import { createCompressor, createGain, type CompressorSettings } from './synthesis';

type UnlockListener = () => void;

export interface AudioOutput {
  context: AudioContext;
  sfx: AudioNode;
  music: AudioNode;
}

const SFX_LEVEL = 0.3;
const MUSIC_LEVEL = 0.18;
const OUTPUT_LIMITER: CompressorSettings = {
  threshold: -1,
  knee: 0,
  ratio: 20,
  attack: 0.001,
  release: 0.1,
};
const RUNNING: AudioContextState = 'running';
const GESTURE_EVENTS = ['pointerdown', 'keydown'] as const;
const GESTURE_OPTIONS: AddEventListenerOptions = { capture: true, passive: true };

const unlockListeners = new Set<UnlockListener>();
let output: AudioOutput | undefined;
let isUnavailable = false;
let isPausedOnPurpose = false;
let areGesturesArmed = false;

export function getAudioOutput(): AudioOutput | undefined {
  if (output || isUnavailable) return output;
  const context = createAudioContext();
  if (!context) {
    isUnavailable = true;
    return undefined;
  }
  output = buildOutput(context);
  context.addEventListener('statechange', () => handleStateChange(context));
  return output;
}

export function peekAudioOutput(): AudioOutput | undefined {
  return output;
}

export function isAudioRunning(): boolean {
  return output?.context.state === RUNNING;
}

export function unlockAudio(): void {
  const audio = getAudioOutput();
  if (audio) wake(audio.context);
}

export function onAudioUnlocked(listener: UnlockListener): void {
  unlockListeners.add(listener);
}

export function setAudioPaused(paused: boolean): void {
  isPausedOnPurpose = paused;
  const context = output?.context;
  if (!context) return;
  if (paused) void context.suspend().catch(() => undefined);
  else wake(context);
}

function createAudioContext(): AudioContext | undefined {
  try {
    return new AudioContext();
  } catch {
    return undefined;
  }
}

function buildOutput(context: AudioContext): AudioOutput {
  const limiter = createCompressor(context, OUTPUT_LIMITER);
  limiter.connect(context.destination);
  const sfx = createGain(context, SFX_LEVEL);
  const music = createGain(context, MUSIC_LEVEL);
  sfx.connect(limiter);
  music.connect(limiter);
  return { context, sfx, music };
}

function wake(context: AudioContext): void {
  if (isPausedOnPurpose || context.state === 'closed') return;
  if (!isRunning(context)) armGestureUnlock();
  void context
    .resume()
    .then(() => {
      if (isRunning(context)) markRunning();
    })
    .catch(() => undefined);
}

function isRunning(context: BaseAudioContext): boolean {
  return context.state === RUNNING;
}

function handleStateChange(context: AudioContext): void {
  if (isRunning(context)) markRunning();
  else wake(context);
}

function markRunning(): void {
  disarmGestureUnlock();
  unlockListeners.forEach((listener) => listener());
}

function armGestureUnlock(): void {
  if (areGesturesArmed || typeof window === 'undefined') return;
  areGesturesArmed = true;
  GESTURE_EVENTS.forEach((type) => window.addEventListener(type, unlockAudio, GESTURE_OPTIONS));
}

function disarmGestureUnlock(): void {
  if (!areGesturesArmed) return;
  areGesturesArmed = false;
  GESTURE_EVENTS.forEach((type) => window.removeEventListener(type, unlockAudio, GESTURE_OPTIONS));
}

armGestureUnlock();
