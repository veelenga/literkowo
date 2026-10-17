import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { removeStorage } from '../storage';
import { FailingStorage, MemoryStorage } from '../testing/memoryStorage';
import { createProfile } from './Profile';
import { PROFILES_BACKUP_KEY, PROFILES_KEY, ProfileStore } from './ProfileStore';

const CORRUPT = '{"broken": tr';

describe('ProfileStore', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => {
    removeStorage(PROFILES_KEY);
    vi.unstubAllGlobals();
  });

  it('starts empty without stored data', () => {
    expect(new ProfileStore().all()).toEqual([]);
    expect(storage.getItem(PROFILES_BACKUP_KEY)).toBeNull();
  });

  it('backs up corrupt data and leaves it untouched until the user changes something', () => {
    storage.setItem(PROFILES_KEY, CORRUPT);
    const store = new ProfileStore();
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
    expect(new ProfileStore().all()).toEqual([]);
    expect(storage.getItem(PROFILES_BACKUP_KEY)).toBe('{"id":"x"}');
  });

  it('keeps good profiles from partial data', () => {
    const good = createProfile('Ola', 'b');
    const raw = JSON.stringify([good, 'junk']);
    storage.setItem(PROFILES_KEY, raw);
    expect(new ProfileStore().all()).toEqual([good]);
    expect(storage.getItem(PROFILES_BACKUP_KEY)).toBe(raw);
  });

  it('ignores updates for unknown profiles', () => {
    storage.setItem(PROFILES_KEY, CORRUPT);
    new ProfileStore().update(createProfile('Ghost', 'a'));
    expect(storage.getItem(PROFILES_KEY)).toBe(CORRUPT);
  });

  it('clears the active profile when it is removed', () => {
    const store = new ProfileStore();
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
    const store = new ProfileStore({ onSave });
    const profile = createProfile('Ola', 'a');
    store.add(profile);
    vi.stubGlobal('localStorage', new FailingStorage());
    store.update({ ...profile, coins: 5 });
    expect(onSave.mock.calls).toEqual([[true], [false]]);
    expect(store.all()).toEqual([{ ...profile, coins: 5 }]);
  });
});
