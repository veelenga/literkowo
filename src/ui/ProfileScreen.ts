import { i18n } from '../i18n/i18n';
import type { UiLanguage } from '../i18n/translations';
import {
  AVATARS,
  createProfile,
  totalStars,
  type Profile,
  type WordLanguage,
} from '../profiles/Profile';
import type { ProfileStore } from '../profiles/ProfileStore';
import { characterAvatar } from './CharacterAvatar';
import { preloadPortraits, releasePortraits } from './CharacterPortraits';
import { el, present } from './dom';

const MAX_NAME_LENGTH = 16;
const CARD_STAGGER_MS = 70;
const CREATE_PANEL_KEY = 'create';

interface FloatingKey {
  char: string;
  x: number;
  y: number;
  size: number;
  tilt: number;
  delay: number;
  depth: number;
}

const FLOATING_KEYS: FloatingKey[] = [
  { char: 'A', x: 9, y: 16, size: 2.4, tilt: -12, delay: 0, depth: 0 },
  { char: 'Ł', x: 84, y: 12, size: 2.8, tilt: 10, delay: -2, depth: 0 },
  { char: 'K', x: 13, y: 68, size: 2, tilt: 8, delay: -4, depth: 1 },
  { char: 'Ż', x: 88, y: 62, size: 2.2, tilt: -8, delay: -1, depth: 1 },
  { char: 'O', x: 3, y: 42, size: 1.4, tilt: 14, delay: -3, depth: 2 },
  { char: 'Ś', x: 76, y: 86, size: 1.6, tilt: -14, delay: -5, depth: 2 },
  { char: 'W', x: 24, y: 88, size: 1.3, tilt: 6, delay: -6, depth: 2 },
  { char: 'Ę', x: 95, y: 36, size: 1.3, tilt: 12, delay: -2.5, depth: 2 },
];

interface Actions {
  onPlay: (profile: Profile) => void;
}

export class ProfileScreen {
  readonly element = el('div', { class: 'screen profile-screen is-intro' });
  private readonly backdrop = landingBackdrop();
  private selected: Profile | undefined;
  private creating = false;
  private rendered = false;
  private panelKey: string | undefined;

  constructor(
    private readonly store: ProfileStore,
    private readonly actions: Actions,
  ) {
    this.selected = store.active();
    this.render();
  }

  dispose(): void {
    releasePortraits();
  }

  private render(): void {
    const t = i18n.t;
    if (this.rendered) this.element.classList.remove('is-intro');
    this.rendered = true;
    this.element.replaceChildren(
      this.backdrop,
      this.languageSwitch(),
      el(
        'main',
        { class: 'landing' },
        ...present(
          el('h1', { class: 'logo', text: t.appName }),
          el('p', { class: 'tagline', text: t.tagline }),
          el('h2', { class: 'section-title', text: t.whoPlays }),
          el(
            'div',
            { class: 'profile-grid' },
            ...this.store.all().map((profile, index) => this.card(profile, index)),
            this.newCard(this.store.all().length),
          ),
          this.panel(),
        ),
      ),
    );
  }

  private panel(): HTMLElement | null {
    const key = this.creating ? CREATE_PANEL_KEY : this.selected?.id;
    const panel = this.creating
      ? this.createForm()
      : this.selected
        ? this.setupPanel(this.selected)
        : null;
    panel?.classList.toggle('is-fresh', key !== this.panelKey);
    this.panelKey = key;
    return panel;
  }

  private languageSwitch(): HTMLElement {
    const option = (language: UiLanguage, label: string) =>
      el('button', {
        class: i18n.current === language ? 'chip is-active' : 'chip',
        text: label,
        'aria-pressed': String(i18n.current === language),
        onClick: () => {
          i18n.set(language);
          this.render();
        },
      });
    return el(
      'div',
      { class: 'language-switch segmented' },
      option('pl', 'PL'),
      option('uk', 'UA'),
    );
  }

  private card(profile: Profile, index: number): HTMLElement {
    const t = i18n.t;
    const isSelected = !this.creating && this.selected?.id === profile.id;
    return el(
      'button',
      {
        class: isSelected ? 'profile-card is-selected' : 'profile-card',
        style: staggerStyle(index),
        'aria-pressed': String(isSelected),
        onClick: () => this.select(profile),
      },
      el('span', { class: 'avatar-ring' }, characterAvatar(profile.avatar)),
      el('strong', { class: 'profile-name', text: profile.name }),
      el(
        'span',
        { class: 'profile-meta' },
        el(
          'span',
          { class: 'meta-pill', title: t.stars },
          el('span', { class: 'meta-star', text: '★' }),
          String(totalStars(profile)),
        ),
        el('span', { class: 'meta-pill', title: t.bestScore, text: `🏆 ${profile.totalScore}` }),
      ),
    );
  }

