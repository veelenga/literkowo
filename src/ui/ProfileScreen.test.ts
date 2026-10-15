import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createProfile, type Profile } from '../profiles/Profile';
import { PROFILES_KEY, ProfileStore } from '../profiles/ProfileStore';
import { removeStorage } from '../storage';
import { ProfileScreen } from './ProfileScreen';

vi.mock('./LivePreview', () => ({
  livePreview: { show: () => undefined, hide: () => undefined, stop: () => undefined },
  outfitOf: () => ({}),
}));

const ACTIVE_KEY = 'literkowo.activeProfile';

function setup(profiles: Profile[] = []) {
  const store = new ProfileStore();
  profiles.forEach((profile) => store.add(profile));
  if (profiles[0]) store.setActive(profiles[0]);
  const actions = { onPlay: vi.fn(), onSettings: vi.fn() };
  const screen = new ProfileScreen(store, actions);
  return { screen, ...actions };
}

describe('ProfileScreen', () => {
  let dispose: (() => void) | undefined;

  beforeAll(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: () => undefined }));
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        disconnect(): void {}
      },
    );
    Element.prototype.scrollIntoView = () => undefined;
  });

  afterEach(() => {
    dispose?.();
    dispose = undefined;
    removeStorage(PROFILES_KEY);
    removeStorage(ACTIVE_KEY);
  });

  function open(profiles: Profile[] = []) {
    const parts = setup(profiles);
    dispose = () => parts.screen.dispose();
    return parts;
  }

  it('opens the settings from the gear next to the language switch', () => {
    const { screen, onSettings } = open();
    const corner = screen.element.querySelector('.profile-corner');
    expect(corner?.querySelector('.language-switch')).not.toBeNull();
    const gear = corner?.querySelector<HTMLButtonElement>('.settings-gear');
    expect(gear?.getAttribute('aria-label')).toBe('Ustawienia');
    gear?.click();
    expect(onSettings).toHaveBeenCalledOnce();
  });

  it('keeps Play as the main button of the selected profile', () => {
    const ola = createProfile('Ola', 'a');
    const { screen, onPlay } = open([ola]);
    screen.element.querySelector<HTMLButtonElement>('.play-panel .button-primary')?.click();
    expect(onPlay).toHaveBeenCalledWith(ola);
  });
});
