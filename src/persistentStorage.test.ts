import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestPersistentStorage, type PersistentStorageManager } from './persistentStorage';

function manager(persisted: boolean, granted: boolean) {
  return {
    persisted: vi.fn(() => Promise.resolve(persisted)),
    persist: vi.fn(() => Promise.resolve(granted)),
  } satisfies PersistentStorageManager;
}

describe('requestPersistentStorage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('asks the browser to keep the data', async () => {
    const storage = manager(false, true);
    expect(await requestPersistentStorage(storage)).toBe(true);
    expect(storage.persist).toHaveBeenCalledOnce();
  });

  it('does not ask again when the data is already kept', async () => {
    const storage = manager(true, true);
    expect(await requestPersistentStorage(storage)).toBe(true);
    expect(storage.persist).not.toHaveBeenCalled();
  });

  it('accepts a refusal', async () => {
    expect(await requestPersistentStorage(manager(false, false))).toBe(false);
  });

  it('survives a browser that fails the request', async () => {
    const storage = {
      persisted: () => Promise.resolve(false),
      persist: () => Promise.reject(new DOMException('Denied', 'SecurityError')),
    };
    expect(await requestPersistentStorage(storage)).toBe(false);
  });

  it('survives a browser without the storage manager', async () => {
    vi.stubGlobal('navigator', {});
    expect(await requestPersistentStorage()).toBe(false);
    expect(await requestPersistentStorage(undefined)).toBe(false);
  });
});
