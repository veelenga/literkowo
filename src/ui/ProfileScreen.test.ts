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
    onPlacement: vi.fn<(profile: Profile) => void>(),
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

  it('keeps the play panel to the name, the word language and Play', () => {
    const ola = createProfile('Ola', 'a', 'en');
    const { screen } = open([ola]);
    const panel = screen.element.querySelector('.play-panel');
    expect(panel?.querySelector('.panel-title')?.textContent).toBe('Ola');
    expect(panel?.querySelector('.play-panel-words')?.textContent).toBe('Słowa po angielsku');
    expect(panel?.querySelectorAll('.button')).toHaveLength(1);
    expect(panel?.querySelector('.shop-link, .placement-link, .button-danger')).toBeNull();
  });

  it('tags every card with the language of its words', () => {
    const { screen } = open([createProfile('Ola', 'a'), createProfile('Kuba', 'b', 'en')]);
    const tags = [...screen.element.querySelectorAll('.profile-card .words-tag')];
    expect(tags.map((tag) => tag.textContent)).toEqual(['Słowa po polsku', 'Słowa po angielsku']);
  });

  it('creates a profile with the chosen word language', () => {
    const { screen, store } = open();
    screen.element.querySelector<HTMLButtonElement>('.profile-card-new')?.click();
    const panel = screen.element.querySelector('.create-panel');
    const chips = [...(panel?.querySelectorAll<HTMLButtonElement>('.settings-chips .chip') ?? [])];
    expect(chips.map((chip) => chip.textContent)).toEqual(['Polski', 'Angielski']);
    chips[1].click();
    const input = panel?.querySelector('input');
    if (input) input.value = 'Ola';
    panel?.querySelector<HTMLButtonElement>('.create-actions .button-primary')?.click();
    expect(store.all()[0]).toMatchObject({ name: 'Ola', wordLanguage: 'en' });
  });

  it('creates a profile and starts learning or the placement test', () => {
    const { screen, store, onPlacement } = open();
    const panel = () => screen.element.querySelector('.create-panel');
    screen.element.querySelector<HTMLButtonElement>('.profile-card-new')?.click();
    const buttons = [
      ...(panel()?.querySelectorAll<HTMLButtonElement>('.create-actions .button') ?? []),
    ];
    expect(buttons.map((button) => button.textContent)).toEqual([
      'Anuluj',
      'Umiem już pisać',
      'Zacznij naukę',
    ]);
    const input = panel()?.querySelector('input');
    if (input) input.value = 'Ola';
    buttons[1].click();
    const [created] = store.all();
    expect(created.name).toBe('Ola');
    expect(onPlacement).toHaveBeenCalledWith(created);
  });

  describe('with another tab', () => {
    const otherTabSaves = (change: (other: ProfileStore) => void) => {
      change(new ProfileStore());
      window.dispatchEvent(new StorageEvent('storage', { key: PROFILES_KEY }));
    };
    const names = (screen: ProfileScreen) =>
      [
        ...screen.element.querySelectorAll('.profile-card:not(.profile-card-new) .profile-name'),
      ].map((name) => name.textContent);

    it('shows a profile created in the other tab', () => {
      const { screen } = open([createProfile('Ola', 'a')]);
      otherTabSaves((other) => other.add(createProfile('Kuba', 'b')));
      expect(names(screen)).toEqual(['Ola', 'Kuba']);
    });

    it('plays the selected profile with the progress saved in the other tab', () => {
      const ola = createProfile('Ola', 'a');
      const { screen, onPlay } = open([ola]);
      otherTabSaves((other) => other.update({ ...ola, coins: 50 }));
      screen.element.querySelector<HTMLButtonElement>('.play-panel .button-primary')?.click();
      expect(onPlay.mock.lastCall?.[0].coins).toBe(50);
    });

    it('drops the play panel of a profile removed in the other tab', () => {
      const ola = createProfile('Ola', 'a');
      const { screen } = open([ola, createProfile('Kuba', 'b')]);
      otherTabSaves((other) => other.remove(ola.id));
      expect(names(screen)).toEqual(['Kuba']);
      expect(screen.element.querySelector('.play-panel')).toBeNull();
    });

    it('keeps the name being typed in the create panel', () => {
      const { nameField, openCreatePanel } = openWithKeys();
      openCreatePanel();
      const field = nameField();
      if (field) field.value = 'Ada';
      otherTabSaves((other) => other.add(createProfile('Kuba', 'b')));
      expect(nameField()).toBe(field);
      expect(field?.value).toBe('Ada');
    });
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
