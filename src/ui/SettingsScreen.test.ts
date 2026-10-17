import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { music } from '../audio/Music';
import { sfx } from '../audio/Sfx';
import { readQualityChoice } from '../game/quality';
import { i18n } from '../i18n/i18n';
import { createProfile, type Profile } from '../profiles/Profile';
import { removeStorage } from '../storage';
import type { ProgressBackupActions } from './backupControls';
import { ON_SCREEN_KEYBOARD_KEY, readOnScreenKeyboard } from './formFactor';
import { readReducedMotion, REDUCED_MOTION_KEY } from './motionPreference';
import { onWindowKey } from './overlay';
import { SettingsScreen, settingsOverlay } from './SettingsScreen';

const QUALITY_KEY = 'literkowo.quality';

function setup(profile?: Profile, backup?: ProgressBackupActions) {
  const onBack = vi.fn();
  const onDelete = vi.fn();
  const screen = new SettingsScreen({
    onBack,
    profile: profile && { profile, onDelete },
    backup,
  });
  const rows = () => [...screen.element.querySelectorAll<HTMLElement>('.settings-row')];
  const row = (title: string) => {
    const found = rows().find(
      (item) => item.querySelector('.settings-label')?.textContent === title,
    );
    if (!found) throw new Error(`Missing row ${title}`);
    return found;
  };
  const chips = (title: string) => [...row(title).querySelectorAll<HTMLButtonElement>('.chip')];
  const chip = (title: string, label: string) => {
    const found = chips(title).find((item) => item.textContent === label);
    if (!found) throw new Error(`Missing chip ${label}`);
    return found;
  };
  const toggle = (title: string) => {
    const found = row(title).querySelector<HTMLButtonElement>('[role="switch"]');
    if (!found) throw new Error(`Missing switch ${title}`);
    return found;
  };
  const active = (title: string) =>
    chips(title)
      .filter((item) => item.classList.contains('is-active'))
      .map((item) => item.textContent);
  return { screen, onBack, onDelete, rows, row, chips, chip, toggle, active };
}

function pressEscape(): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
}

