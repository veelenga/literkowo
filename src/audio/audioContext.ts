type UnlockListener = () => void;

let sharedContext: AudioContext | undefined;
const unlockListeners = new Set<UnlockListener>();

export function getAudioContext(): AudioContext {
  sharedContext ??= new AudioContext();
  return sharedContext;
}

export function peekAudioContext(): AudioContext | undefined {
  return sharedContext;
}

export function unlockAudio(): void {
  void getAudioContext()
    .resume()
    .then(() => unlockListeners.forEach((listener) => listener()));
}

export function onAudioUnlocked(listener: UnlockListener): void {
  unlockListeners.add(listener);
}
