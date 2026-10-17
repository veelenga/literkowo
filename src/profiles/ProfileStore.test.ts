import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { removeStorage } from '../storage';
import { FailingStorage, MemoryStorage } from '../testing/memoryStorage';
import { createProfile } from './Profile';
import {
  PROFILES_BACKUP_KEY,
  PROFILES_KEY,
  ProfileStore,
  type StorageEvents,
  type StorageListener,
} from './ProfileStore';

const CORRUPT = '{"broken": tr';
const OTHER_KEY = 'literkowo.sound';

class OtherTabs implements StorageEvents {
  private readonly listeners: StorageListener[] = [];

  addEventListener(_type: 'storage', listener: StorageListener): void {
    this.listeners.push(listener);
  }

  changed(key: string | null): void {
    this.listeners.forEach((listener) => listener({ key }));
  }
}

describe('ProfileStore', () => {
  let storage: MemoryStorage;
  let otherTabs: OtherTabs;
  const newStore = () => new ProfileStore({ events: otherTabs });

  beforeEach(() => {
    storage = new MemoryStorage();
    otherTabs = new OtherTabs();
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => {
    removeStorage(PROFILES_KEY);
    vi.unstubAllGlobals();
  });

  it('starts empty without stored data', () => {
    expect(newStore().all()).toEqual([]);
    expect(storage.getItem(PROFILES_BACKUP_KEY)).toBeNull();
  });

  it('backs up corrupt data and leaves it untouched until the user changes something', () => {
    storage.setItem(PROFILES_KEY, CORRUPT);
    const store = newStore();
    expect(store.all()).toEqual([]);
    expect(storage.getItem(PROFILES_BACKUP_KEY)).toBe(CORRUPT);
    expect(storage.getItem(PROFILES_KEY)).toBe(CORRUPT);

    const profile = createProfile('Ola', 'a');
    store.add(profile);
    expect(JSON.parse(storage.getItem(PROFILES_KEY) ?? '')).toEqual([profile]);
    expect(storage.getItem(PROFILES_BACKUP_KEY)).toBe(CORRUPT);
  });

  it('backs up a stored value that is not a list', () => {
    storage.setItem(PROFILES_KEY, '{"id":"x"}');
    expect(newStore().all()).toEqual([]);
    expect(storage.getItem(PROFILES_BACKUP_KEY)).toBe('{"id":"x"}');
  });

  it('keeps good profiles from partial data', () => {
    const good = createProfile('Ola', 'b');
    const raw = JSON.stringify([good, 'junk']);
    storage.setItem(PROFILES_KEY, raw);
    expect(newStore().all()).toEqual([good]);
    expect(storage.getItem(PROFILES_BACKUP_KEY)).toBe(raw);
  });

  it('ignores updates for unknown profiles', () => {
    storage.setItem(PROFILES_KEY, CORRUPT);
    newStore().update(createProfile('Ghost', 'a'));
    expect(storage.getItem(PROFILES_KEY)).toBe(CORRUPT);
  });

  it('clears the active profile when it is removed', () => {
    const store = newStore();
    const profile = createProfile('Ola', 'a');
    store.add(profile);
    store.setActive(profile);
    expect(store.active()).toEqual(profile);
    store.remove(profile.id);
    expect(store.active()).toBeUndefined();
    expect(store.all()).toEqual([]);
  });

  it('reports whether each save reached the device', () => {
    const onSave = vi.fn();
    const store = new ProfileStore({ onSave, events: otherTabs });
    const profile = createProfile('Ola', 'a');
    store.add(profile);
    vi.stubGlobal('localStorage', new FailingStorage(storage));
    store.update({ ...profile, coins: 5 });
    expect(onSave.mock.calls).toEqual([[true], [false]]);
    expect(store.all()).toEqual([{ ...profile, coins: 5 }]);
  });

  it('merges imported profiles and saves them', () => {
    const store = newStore();
    const ola = createProfile('Ola', 'a');
    const jan = createProfile('Jan', 'b');
    store.add(ola);
    store.merge([{ ...ola, coins: 40 }, jan]);
    const expected = [{ ...ola, coins: 40 }, jan];
    expect(store.all()).toEqual(expected);
    expect(newStore().all()).toEqual(expected);
  });

  describe('with two tabs', () => {
    it('keeps a profile added in the other tab when saving', () => {
      const first = newStore();
      const second = newStore();
      const ola = createProfile('Ola', 'a');
      const kuba = createProfile('Kuba', 'b');
      first.add(ola);
      second.add(kuba);
      expect(newStore().all()).toEqual([ola, kuba]);
    });

    it('does not revert a profile the other tab saved', () => {
      const ola = createProfile('Ola', 'a');
      const kuba = createProfile('Kuba', 'b');
      const setup = newStore();
      setup.add(ola);
      setup.add(kuba);
      const first = newStore();
      const second = newStore();
      const richOla = { ...ola, coins: 50 };
      const richKuba = { ...kuba, coins: 70 };
      first.update(richOla);
      second.update(richKuba);
      expect(newStore().all()).toEqual([richOla, richKuba]);
    });

    it('does not bring back a profile the other tab removed', () => {
      const ola = createProfile('Ola', 'a');
      const first = newStore();
      first.add(ola);
      const second = newStore();
      first.remove(ola.id);
      second.update({ ...ola, coins: 50 });
      expect(newStore().all()).toEqual([]);
    });

    it('refreshes and tells listeners when the other tab saves', () => {
      const first = newStore();
      const second = newStore();
      const listener = vi.fn();
      first.onExternalChange(listener);
      const ola = createProfile('Ola', 'a');
      second.add(ola);
      otherTabs.changed(PROFILES_KEY);
      expect(first.all()).toEqual([ola]);
      expect(listener).toHaveBeenCalledOnce();
    });

    it('refreshes when the other tab clears the storage', () => {
      const store = newStore();
      store.add(createProfile('Ola', 'a'));
      const listener = vi.fn();
      store.onExternalChange(listener);
      storage.clear();
      otherTabs.changed(null);
      expect(store.all()).toEqual([]);
      expect(listener).toHaveBeenCalledOnce();
    });

    it('ignores changes to other keys and stops after unsubscribing', () => {
      const store = newStore();
      const listener = vi.fn();
      const unsubscribe = store.onExternalChange(listener);
      otherTabs.changed(OTHER_KEY);
      expect(listener).not.toHaveBeenCalled();
      unsubscribe();
      otherTabs.changed(PROFILES_KEY);
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
