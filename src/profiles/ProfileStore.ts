import { readStorage, removeStorage, writeStorage } from '../storage';
import type { Profile } from './Profile';
import { parseProfiles, serializeProfiles } from './profileSchema';
import { mergeProfiles } from './progressFile';

export const PROFILES_KEY = 'literkowo.profiles';
export const PROFILES_BACKUP_KEY = 'literkowo.profiles.backup';
const ACTIVE_KEY = 'literkowo.activeProfile';
const STORAGE_EVENT = 'storage';

export type StorageListener = (event: Pick<StorageEvent, 'key'>) => void;

export interface StorageEvents {
  addEventListener(type: typeof STORAGE_EVENT, listener: StorageListener): void;
}

export interface ProfileStoreOptions {
  readonly onSave?: (persisted: boolean) => void;
  readonly events?: StorageEvents;
}

type ChangeListener = () => void;

export class ProfileStore {
  private profiles: Profile[] = this.load();
  private readonly listeners = new Set<ChangeListener>();

  constructor(private readonly options: ProfileStoreOptions = {}) {
    const events: StorageEvents = options.events ?? window;
    events.addEventListener(STORAGE_EVENT, ({ key }) => this.onStorage(key));
  }

  all(): Profile[] {
    return [...this.profiles];
  }

  find(id: string): Profile | undefined {
    return this.profiles.find((profile) => profile.id === id);
  }

  active(): Profile | undefined {
    const id = readStorage(ACTIVE_KEY);
    return id === null ? undefined : this.find(id);
  }

  setActive(profile: Profile): void {
    writeStorage(ACTIVE_KEY, profile.id);
  }

  onExternalChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  add(profile: Profile): void {
    this.reload();
    this.persist([...this.profiles, profile]);
  }

  update(profile: Profile): void {
    this.reload();
    if (!this.has(profile.id)) return;
    this.persist(
      this.profiles.map((existing) => (existing.id === profile.id ? profile : existing)),
    );
  }

  merge(imported: readonly Profile[]): void {
    this.reload();
    this.persist(mergeProfiles(this.profiles, imported));
  }

  remove(id: string): void {
    this.reload();
    if (!this.has(id)) return;
    this.persist(this.profiles.filter((profile) => profile.id !== id));
    if (readStorage(ACTIVE_KEY) === id) removeStorage(ACTIVE_KEY);
  }

  private has(id: string): boolean {
    return this.find(id) !== undefined;
  }

  private onStorage(key: string | null): void {
    if (!isProfilesChange(key)) return;
    this.reload();
    this.listeners.forEach((listener) => listener());
  }

  private reload(): void {
    this.profiles = this.load();
  }

  private load(): Profile[] {
    const raw = readStorage(PROFILES_KEY);
    if (raw === null) return [];
    const { profiles, intact } = parseProfiles(raw);
    if (!intact) writeStorage(PROFILES_BACKUP_KEY, raw);
    return profiles;
  }

  private persist(profiles: Profile[]): void {
    this.profiles = profiles;
    const persisted = writeStorage(PROFILES_KEY, serializeProfiles(profiles));
    this.options.onSave?.(persisted);
  }
}

function isProfilesChange(key: string | null): boolean {
  return key === PROFILES_KEY || key === null;
}
