import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readChoice, readStorage, removeStorage, writeStorage } from './storage';
import { FailingStorage, MemoryStorage } from './testing/memoryStorage';

const KEY = 'literkowo.test';

describe('storage', () => {
  afterEach(() => {
    removeStorage(KEY);
    vi.unstubAllGlobals();
  });

  describe('with working storage', () => {
    let storage: MemoryStorage;

    beforeEach(() => {
      storage = new MemoryStorage();
      vi.stubGlobal('localStorage', storage);
    });

    it('writes through to local storage', () => {
      writeStorage(KEY, 'value');
      expect(storage.getItem(KEY)).toBe('value');
      expect(readStorage(KEY)).toBe('value');
    });

    it('reads a stored choice and falls back for anything unknown', () => {
      const choices = ['auto', 'always', 'never'] as const;
      expect(readChoice(KEY, choices, 'auto')).toBe('auto');
      writeStorage(KEY, 'never');
      expect(readChoice(KEY, choices, 'auto')).toBe('never');
      writeStorage(KEY, 'sometimes');
      expect(readChoice(KEY, choices, 'auto')).toBe('auto');
    });

    it('removes values', () => {
      writeStorage(KEY, 'value');
      removeStorage(KEY);
      expect(readStorage(KEY)).toBeNull();
    });
  });

  it('keeps values in memory when writing fails', () => {
    vi.stubGlobal('localStorage', new FailingStorage());
    expect(() => writeStorage(KEY, 'value')).not.toThrow();
    expect(readStorage(KEY)).toBe('value');
  });

  it('survives storage that cannot be accessed', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(readStorage(KEY)).toBeNull();
    writeStorage(KEY, 'value');
    expect(readStorage(KEY)).toBe('value');
  });
});
