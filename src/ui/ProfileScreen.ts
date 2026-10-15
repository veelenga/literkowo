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
import { el, present } from './dom';

const MAX_NAME_LENGTH = 16;

interface Actions {
  onPlay: (profile: Profile) => void;
}

export class ProfileScreen {
  readonly element = el('div', { class: 'screen' });
  private selected: Profile | undefined;
  private creating = false;

  constructor(
    private readonly store: ProfileStore,
    private readonly actions: Actions,
  ) {
    this.selected = store.active();
    this.render();
  }

  private render(): void {
    const t = i18n.t;
    this.element.replaceChildren(
      ...present(
        this.languageSwitch(),
        el('h1', { class: 'logo', text: t.appName }),
        el('p', { class: 'tagline', text: t.tagline }),
        el('h2', { text: t.whoPlays }),
        el(
          'div',
          { class: 'profile-grid' },
          ...this.store.all().map((profile) => this.card(profile)),
          this.newCard(),
        ),
        this.creating ? this.createForm() : null,
        this.selected && !this.creating ? this.setupPanel(this.selected) : null,
      ),
    );
  }

  private languageSwitch(): HTMLElement {
    const option = (language: UiLanguage, label: string) =>
      el('button', {
        class: i18n.current === language ? 'chip is-active' : 'chip',
        text: label,
        onClick: () => {
          i18n.set(language);
          this.render();
        },
      });
    return el('div', { class: 'language-switch' }, option('pl', 'PL'), option('uk', 'UA'));
  }

  private card(profile: Profile): HTMLElement {
    const t = i18n.t;
    const isSelected = this.selected?.id === profile.id;
    return el(
      'button',
      {
        class: isSelected ? 'profile-card is-selected' : 'profile-card',
        onClick: () => this.select(profile),
      },
      el('span', { class: 'avatar avatar-large', text: profile.avatar }),
      el('strong', { text: profile.name }),
      el('small', { text: `★ ${totalStars(profile)} · ${t.bestScore}: ${profile.totalScore}` }),
    );
  }

  private newCard(): HTMLElement {
    return el(
      'button',
      {
        class: 'profile-card profile-card-new',
        onClick: () => {
          this.creating = true;
          this.render();
        },
      },
      el('span', { class: 'avatar avatar-large', text: '+' }),
      el('strong', { text: i18n.t.newProfile }),
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
    const input = el('input', {
      class: 'input',
      type: 'text',
      placeholder: t.profileName,
      maxlength: MAX_NAME_LENGTH,
    });
    const avatarButtons = AVATARS.map((candidate) =>
      el('button', {
        class: candidate === avatar ? 'avatar-option is-active' : 'avatar-option',
        text: candidate,
        onClick: (event: Event) => {
          avatar = candidate;
          avatarButtons.forEach((button) =>
            button.classList.toggle('is-active', button === event.currentTarget),
          );
        },
      }),
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
      'div',
      { class: 'panel' },
      el('h3', { text: t.newProfile }),
      input,
      el('p', { class: 'muted', text: t.chooseAvatar }),
      el('div', { class: 'avatar-options' }, ...avatarButtons),
      el(
        'div',
        { class: 'actions' },
        el('button', { class: 'button button-primary', text: t.create, onClick: submit }),
        el('button', {
          class: 'button',
          text: t.cancel,
          onClick: () => {
            this.creating = false;
            this.render();
          },
        }),
      ),
    );
  }

  private setupPanel(profile: Profile): HTMLElement {
    const t = i18n.t;
    return el(
      'div',
      { class: 'panel' },
      el('h3', { text: `${profile.avatar} ${profile.name}` }),
      el('p', { class: 'muted', text: t.wordLanguage }),
      el(
        'div',
        { class: 'chips' },
        this.languageChip(profile, 'pl', t.polish),
        this.languageChip(profile, 'en', t.english),
      ),
      el(
        'div',
        { class: 'actions' },
        el('button', {
          class: 'button button-primary button-large',
          text: `▶ ${t.play}`,
          onClick: () => this.actions.onPlay(profile),
        }),
        el('button', {
          class: 'button button-danger',
          text: t.deleteProfile,
          onClick: () => this.remove(profile),
        }),
      ),
    );
  }

  private languageChip(profile: Profile, language: WordLanguage, label: string): HTMLElement {
    return el('button', {
      class: profile.wordLanguage === language ? 'chip is-active' : 'chip',
      text: label,
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