describe('SettingsScreen', () => {
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
  });

  afterEach(() => {
    dispose?.();
    dispose = undefined;
    [QUALITY_KEY, ON_SCREEN_KEYBOARD_KEY, REDUCED_MOTION_KEY].forEach(removeStorage);
    document.documentElement.removeAttribute('data-reduced-motion');
    sfx.setEnabled(true);
    music.setEnabled(true);
    i18n.set('pl');
    vi.unstubAllGlobals();
  });

  function open(profile?: Profile, backup?: ProgressBackupActions) {
    const parts = setup(profile, backup);
    dispose = () => parts.screen.dispose();
    return parts;
  }

  it('lists every setting under a titled header without coins', () => {
    const { screen, rows } = open();
    expect(screen.element.querySelector('.shop-title')?.textContent).toBe('Ustawienia');
    expect(screen.element.querySelector('.shop-coins')).toBeNull();
    expect(rows().map((item) => item.querySelector('.settings-label')?.textContent)).toEqual([
      'Jakość grafiki',
      'Efekty dźwiękowe',
      'Muzyka',
      'Język gry',
      'Klawiatura na ekranie',
      'Mniej animacji',
    ]);
  });

  it('offers the quality presets with auto active and the next level note', () => {
    const { row, chips, active } = open();
    expect(chips('Jakość grafiki').map((item) => item.textContent)).toEqual([
      'Auto',
      'Wysoka',
      'Średnia',
      'Niska',
    ]);
    expect(active('Jakość grafiki')).toEqual(['Auto']);
    expect(row('Jakość grafiki').querySelector('.settings-hint')?.textContent).toBe(
      'Nowa jakość zadziała od następnego poziomu',
    );
  });

  it('saves the picked quality and moves the highlight', () => {
    const { chip, active } = open();
    const low = chip('Jakość grafiki', 'Niska');
    low.click();
    expect(readQualityChoice()).toBe('low');
    expect(active('Jakość grafiki')).toEqual(['Niska']);
    expect(low.getAttribute('aria-pressed')).toBe('true');
    expect(chip('Jakość grafiki', 'Auto').getAttribute('aria-pressed')).toBe('false');
  });

  it('switches sound effects and music on their own', () => {
    const { toggle } = open();
    const effects = toggle('Efekty dźwiękowe');
    expect(effects.getAttribute('aria-checked')).toBe('true');
    effects.click();
    expect(sfx.enabled).toBe(false);
    expect(music.enabled).toBe(true);
    expect(effects.getAttribute('aria-checked')).toBe('false');
    toggle('Muzyka').click();
    expect(music.enabled).toBe(false);
  });

  it('switches the interface language and redraws in it', () => {
    const { screen, chip } = open();
    chip('Język gry', 'Українська').click();
    expect(i18n.current).toBe('uk');
    expect(screen.element.querySelector('.shop-title')?.textContent).toBe('Налаштування');
    expect(screen.element.querySelector('.chip.is-active')?.textContent).toBe('Авто');
  });

  it('saves the on screen keyboard choice', () => {
    const { chip, active } = open();
    expect(active('Klawiatura na ekranie')).toEqual(['Auto']);
    chip('Klawiatura na ekranie', 'Nigdy').click();
    expect(readOnScreenKeyboard()).toBe('never');
  });

  it('forces reduced motion on', () => {
    const { chip } = open();
    chip('Mniej animacji', 'Zawsze').click();
    expect(readReducedMotion()).toBe('always');
    expect(document.documentElement.hasAttribute('data-reduced-motion')).toBe(true);
  });

  it('deletes the profile it was opened for, after a confirmation', () => {
    const { row, rows, onDelete } = open(createProfile('Ola', 'a'));
    expect(rows().at(-1)?.querySelector('.settings-label')?.textContent).toBe('Profil');
    expect(row('Profil').querySelector('.settings-hint')?.textContent).toBe(
      'Ola. Usunięcie kasuje cały postęp na tym urządzeniu',
    );
    const button = row('Profil').querySelector<HTMLButtonElement>('.delete-profile');
    expect(button?.textContent).toBe('Usuń profil');
    vi.stubGlobal('confirm', () => false);
    button?.click();
    expect(onDelete).not.toHaveBeenCalled();
    vi.stubGlobal('confirm', () => true);
    button?.click();
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('offers a quiet progress backup before the profile row', () => {
    const backup = { onExport: vi.fn(), onImport: vi.fn() };
    const { row, rows } = open(createProfile('Ola', 'a'), backup);
    const labels = rows().map((item) => item.querySelector('.settings-label')?.textContent);
    expect(labels.slice(-2)).toEqual(['Kopia postępu', 'Profil']);
    expect(row('Kopia postępu').querySelector('.settings-hint')?.textContent).toBe(
      'Postęp wszystkich profili w jednym pliku. Profile z pliku zastąpią te same profile tutaj',
    );
    const buttons = [...row('Kopia postępu').querySelectorAll<HTMLButtonElement>('button')];
    expect(buttons.map((button) => button.textContent)).toEqual([
      'Zapisz do pliku',
      'Wczytaj z pliku',
    ]);
    expect(buttons.every((button) => button.classList.contains('button-ghost'))).toBe(true);
    buttons[0]?.click();
    expect(backup.onExport).toHaveBeenCalledOnce();
  });

  it('imports the JSON file picked from the import button', () => {
    const backup = { onExport: vi.fn(), onImport: vi.fn() };
    const { row } = open(undefined, backup);
    const picker = row('Kopia postępu').querySelector<HTMLInputElement>('input[type="file"]');
    if (!picker) throw new Error('Missing file picker');
    expect(picker.hidden).toBe(true);
    expect(picker.accept).toBe('.json,application/json');
    const pick = vi.spyOn(picker, 'click').mockReturnValue();
    row('Kopia postępu').querySelector<HTMLButtonElement>('.backup-import')?.click();
    expect(pick).toHaveBeenCalledOnce();
    const file = new File(['[]'], 'literkowo-2026-10-17.json', { type: 'application/json' });
    Object.defineProperty(picker, 'files', { value: [file], configurable: true });
    picker.dispatchEvent(new Event('change'));
    expect(backup.onImport).toHaveBeenCalledWith(file);
  });

  it('has no progress backup when opened from the pause card', () => {
    const { screen } = open();
    expect(screen.element.querySelector('.backup-actions')).toBeNull();
  });

  it('has no profile row when opened without a profile', () => {
    const { screen } = open();
    expect(screen.element.querySelector('.delete-profile')).toBeNull();
  });

  it('goes back from the back button', () => {
    const { screen, onBack } = open();
    screen.element.querySelector<HTMLButtonElement>('.shop-back')?.click();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('goes back on Escape before a paused level can see the key', () => {
    const level = vi.fn();
    const stopLevel = onWindowKey(level);
    const { onBack } = open();
    pressEscape();
    stopLevel();
    expect(onBack).toHaveBeenCalledOnce();
    expect(level).not.toHaveBeenCalled();
  });

  it('stops listening for Escape once disposed', () => {
    const { screen, onBack } = setup();
    screen.dispose();
    pressEscape();
    expect(onBack).not.toHaveBeenCalled();
  });
});

describe('settingsOverlay', () => {
  it('shows the settings screen on its own layer and releases Escape on dispose', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const onBack = vi.fn();
    const overlay = settingsOverlay({ onBack });
    expect(overlay.element.classList).toContain('settings-layer');
    expect(overlay.element.querySelector('.settings-screen')).not.toBeNull();
    overlay.dispose();
    pressEscape();
    expect(onBack).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
