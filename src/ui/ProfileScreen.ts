import { i18n } from '../i18n/i18n';
import type { UiLanguage } from '../i18n/translations';
import {
  AVATARS,
  createProfile,
  STARTER_SKINS,
  totalStars,
  type Profile,
  type WordLanguage,
} from '../profiles/Profile';
import type { ProfileStore } from '../profiles/ProfileStore';
import { avatarPicker } from './AvatarPicker';
import { characterAvatar } from './CharacterAvatar';
import { releasePortraits } from './CharacterPortraits';
import { el, icon, prefersReducedMotion, svg } from './dom';
import { keepDockBelowRow, type StopDock } from './landing/dockRow';
import { LandingBackdrop } from './landing/LandingBackdrop';
import { livePreview, outfitOf } from './LivePreview';
import { hasAmbientMotion } from './menuMotion';
import { coinPill, levelBadge } from './progression';
import { settingsGearButton } from './settingsParts';
import './profileScreen.css';

const MAX_NAME_LENGTH = 16;
const CARD_STAGGER_MS = 80;
const CREATE_PANEL_KEY = 'create';
const SELECTED_CARD_SELECTOR = '.profile-card.is-selected';
const TILE_SELECTOR = ':scope > .profile-card';
const PLAY_ICON_PATH =
  'M8 5.6v12.8a1 1 0 0 0 1.5.86l10.4-6.4a1 1 0 0 0 0-1.72L9.5 4.74A1 1 0 0 0 8 5.6z';

interface Actions {
  onPlay: (profile: Profile) => void;
  onSettings: () => void;
}

export class ProfileScreen {
  readonly element = el('div', { class: 'screen profile-screen is-intro' });
  private readonly backdrop = new LandingBackdrop(hasAmbientMotion());
  private readonly view = el('div', { class: 'profile-view' });
  private selected: Profile | undefined;
  private creating = false;
  private rendered = false;
  private panelKey: string | undefined;
  private stopDock: StopDock = noDock;

  constructor(
    private readonly store: ProfileStore,
    private readonly actions: Actions,
  ) {
    this.selected = store.active();
    this.element.append(this.backdrop.element, this.view);
    this.backdrop.followPointer(this.element);
    this.render();
  }

  dispose(): void {
    this.stopDock();
    livePreview.stop();
    releasePortraits();
    this.backdrop.dispose();
  }

  private render(): void {
    const t = i18n.t;
    if (this.rendered) this.element.classList.remove('is-intro');
    this.rendered = true;
    livePreview.hide();
    const grid = el('div', { class: 'profile-grid' }, ...this.gridItems());
    this.view.replaceChildren(
      el(
        'div',
        { class: 'profile-corner' },
        this.languageSwitch(),
        settingsGearButton(this.actions.onSettings),
      ),
      el(
        'main',
        { class: 'landing' },
        el(
          'header',
          { class: 'landing-hero' },
          el('h1', { class: 'landing-logo', text: t.appName }),
          el('p', { class: 'tagline', text: t.tagline }),
        ),
        el('h2', { class: 'section-title', text: t.whoPlays }),
        grid,
      ),
    );
    this.dockBelowSelectedRow(grid);
  }

  private dockBelowSelectedRow(grid: HTMLElement): void {
    this.stopDock();
    const selected = grid.querySelector<HTMLElement>(SELECTED_CARD_SELECTOR);
    const tiles = [...grid.querySelectorAll<HTMLElement>(TILE_SELECTOR)];
    this.stopDock = selected ? keepDockBelowRow(grid, selected, tiles) : noDock;
  }

  private gridItems(): HTMLElement[] {
    const key = this.creating ? CREATE_PANEL_KEY : this.selected?.id;
    const isFresh = key !== this.panelKey;
    this.panelKey = key;
    const profiles = this.store.all();
    const cards = profiles.flatMap((profile, index) => {
      const card = this.card(profile, index);
      if (!this.isSelected(profile)) return [card];
      return [card, dock(this.playPanel(profile), isFresh)];
    });
    const last = this.creating ? dock(this.createPanel(), isFresh) : this.newCard(profiles.length);
    return [...cards, last];
  }

  private isSelected(profile: Profile): boolean {
    return !this.creating && this.selected?.id === profile.id;
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
    const isSelected = this.isSelected(profile);
    const avatar = characterAvatar(profile.avatar);
    if (isSelected) livePreview.show(avatar, outfitOf(profile.avatar, profile.equipped));
    const stars = totalStars(profile);
    return el(
      'button',
      {
        class: isSelected ? 'profile-card is-selected' : 'profile-card',
        style: staggerStyle(index),
        'aria-pressed': String(isSelected),
        onClick: () => this.select(profile),
      },
      heroStage(avatar),
      el(
        'span',
        { class: 'profile-info' },
        el('strong', { class: 'profile-name', text: profile.name }),
        levelBadge(profile.xp, 'level-badge profile-level'),
        el(
          'span',
          { class: 'profile-meta' },
          el(
            'span',
            { class: 'meta-pill meta-stars', title: t.stars, 'aria-label': `${t.stars}: ${stars}` },
            icon('star', 'meta-star'),
            el('strong', { text: String(stars) }),
          ),
          coinPill(String(profile.coins), 'meta-pill meta-coins'),
        ),
      ),
    );
  }

