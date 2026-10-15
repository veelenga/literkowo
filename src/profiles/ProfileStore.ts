import { normalizeProfile, type Profile } from './Profile';

const PROFILES_KEY = 'literkowo.profiles';
const ACTIVE_KEY = 'literkowo.activeProfile';

export class ProfileStore {
  private profiles: Profile[] = this.load();

  all(): Profile[] {
    return [...this.profiles];
  }

  active(): Profile | undefined {
    const id = localStorage.getItem(ACTIVE_KEY);
    return this.profiles.find((profile) => profile.id === id);
  }

  setActive(profile: Profile): void {
    localStorage.setItem(ACTIVE_KEY, profile.id);
  }

  add(profile: Profile): void {
    this.profiles.push(profile);
    this.persist();
  }

  update(profile: Profile): void {
    this.profiles = this.profiles.map((existing) =>
      existing.id === profile.id ? profile : existing,
    );
    this.persist();
  }

  remove(id: string): void {
    this.profiles = this.profiles.filter((profile) => profile.id !== id);
    if (localStorage.getItem(ACTIVE_KEY) === id) localStorage.removeItem(ACTIVE_KEY);
    this.persist();
  }

  private load(): Profile[] {
    try {
      const raw = localStorage.getItem(PROFILES_KEY);
      return raw ? (JSON.parse(raw) as Partial<Profile>[]).map(normalizeProfile) : [];
    } catch {
      return [];
    }
  }

  private persist(): void {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(this.profiles));
  }
}
