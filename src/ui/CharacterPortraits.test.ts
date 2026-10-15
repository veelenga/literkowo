import { afterEach, describe, expect, it, vi } from 'vitest';
import { PortraitCache, type PortraitRenderer } from './CharacterPortraits';

const MICROTASK_TICKS = 20;
const IDLE_RELEASE_MS = 1000;
const ROSTER_SIZE = 18;

interface Look {
  readonly character: string;
  readonly hat?: string;
}

interface FakeRenderer extends PortraitRenderer {
  rendered: string[];
  disposed: boolean;
}

async function settle(): Promise<void> {
  for (let tick = 0; tick < MICROTASK_TICKS; tick += 1) await Promise.resolve();
}

function fakeRenderer(): FakeRenderer {
  const renderer: FakeRenderer = {
    rendered: [],
    disposed: false,
    render(character) {
      renderer.rendered.push(character);
      return Promise.resolve(`data:image/png;base64,${character}`);
    },
    dispose() {
      renderer.disposed = true;
    },
  };
  return renderer;
}

function lookKey({ character, hat }: Look): string {
  return `${character}:${hat ?? ''}`;
}

function lookRenderer(rendered: Look[]): PortraitRenderer<Look> {
  return {
    render(look) {
      rendered.push(look);
      return Promise.resolve(`data:image/png;base64,${lookKey(look)}`);
    },
    dispose: () => undefined,
  };
}

function setup(options: { failToStart?: boolean; rosterSize?: number } = {}) {
  const frames: Array<() => void> = [];
  const renderers: FakeRenderer[] = [];
  const createRenderer = vi.fn(() => {
    if (options.failToStart) return Promise.reject(new Error('no WebGL'));
    const renderer = fakeRenderer();
    renderers.push(renderer);
    return Promise.resolve<PortraitRenderer>(renderer);
  });
  const cache = new PortraitCache({
    createRenderer,
    keyOf: (character) => character,
    scheduleFrame: (callback) => frames.push(callback),
    rosterSize: options.rosterSize ?? ROSTER_SIZE,
    idleReleaseMs: IDLE_RELEASE_MS,
  });
  const nextFrame = async () => {
    frames.shift()?.();
    await settle();
  };
  return { cache, createRenderer, renderers, frames, nextFrame };
}

describe('PortraitCache', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for a request before creating the renderer', async () => {
    const { createRenderer, frames } = setup();
    await settle();
    expect(createRenderer).not.toHaveBeenCalled();
    expect(frames).toHaveLength(0);
  });

  it('renders one portrait per animation frame in request order', async () => {
    const { cache, renderers, nextFrame } = setup();
    cache.preload(['a', 'b', 'c']);

    await nextFrame();
    expect(renderers[0].rendered).toEqual(['a']);

    await nextFrame();
    expect(renderers[0].rendered).toEqual(['a', 'b']);

    await nextFrame();
    expect(renderers[0].rendered).toEqual(['a', 'b', 'c']);
  });

  it('renders each character once and serves later requests from memory', async () => {
    const { cache, renderers, nextFrame } = setup();
    const first = cache.portraitFor('d');
    const second = cache.portraitFor('d');
    expect(second).toBe(first);

    await nextFrame();
    await expect(first).resolves.toBe('data:image/png;base64,d');
    expect(cache.cached('d')).toBe('data:image/png;base64,d');
    await expect(cache.portraitFor('d')).resolves.toBe('data:image/png;base64,d');
    expect(renderers.flatMap((renderer) => renderer.rendered)).toEqual(['d']);
  });

  it('renders subjects that share a key once', async () => {
    const frames: Array<() => void> = [];
    const rendered: Look[] = [];
    const cache = new PortraitCache<Look>({
      createRenderer: () => Promise.resolve(lookRenderer(rendered)),
      keyOf: lookKey,
      scheduleFrame: (callback) => frames.push(callback),
      rosterSize: ROSTER_SIZE,
      idleReleaseMs: IDLE_RELEASE_MS,
    });
    const capped = cache.portraitFor({ character: 'a', hat: 'cap' });
    expect(cache.portraitFor({ character: 'a', hat: 'cap' })).toBe(capped);
    const bare = cache.portraitFor({ character: 'a' });

    while (frames.length > 0) {
      frames.shift()?.();
      await settle();
    }

    await expect(capped).resolves.toBe('data:image/png;base64,a:cap');
    await expect(bare).resolves.toBe('data:image/png;base64,a:');
    expect(cache.cached({ character: 'a', hat: 'cap' })).toBe('data:image/png;base64,a:cap');
    expect(rendered).toEqual([{ character: 'a', hat: 'cap' }, { character: 'a' }]);
  });

  it('keeps the renderer for the next request that comes soon after the queue empties', async () => {
    vi.useFakeTimers();
    const { cache, createRenderer, renderers, nextFrame } = setup();
    void cache.portraitFor('a');
    await nextFrame();
    vi.advanceTimersByTime(IDLE_RELEASE_MS / 2);

    void cache.portraitFor('b');
    await nextFrame();

    expect(createRenderer).toHaveBeenCalledTimes(1);
    expect(renderers[0].rendered).toEqual(['a', 'b']);
    expect(renderers[0].disposed).toBe(false);
  });

  it('disposes the renderer once it has been idle for a while', async () => {
    vi.useFakeTimers();
    const { cache, createRenderer, renderers, nextFrame } = setup();
    void cache.portraitFor('a');
    await nextFrame();

    vi.advanceTimersByTime(IDLE_RELEASE_MS);
    await settle();
    expect(renderers[0].disposed).toBe(true);

    void cache.portraitFor('b');
    await nextFrame();
    expect(createRenderer).toHaveBeenCalledTimes(2);
    expect(renderers[1].rendered).toEqual(['b']);
  });

  it('disposes the renderer right away once every character is cached', async () => {
    const { cache, renderers, nextFrame } = setup({ rosterSize: 2 });
    cache.preload(['a', 'b']);
    await nextFrame();
    expect(renderers[0].disposed).toBe(false);

    await nextFrame();
    expect(renderers[0].disposed).toBe(true);
  });

  it('cancels waiting requests and disposes the renderer on release', async () => {
    const { cache, renderers, nextFrame } = setup();
    void cache.portraitFor('a');
    const waiting = cache.portraitFor('b');
    await nextFrame();

    cache.release();

    await expect(waiting).rejects.toThrow('cancelled');
    await settle();
    expect(renderers[0].disposed).toBe(true);
    expect(renderers[0].rendered).toEqual(['a']);
    expect(cache.cached('b')).toBeUndefined();
  });

  it('renders a released character again when it is requested later', async () => {
    const { cache, renderers, nextFrame } = setup();
    void cache.portraitFor('a');
    cache.release();
    await nextFrame();

    const again = cache.portraitFor('a');
    await nextFrame();
    await expect(again).resolves.toBe('data:image/png;base64,a');
    expect(renderers.flatMap((renderer) => renderer.rendered)).toEqual(['a']);
  });

  it('rejects every waiting request when the renderer cannot start', async () => {
    const { cache, createRenderer, nextFrame } = setup({ failToStart: true });
    const first = cache.portraitFor('a');
    const second = cache.portraitFor('b');

    await nextFrame();

    await expect(first).rejects.toThrow('no WebGL');
    await expect(second).rejects.toThrow('no WebGL');
    expect(createRenderer).toHaveBeenCalledTimes(1);
  });
});
