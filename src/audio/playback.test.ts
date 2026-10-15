import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeParam {
  value = 0;

  setValueAtTime(value: number): this {
    this.value = value;
    return this;
  }

  linearRampToValueAtTime(): this {
    return this;
  }

  exponentialRampToValueAtTime(): this {
    return this;
  }

  cancelScheduledValues(): this {
    return this;
  }
}

class FakeNode {
  readonly outputs: unknown[] = [];
  readonly gain = new FakeParam();
  readonly frequency = new FakeParam();
  readonly detune = new FakeParam();
  readonly Q = new FakeParam();
  readonly pan = new FakeParam();
  readonly offset = new FakeParam();
  readonly delayTime = new FakeParam();
  readonly threshold = new FakeParam();
  readonly knee = new FakeParam();
  readonly ratio = new FakeParam();
  readonly attack = new FakeParam();
  readonly release = new FakeParam();
  type = '';
  loop = false;
  buffer: FakeBuffer | null = null;
  onended: (() => void) | null = null;

  constructor(private readonly context: FakeAudioContext) {}

  connect<T>(target: T): T {
    this.outputs.push(target);
    return target;
  }

  disconnect(): void {
    this.outputs.length = 0;
  }

  start(): void {
    this.context.started.push(this);
  }

  stop(): void {}
}

class FakeBuffer {
  readonly duration: number;
  private readonly samples: Float32Array;

  constructor(length: number, sampleRate: number) {
    this.samples = new Float32Array(length);
    this.duration = length / sampleRate;
  }

  getChannelData(): Float32Array {
    return this.samples;
  }
}

class FakeAudioContext extends EventTarget {
  static readonly instances: FakeAudioContext[] = [];
  readonly started: FakeNode[] = [];
  readonly destination = new FakeNode(this);
  readonly sampleRate = 8000;
  currentTime = 0;
  state: AudioContextState = 'suspended';
  resumeCalls = 0;

  constructor() {
    super();
    FakeAudioContext.instances.push(this);
  }

  resume(): Promise<void> {
    this.resumeCalls += 1;
    this.changeState('running');
    return Promise.resolve();
  }

  suspend(): Promise<void> {
    this.changeState('suspended');
    return Promise.resolve();
  }

  createBuffer(_channels: number, length: number, sampleRate: number): FakeBuffer {
    return new FakeBuffer(length, sampleRate);
  }

  createGain = (): FakeNode => new FakeNode(this);
  createBiquadFilter = (): FakeNode => new FakeNode(this);
  createDynamicsCompressor = (): FakeNode => new FakeNode(this);
  createOscillator = (): FakeNode => new FakeNode(this);
  createBufferSource = (): FakeNode => new FakeNode(this);
  createConstantSource = (): FakeNode => new FakeNode(this);
  createDelay = (): FakeNode => new FakeNode(this);
  createChannelMerger = (): FakeNode => new FakeNode(this);
  createStereoPanner = (): FakeNode => new FakeNode(this);

  private changeState(state: AudioContextState): void {
    if (this.state === state) return;
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}

class MemoryStorage {
  private readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }
}

class BrokenAudioContext {
  constructor() {
    throw new Error('Web Audio is disabled');
  }
}

function reachesDestination(node: FakeNode, destination: FakeNode): boolean {
  if (node === destination) return true;
  return node.outputs.some(
    (output) => output instanceof FakeNode && reachesDestination(output, destination),
  );
}

function audibleSources(context: FakeAudioContext): FakeNode[] {
  return context.started.filter((node) => reachesDestination(node, context.destination));
}

function onlyContext(): FakeAudioContext {
  expect(FakeAudioContext.instances).toHaveLength(1);
  return FakeAudioContext.instances[0];
}

async function loadAudio() {
  const { music } = await import('./Music');
  const { sfx } = await import('./Sfx');
  return { music, sfx };
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('audio playback', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    vi.resetModules();
    storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    FakeAudioContext.instances.length = 0;
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts requested music and plays sounds after an explicit unlock', async () => {
    const { music, sfx } = await loadAudio();
    music.play('meadow', 'calm');
    sfx.hit(1);
    expect(FakeAudioContext.instances).toHaveLength(0);

    sfx.unlock();
    const context = onlyContext();
    expect(context.resumeCalls).toBe(1);
    await settle();
    expect(context.state).toBe('running');
    const musicSources = audibleSources(context).length;
    expect(musicSources).toBeGreaterThan(0);

    sfx.hit(1);
    sfx.word();
    expect(audibleSources(context).length).toBeGreaterThan(musicSources);
    music.stop();
  });

  it('creates and resumes the context on the first pointer or key press', async () => {
    const { music } = await loadAudio();
    music.play('cave', 'boss');
    window.dispatchEvent(new Event('keydown'));
    const context = onlyContext();
    await settle();
    expect(context.state).toBe('running');
    expect(audibleSources(context).length).toBeGreaterThan(0);
    music.stop();
  });

  it('skips sounds while paused on purpose and plays them again after resume', async () => {
    const { music, sfx } = await loadAudio();
    sfx.unlock();
    const context = onlyContext();
    await settle();

    music.pause();
    await settle();
    expect(context.state).toBe('suspended');
    window.dispatchEvent(new Event('pointerdown'));
    expect(context.state).toBe('suspended');
    const before = context.started.length;
    sfx.mistake();
    expect(context.started).toHaveLength(before);

    music.resume();
    await settle();
    sfx.mistake();
    expect(context.started.length).toBeGreaterThan(before);
  });

  it('respects the stored sound toggle', async () => {
    const { sfx } = await loadAudio();
    sfx.unlock();
    const context = onlyContext();
    await settle();
    sfx.setEnabled(false);
    sfx.bossHit();
    expect(context.started).toHaveLength(0);
    expect(storage.getItem('literkowo.sound')).toBe('off');
  });

  it('keeps the game running when Web Audio is unavailable', async () => {
    vi.stubGlobal('AudioContext', BrokenAudioContext);
    const { music, sfx } = await loadAudio();
    expect(() => {
      music.play('island', 'calm');
      sfx.unlock();
      sfx.hit(3);
      sfx.levelComplete();
      music.setIntensity(1);
      music.pause();
      music.resume();
      music.stop();
    }).not.toThrow();
  });
});
