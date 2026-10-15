import { describe, expect, it, vi } from 'vitest';
import { PortraitCache, type PortraitRenderer } from './CharacterPortraits';

function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

interface FakeRenderer extends PortraitRenderer {
  rendered: string[];
  disposed: boolean;
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

function setup(options: { failToStart?: boolean } = {}) {
  const frames: Array<() => void> = [];
  const renderers: FakeRenderer[] = [];
  const createRenderer = vi.fn(() => {
    if (options.failToStart) return Promise.reject(new Error('no WebGL'));
    const renderer = fakeRenderer();
    renderers.push(renderer);
    return Promise.resolve<PortraitRenderer>(renderer);
  });
  const cache = new PortraitCache(createRenderer, (callback) => frames.push(callback));
  const nextFrame = async () => {
    frames.shift()?.();
    await settle();
  };
  return { cache, createRenderer, renderers, frames, nextFrame };
}

describe('PortraitCache', () => {
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

  it('disposes the renderer once the queue is empty and starts a new one later', async () => {
    const { cache, createRenderer, renderers, nextFrame } = setup();
    void cache.portraitFor('a');
    await nextFrame();
    expect(renderers[0].disposed).toBe(true);

    void cache.portraitFor('b');
    await nextFrame();
    expect(createRenderer).toHaveBeenCalledTimes(2);
    expect(renderers[1].rendered).toEqual(['b']);
    expect(renderers[1].disposed).toBe(true);
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
