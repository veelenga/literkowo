import { describe, expect, it, vi } from 'vitest';
import { saveWatch } from './saveWatch';

function watch() {
  const onFirstSaved = vi.fn();
  const onFirstUnsaved = vi.fn();
  return { listener: saveWatch({ onFirstSaved, onFirstUnsaved }), onFirstSaved, onFirstUnsaved };
}

describe('saveWatch', () => {
  it('reacts to the first save that reached the device only once', () => {
    const { listener, onFirstSaved, onFirstUnsaved } = watch();
    listener(true);
    listener(true);
    expect(onFirstSaved).toHaveBeenCalledOnce();
    expect(onFirstUnsaved).not.toHaveBeenCalled();
  });

  it('warns once per session when saves stay in memory', () => {
    const { listener, onFirstSaved, onFirstUnsaved } = watch();
    listener(false);
    listener(false);
    listener(true);
    listener(false);
    expect(onFirstUnsaved).toHaveBeenCalledOnce();
    expect(onFirstSaved).toHaveBeenCalledOnce();
  });
});
