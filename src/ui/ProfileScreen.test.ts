import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createProfile, type Profile } from '../profiles/Profile';
import { PROFILES_KEY, ProfileStore } from '../profiles/ProfileStore';
import { removeStorage } from '../storage';
import { ProfileScreen } from './ProfileScreen';

vi.mock('./LivePreview', () => ({
  livePreview: { show: () => undefined, hide: () => undefined, stop: () => undefined },
  outfitOf: () => ({}),
}));

vi.mock('./menuMotion', () => ({
  hasAmbientMotion: () => false,
}));

const ACTIVE_KEY = 'literkowo.activeProfile';
const NAMES = ['Ola', 'Kuba', 'Zosia'];

function setup(profiles: Profile[] = []) {
  const store = new ProfileStore();
  profiles.forEach((profile) => store.add(profile));
  if (profiles[0]) store.setActive(profiles[0]);
  const actions = {
    onPlay: vi.fn<(profile: Profile) => void>(),
    onSettings: vi.fn(),
    onShop: vi.fn<(profile: Profile) => void>(),
  };
  const screen = new ProfileScreen(store, actions);
  return { store, screen, ...actions };
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
    document.body.replaceChildren();
    removeStorage(PROFILES_KEY);
    removeStorage(ACTIVE_KEY);
  });

  function open(profiles: Profile[] = []) {
    const parts = setup(profiles);
    dispose = () => parts.screen.dispose();
    return parts;
  }

  function openWithKeys() {
    const parts = open(NAMES.map((name) => createProfile(name, 'a')));
    document.body.append(parts.screen.element);
    const press = (key: string, target: EventTarget = window) =>
      target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    const selectedName = () =>
      parts.screen.element.querySelector('.profile-card.is-selected .profile-name')?.textContent;
    const nameField = () =>
      parts.screen.element.querySelector<HTMLInputElement>('.create-panel input');
    const openCreatePanel = () =>
      parts.screen.element.querySelector<HTMLButtonElement>('.profile-card-new')?.click();
    return { ...parts, press, selectedName, nameField, openCreatePanel };
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

  it('opens the shop for the selected profile from a quiet link next to Play', () => {
    const ola = createProfile('Ola', 'a');
    const { screen, onShop, onPlay } = open([ola]);
    const link = screen.element.querySelector<HTMLButtonElement>('.play-panel-main .shop-link');
    expect(link?.textContent).toBe('Sklep');
    expect(link?.classList).toContain('button-ghost');
    expect(link?.nextElementSibling?.classList).toContain('play-button');
    link?.click();
    expect(onShop).toHaveBeenCalledWith(ola);
    expect(onPlay).not.toHaveBeenCalled();
  });

  describe('keys', () => {
    it('picks the next and the previous profile with the arrow keys', () => {
      const { store, press, selectedName } = openWithKeys();
      press('ArrowRight');
      expect(selectedName()).toBe('Kuba');
      expect(store.active()?.name).toBe('Kuba');
      press('ArrowLeft');
      press('ArrowLeft');
      expect(selectedName()).toBe('Zosia');
    });

    it('plays the selected profile with Enter', () => {
      const { onPlay, press } = openWithKeys();
      press('ArrowRight');
      press('Enter');
      expect(onPlay).toHaveBeenCalledOnce();
      expect(onPlay.mock.lastCall?.[0].name).toBe('Kuba');
    });

    it('closes the create panel with Escape, also from the name field', () => {
      const { press, nameField, openCreatePanel } = openWithKeys();
      openCreatePanel();
      const field = nameField();
      expect(field).not.toBeNull();
      press('Escape', field ?? window);
      expect(nameField()).toBeNull();
    });

    it('leaves the arrows and Enter to the name field while it has focus', () => {
      const { onPlay, press, nameField, openCreatePanel } = openWithKeys();
      openCreatePanel();
      const field = nameField() ?? window;
      press('ArrowRight', field);
      press('Enter', field);
      expect(nameField()).not.toBeNull();
      expect(onPlay).not.toHaveBeenCalled();
    });

    it('stops listening once the screen is gone', () => {
      const { screen, onPlay, press } = openWithKeys();
      screen.dispose();
      press('Enter');
      expect(onPlay).not.toHaveBeenCalled();
    });
  });
});
