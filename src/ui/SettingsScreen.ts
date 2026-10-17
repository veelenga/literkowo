import { music } from '../audio/Music';
import { sfx } from '../audio/Sfx';
import { QUALITY_CHOICES, readQualityChoice, saveQualityChoice } from '../game/quality';
import { format } from '../i18n/format';
import { i18n } from '../i18n/i18n';
import { UI_LANGUAGES } from '../i18n/languages';
import type { Profile } from '../profiles/Profile';
import { backupControls, type ProgressBackupActions } from './backupControls';
import { el } from './dom';
import {
  ON_SCREEN_KEYBOARD_CHOICES,
  readOnScreenKeyboard,
  saveOnScreenKeyboard,
} from './formFactor';
import { REDUCED_MOTION_CHOICES, readReducedMotion, saveReducedMotion } from './motionPreference';
import { claimEscapeKey, createOverlay, type Overlay } from './overlay';
import { choiceChips, switchToggle } from './settingsControls';
import './settings.css';
import { screenHeader } from './shopParts';

export interface ProfileSettings {
  readonly profile: Profile;
  readonly onDelete: () => void;
}

export interface SettingsActions {
  readonly onBack: () => void;
  readonly profile?: ProfileSettings;
  readonly backup?: ProgressBackupActions;
}

export class SettingsScreen {
  readonly element = el('div', { class: 'screen settings-screen' });
  private readonly stopEscape: () => void;

  constructor(private readonly actions: SettingsActions) {
    this.stopEscape = claimEscapeKey(actions.onBack);
    this.render();
  }

  dispose(): void {
    this.stopEscape();
  }

  private render(): void {
    this.element.replaceChildren(
      this.header(),
      el(
        'main',
        { class: 'settings-layout' },
        el(
          'section',
          { class: 'panel settings-panel' },
          qualityRow(),
          soundEffectsRow(),
          musicRow(),
          this.languageRow(),
          keyboardRow(),
          motionRow(),
          this.backupRow(),
          this.profileRow(),
        ),
      ),
    );
  }

  private header(): HTMLElement {
    const copy = i18n.t.features.settings;
    return screenHeader({
      backLabel: copy.back,
      onBack: this.actions.onBack,
      title: copy.title,
      className: 'settings-header',
    });
  }

  private backupRow(): HTMLElement | null {
    return this.actions.backup ? backupRow(this.actions.backup) : null;
  }

  private profileRow(): HTMLElement | null {
    return this.actions.profile ? profileRow(this.actions.profile) : null;
  }

  private languageRow(): HTMLElement {
    const copy = i18n.t.features.settings;
    return settingRow(
      copy.language,
      choiceChips({
        label: copy.language,
        choices: UI_LANGUAGES,
        current: i18n.current,
        names: copy.languages,
        onPick: (language) => {
          i18n.set(language);
          this.render();
        },
      }),
    );
  }
}

function backupRow(actions: ProgressBackupActions): HTMLElement {
  const copy = i18n.t.features.progressBackup;
  return settingRow(copy.title, backupControls(actions), copy.hint);
}

function profileRow(settings: ProfileSettings): HTMLElement {
  const copy = i18n.t.features.settings;
  const remove = () => {
    if (confirm(i18n.t.confirmDelete)) settings.onDelete();
  };
  return settingRow(
    copy.profile,
    el('button', {
      class: 'button button-danger delete-profile',
      type: 'button',
      text: i18n.t.deleteProfile,
      onClick: remove,
    }),
    format(copy.profileHint, { name: settings.profile.name }),
  );
}

export function settingsOverlay(actions: SettingsActions): Overlay {
  const screen = new SettingsScreen(actions);
  return createOverlay(el('div', { class: 'settings-layer' }, screen.element), () =>
    screen.dispose(),
  );
}

function qualityRow(): HTMLElement {
  const copy = i18n.t.features.quality;
  return settingRow(
    copy.title,
    choiceChips({
      label: copy.title,
      choices: QUALITY_CHOICES,
      current: readQualityChoice(),
      names: copy.options,
      onPick: saveQualityChoice,
    }),
    copy.hint,
  );
}

function soundEffectsRow(): HTMLElement {
  const label = i18n.t.features.settings.effects;
  return switchRow(
    label,
    switchToggle({ label, enabled: sfx.enabled, onChange: (on) => sfx.setEnabled(on) }),
  );
}

function musicRow(): HTMLElement {
  const label = i18n.t.features.settings.music;
  return switchRow(
    label,
    switchToggle({ label, enabled: music.enabled, onChange: (on) => music.setEnabled(on) }),
  );
}

function keyboardRow(): HTMLElement {
  const copy = i18n.t.features.settings.keyboard;
  return settingRow(
    copy.title,
    choiceChips({
      label: copy.title,
      choices: ON_SCREEN_KEYBOARD_CHOICES,
      current: readOnScreenKeyboard(),
      names: copy.options,
      onPick: saveOnScreenKeyboard,
    }),
    copy.hint,
  );
}

function motionRow(): HTMLElement {
  const copy = i18n.t.features.settings.motion;
  return settingRow(
    copy.title,
    choiceChips({
      label: copy.title,
      choices: REDUCED_MOTION_CHOICES,
      current: readReducedMotion(),
      names: copy.options,
      onPick: saveReducedMotion,
    }),
    copy.hint,
  );
}

function settingRow(title: string, control: HTMLElement, hint?: string): HTMLElement {
  return el('div', { class: 'settings-row' }, rowText(title, hint), control);
}

function switchRow(title: string, control: HTMLElement): HTMLElement {
  return el('div', { class: 'settings-row is-inline' }, rowText(title), control);
}

function rowText(title: string, hint?: string): HTMLElement {
  return el(
    'div',
    { class: 'settings-text' },
    el('h2', { class: 'settings-label', text: title }),
    hint ? el('p', { class: 'settings-hint', text: hint }) : null,
  );
}
