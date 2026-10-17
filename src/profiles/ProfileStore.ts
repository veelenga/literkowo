import { readStorage, removeStorage, writeStorage } from '../storage';
import type { Profile } from './Profile';
import { parseProfiles, serializeProfiles } from './profileSchema';
import { mergeProfiles } from './progressFile';

export const PROFILES_KEY = 'literkowo.profiles';
export const PROFILES_BACKUP_KEY = 'literkowo.profiles.backup';
const ACTIVE_KEY = 'literkowo.activeProfile';

export interface ProfileStoreOptions {
  readonly onSave?: (persisted: boolean) => void;
}

export class ProfileStore {
  private profiles: Profile[] = this.load();

  constructor(private readonly options: ProfileStoreOptions = {}) {}

  all(): Profile[] {
    return [...this.profiles];
  }

  active(): Profile | undefined {
    const id = readStorage(ACTIVE_KEY);
    return this.profiles.find((profile) => profile.id === id);
  }

  setActive(profile: Profile): void {
    writeStorage(ACTIVE_KEY, profile.id);
  }

  add(profile: Profile): void {
    this.profiles.push(profile);
    this.persist();
  }

  update(profile: Profile): void {
    if (!this.has(profile.id)) return;
    this.profiles = this.profiles.map((existing) =>
      existing.id === profile.id ? profile : existing,
    );
    this.persist();
  }

  merge(imported: readonly Profile[]): void {
    this.profiles = mergeProfiles(this.profiles, imported);
    this.persist();
  }

  remove(id: string): void {
    if (!this.has(id)) return;
    this.profiles = this.profiles.filter((profile) => profile.id !== id);
    if (readStorage(ACTIVE_KEY) === id) removeStorage(ACTIVE_KEY);
    this.persist();
  }

  private has(id: string): boolean {
    return this.profiles.some((profile) => profile.id === id);
  }

  private load(): Profile[] {
    const raw = readStorage(PROFILES_KEY);
    if (raw === null) return [];
    const { profiles, intact } = parseProfiles(raw);
    if (!intact) writeStorage(PROFILES_BACKUP_KEY, raw);
    return profiles;
  }

  private persist(): void {
    const persisted = writeStorage(PROFILES_KEY, serializeProfiles(this.profiles));
    this.options.onSave?.(persisted);
  }
}