  private newCard(index: number): HTMLElement {
    return el(
      'button',
      {
        class: this.creating
          ? 'profile-card profile-card-new is-selected'
          : 'profile-card profile-card-new',
        style: staggerStyle(index),
        onClick: () => {
          this.creating = true;
          this.render();
        },
      },
      el('span', { class: 'avatar-ring avatar-ring-new', text: '+' }),
      el('strong', { class: 'profile-name', text: i18n.t.newProfile }),
    );
  }

  private select(profile: Profile): void {
    this.selected = profile;
    this.creating = false;
    this.store.setActive(profile);
    this.render();
  }

  private createForm(): HTMLElement {
    const t = i18n.t;
    let avatar = AVATARS[0];
    preloadPortraits(AVATARS);
    const input = el('input', {
      class: 'input',
      type: 'text',
      placeholder: t.profileName,
      maxlength: MAX_NAME_LENGTH,
      autocomplete: 'off',
      'data-1p-ignore': 'true',
      'aria-label': t.profileName,
    });
    const avatarButtons = AVATARS.map((candidate) =>
      el(
        'button',
        {
          class: candidate === avatar ? 'avatar-option is-active' : 'avatar-option',
          'aria-pressed': String(candidate === avatar),
          onClick: (event) => {
            avatar = candidate;
            avatarButtons.forEach((button) => {
              const isActive = button === event.currentTarget;
              button.classList.toggle('is-active', isActive);
              button.setAttribute('aria-pressed', String(isActive));
            });
          },
        },
        characterAvatar(candidate),
      ),
    );
    const submit = () => {
      const name = input.value.trim();
      if (!name) return input.focus();
      const profile = createProfile(name, avatar);
      this.store.add(profile);
      this.select(profile);
    };
    input.addEventListener('keydown', (event) => event.key === 'Enter' && submit());
    queueMicrotask(() => input.focus());
    return el(
      'section',
      { class: 'panel profile-panel' },
      el('h3', { class: 'panel-title', text: t.newProfile }),
      input,
      el('p', { class: 'field-label', text: t.chooseAvatar }),
      el('div', { class: 'avatar-options' }, ...avatarButtons),
      el(
        'div',
        { class: 'actions actions-end' },
        el('button', {
          class: 'button button-ghost',
          text: t.cancel,
          onClick: () => {
            this.creating = false;
            this.render();
          },
        }),
        el('button', { class: 'button button-primary', text: t.create, onClick: submit }),
      ),
    );
  }

  private setupPanel(profile: Profile): HTMLElement {
    const t = i18n.t;
    return el(
      'section',
      { class: 'panel profile-panel' },
      el(
        'div',
        { class: 'panel-head' },
        el('span', { class: 'avatar-ring avatar-ring-small' }, characterAvatar(profile.avatar)),
        el('h3', { class: 'panel-title', text: profile.name }),
      ),
      el('p', { class: 'field-label', text: t.wordLanguage }),
      el(
        'div',
        { class: 'segmented segmented-wide' },
        this.languageChip(profile, 'pl', t.polish),
        this.languageChip(profile, 'en', t.english),
      ),
      el(
        'div',
        { class: 'actions actions-split' },
        el('button', {
          class: 'button button-danger',
          text: t.deleteProfile,
          onClick: () => this.remove(profile),
        }),
        el('button', {
          class: 'button button-primary button-large',
          text: `▶ ${t.play}`,
          onClick: () => this.actions.onPlay(profile),
        }),
      ),
    );
  }

  private languageChip(profile: Profile, language: WordLanguage, label: string): HTMLElement {
    return el('button', {
      class: profile.wordLanguage === language ? 'chip is-active' : 'chip',
      text: label,
      'aria-pressed': String(profile.wordLanguage === language),
      onClick: () => {
        profile.wordLanguage = language;
        this.store.update(profile);
        this.render();
      },
    });
  }

  private remove(profile: Profile): void {
    if (!confirm(i18n.t.confirmDelete)) return;
    this.store.remove(profile.id);
    this.selected = undefined;
    this.render();
  }
}

function staggerStyle(index: number): string {
  return `--delay: ${index * CARD_STAGGER_MS}ms`;
}

function landingBackdrop(): HTMLElement {
  return el(
    'div',
    { class: 'landing-backdrop', 'aria-hidden': 'true' },
    el('div', { class: 'landing-glow' }),
    ...FLOATING_KEYS.map(floatingKey),
  );
}

function floatingKey(key: FloatingKey): HTMLElement {
  return el('span', {
    class: `floating-key depth-${key.depth}`,
    text: key.char,
    style: `--x: ${key.x}%; --y: ${key.y}%; --size: ${key.size}rem; --tilt: ${key.tilt}deg; --delay: ${key.delay}s`,
  });
}