  private newCard(index: number): HTMLElement {
    return el(
      'button',
      {
        class: 'profile-card profile-card-new',
        style: staggerStyle(index),
        onClick: () => {
          this.creating = true;
          this.render();
        },
      },
      el(
        'span',
        { class: 'hero-stage new-stage' },
        el('span', { class: 'new-plus', 'aria-hidden': 'true', text: '+' }),
      ),
      el(
        'span',
        { class: 'profile-info' },
        el('strong', { class: 'profile-name', text: i18n.t.newProfile }),
      ),
    );
  }

  private select(profile: Profile): void {
    this.selected = profile;
    this.creating = false;
    this.store.setActive(profile);
    this.render();
  }

  private playPanel(profile: Profile): HTMLElement {
    const t = i18n.t;
    return el(
      'section',
      { class: 'panel profile-panel play-panel' },
      el(
        'div',
        { class: 'play-panel-main' },
        el('h3', { class: 'panel-title', text: profile.name }),
        el(
          'button',
          {
            class: 'button button-primary button-large play-button',
            onClick: () => this.actions.onPlay(profile),
          },
          playIcon(),
          t.play,
        ),
      ),
      el(
        'div',
        { class: 'play-panel-settings' },
        el('span', { class: 'field-label', text: t.wordLanguage }),
        el(
          'div',
          { class: 'segmented word-language' },
          this.languageChip(profile, 'pl', t.polish),
          this.languageChip(profile, 'en', t.english),
        ),
        el('button', {
          class: 'button button-danger',
          text: t.deleteProfile,
          onClick: () => this.remove(profile),
        }),
      ),
    );
  }

  private createPanel(): HTMLElement {
    const t = i18n.t;
    let avatar = AVATARS[0];
    const preview = el('span', { class: 'hero-stage create-preview' });
    const input = el('input', {
      class: 'input',
      type: 'text',
      placeholder: t.profileName,
      maxlength: MAX_NAME_LENGTH,
      autocomplete: 'off',
      'data-1p-ignore': 'true',
      'aria-label': t.profileName,
    });
    const submit = () => {
      const name = input.value.trim();
      if (!name) return input.focus();
      const profile = createProfile(name, avatar);
      this.store.add(profile);
      this.select(profile);
    };
    input.addEventListener('keydown', (event) => event.key === 'Enter' && submit());
    const picker = avatarPicker(avatar, STARTER_SKINS, (picked) => {
      avatar = picked;
      showOnStage(preview, picked);
    });
    const panel = el(
      'section',
      { class: 'panel profile-panel create-panel' },
      el('h3', { class: 'panel-title', text: t.newProfile }),
      el(
        'div',
        { class: 'create-layout' },
        preview,
        el(
          'div',
          { class: 'create-fields' },
          input,
          el('p', { class: 'field-label', text: t.chooseAvatar }),
          picker,
        ),
      ),
      el(
        'div',
        { class: 'actions create-actions' },
        el('button', {
          class: 'button button-ghost',
          text: t.cancel,
          onClick: () => {
            this.creating = false;
            this.render();
          },
        }),
        el('button', {
          class: 'button button-primary button-large',
          text: t.create,
          onClick: submit,
        }),
      ),
    );
    queueMicrotask(() => {
      input.focus({ preventScroll: true });
      panel.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
    });
    return panel;
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

function noDock(): void {}

function dock(panel: HTMLElement, isFresh: boolean): HTMLElement {
  panel.classList.toggle('is-fresh', isFresh);
  return el('div', { class: 'profile-dock' }, panel);
}

function staggerStyle(index: number): string {
  return `--delay: ${index * CARD_STAGGER_MS}ms`;
}

function heroStage(avatar: HTMLElement): HTMLElement {
  return el('span', { class: 'hero-stage' }, ...stageLights(), avatar);
}

function stageLights(): HTMLElement[] {
  return [el('span', { class: 'hero-spotlight' }), el('span', { class: 'hero-floor' })];
}

function showOnStage(stage: HTMLElement, character: string): void {
  const avatar = characterAvatar(character);
  stage.replaceChildren(...stageLights(), avatar);
  livePreview.show(avatar, outfitOf(character));
}

function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

function playIcon(): SVGSVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 24 24', class: 'play-icon', 'aria-hidden': 'true' },
    svg('path', { d: PLAY_ICON_PATH }),
  );
}
