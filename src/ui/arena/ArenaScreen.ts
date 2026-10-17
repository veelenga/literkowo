import { hasFinishedToday } from '../../arena/daily';
import {
  DIFFICULTIES,
  difficultyById,
  isDifficultyOpen,
  unlockingDifficulty,
  type ArenaDifficulty,
} from '../../arena/difficulty';
import type { ArenaChoice } from '../../arena/endlessPlan';
import { defaultKeySet, openKeySets, type KeySet } from '../../arena/keySets';
import { NO_MEDAL } from '../../arena/medals';
import { placementStages, STAGE_SECONDS } from '../../arena/placement';
import { startRegion } from '../../arena/placementProgress';
import { arenaKey, endlessBest, type EndlessBest } from '../../arena/record';
import { todayOf } from '../../arena/week';
import { format } from '../../i18n/format';
import { i18n } from '../../i18n/i18n';
import type { Profile } from '../../profiles/Profile';
import { releasePortraits } from '../CharacterPortraits';
import { el } from '../dom';
import { keyLabel } from '../levelKind';
import { onShortcutKeys, stepWithin } from '../overlay';
import { stageChips } from '../placement/placementParts';
import { coinPill } from '../progression';
import { ShopHero } from '../ShopHero';
import { shopLink } from '../shopLink';
import { ESCAPE_LABEL, primaryButton, shortcutHint } from '../shortcutHint';
import { hintedLockBadge, shopIcon } from '../shopParts';
import { arenaIcon, difficultyName, medalBadge, waveLabel } from './arenaParts';
import { dailyCard, dailyIcon, isDailyPinned } from './DailyCard';
import { testIcon } from './testIcon';

export const ARENA_MODES = ['test', 'daily', 'endless'] as const;

export type ArenaMode = (typeof ARENA_MODES)[number];

interface ArenaActions {
  onBack: (profile: Profile) => void;
  onPlay: (profile: Profile, choice: ArenaChoice) => void;
  onDaily: (profile: Profile, keySet: KeySet, choice: ArenaChoice) => void;
  onTest: (profile: Profile, choice: ArenaChoice) => void;
  onShop: (profile: Profile, choice: ArenaChoice) => void;
}

export interface ArenaScreenOptions {
  readonly previous?: ArenaChoice;
  readonly mode?: ArenaMode;
  readonly family?: readonly Profile[];
  readonly today?: string;
}

const DEFAULT_MODE: ArenaMode = 'endless';
const DEFAULT_DIFFICULTY_ID = 'normal';
const ENTERING_CLASS = 'is-entering';
const PREVIOUS = -1;
const NEXT = 1;

export class ArenaScreen {
  readonly element = el('div', { class: 'screen shop-screen arena-screen' });
  private readonly hero = new ShopHero();
  private readonly records = el('div', { class: 'arena-records' });
  private readonly setup = el('section', { class: 'arena-setup' });
  private choice: ArenaChoice;
  private mode: ArenaMode;
  private readonly family: readonly Profile[];
  private readonly today: string;
  private readonly stopKeys: () => void;

  constructor(
    private readonly profile: Profile,
    private readonly actions: ArenaActions,
    {
      previous,
      mode = DEFAULT_MODE,
      family = [profile],
      today = todayOf(),
    }: ArenaScreenOptions = {},
  ) {
    this.choice = initialChoice(profile, previous);
    this.mode = mode;
    this.family = family;
    this.today = today;
    this.stopKeys = onShortcutKeys(this.element, {
      ArrowLeft: () => this.stepKeySet(PREVIOUS),
      ArrowRight: () => this.stepKeySet(NEXT),
      ArrowUp: () => this.stepDifficulty(NEXT),
      ArrowDown: () => this.stepDifficulty(PREVIOUS),
      Enter: () => this.playMode(),
      Escape: () => this.actions.onBack(this.profile),
    });
    this.hero.element.append(this.records);
    this.element.append(
      this.header(),
      el('main', { class: 'shop-layout arena-layout' }, this.hero.element, this.setup),
    );
    this.hero.show(profile);
    this.refresh(true);
  }

  dispose(): void {
    this.stopKeys();
    this.hero.dispose();
    releasePortraits();
  }

  private header(): HTMLElement {
    const copy = i18n.t.features.arena;
    return el(
      'header',
      { class: 'shop-header' },
      el(
        'button',
        {
          class: 'button button-ghost shop-back',
          onClick: () => this.actions.onBack(this.profile),
        },
        shopIcon('back', 'shop-back-icon'),
        copy.back,
        shortcutHint(ESCAPE_LABEL),
      ),
      el('h1', { class: 'logo logo-small shop-title', text: copy.title }),
      el(
        'div',
        { class: 'shop-coins' },
        shopLink(() => this.actions.onShop(this.profile, this.choice), 'is-icon-on-phone'),
        coinPill(String(this.profile.coins), 'stat-pill shop-coin-pill'),
      ),
    );
  }

  private refresh(entering = false): void {
    this.setup.classList.toggle(ENTERING_CLASS, entering);
    this.records.replaceChildren(...this.recordRows());
    this.setup.replaceChildren(this.modeTabs(), this.modePanel());
  }

  private playMode(): void {
    const play = this.setup.querySelector<HTMLButtonElement>('.arena-play');
    play?.click();
  }

  private stepKeySet(direction: number): void {
    if (!this.usesKeySet()) return;
    const keySets = openKeySets(this.profile);
    const index = keySets.findIndex((option) => option.id === this.choice.keySet.id);
    const keySet = keySets[stepWithin(index, direction, keySets.length)];
    if (keySet.id !== this.choice.keySet.id) this.choose({ keySet });
  }

  private stepDifficulty(direction: number): void {
    if (this.mode !== 'endless') return;
    const open = DIFFICULTIES.filter((difficulty) => isDifficultyOpen(difficulty, this.profile));
    const index = open.findIndex((difficulty) => difficulty.id === this.choice.difficulty.id);
    const difficulty = open[stepWithin(index, direction, open.length)];
    if (difficulty.id !== this.choice.difficulty.id) this.choose({ difficulty });
  }

  private usesKeySet(): boolean {
    if (this.mode === 'endless') return true;
    return this.mode === 'daily' && !isDailyPinned(this.profile, this.today);
  }

  private choose(choice: Partial<ArenaChoice>): void {
    this.choice = { ...this.choice, ...choice };
    this.refresh();
  }

  private pick(mode: ArenaMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    this.refresh();
  }

  private modeTabs(): HTMLElement {
    return el(
      'nav',
      { class: 'arena-modes', 'aria-label': i18n.t.features.arena.mode },
      ...ARENA_MODES.map((mode) => this.modeTab(mode)),
    );
  }

  private modeTab(mode: ArenaMode): HTMLElement {
    const active = mode === this.mode;
    const waiting = mode === 'daily' && !hasFinishedToday(this.profile.arena.daily, this.today);
    return el(
      'button',
      {
        class: active ? 'arena-mode-tab is-active' : 'arena-mode-tab',
        type: 'button',
        'data-mode': mode,
        'aria-pressed': String(active),
        onClick: () => this.pick(mode),
      },
      el('span', { class: 'arena-mode-art' }, modeIcon(mode)),
      el('span', { class: 'arena-mode-name', text: modeName(mode) }),
      waiting ? el('span', { class: 'header-button-dot daily-dot', 'aria-hidden': 'true' }) : null,
    );
  }

  private modePanel(): HTMLElement {
    switch (this.mode) {
      case 'test':
        return this.testPanel();
      case 'daily':
        return this.dailyPanel();
      case 'endless':
        return this.endlessPanel();
    }
  }

  private keySetField(): HTMLElement {
    const { keySet } = this.choice;
    return field(
      'arena-keys-field',
      i18n.t.features.arena.keySets,
      el(
        'nav',
        { class: 'segmented arena-chips', 'aria-label': i18n.t.features.arena.keySets },
        ...openKeySets(this.profile).map((option) =>
          chip(option.region.name[i18n.current], option.id === keySet.id, () =>
            this.choose({ keySet: option }),
          ),
        ),
      ),
      el('p', { class: 'arena-keys', text: keyLabel(keySet.keys) }),
    );
  }

  private difficultyField(): HTMLElement {
    const hint = DIFFICULTIES.map((difficulty) => lockedHintOf(difficulty, this.profile)).find(
      (text) => text !== undefined,
    );
    return field(
      'arena-difficulty-field',
      i18n.t.features.arena.difficulty,
      el(
        'nav',
        {
          class: 'segmented arena-chips arena-difficulties',
          'aria-label': i18n.t.features.arena.difficulty,
        },
        ...DIFFICULTIES.map((difficulty) => this.difficultyChip(difficulty)),
      ),
      hint ? el('p', { class: 'arena-hint', text: hint }) : null,
    );
  }

  private difficultyChip(difficulty: ArenaDifficulty): HTMLElement {
    const name = difficultyName(difficulty);
    const hint = lockedHintOf(difficulty, this.profile);
    if (hint) {
      return el(
        'button',
        { class: 'chip is-locked', disabled: true, title: hint, 'aria-label': `${name}. ${hint}` },
        name,
        hintedLockBadge(hint),
      );
    }
    const active = difficulty.id === this.choice.difficulty.id;
    return chip(name, active, () => this.choose({ difficulty }));
  }

  private dailyPanel(): HTMLElement {
    const view = {
      profile: this.profile,
      family: this.family,
      today: this.today,
      chosen: this.choice.keySet,
    };
    const card = dailyCard(view, (keySet) =>
      this.actions.onDaily(this.profile, keySet, this.choice),
    );
    if (!isDailyPinned(this.profile, this.today)) card.prepend(this.keySetField());
    return card;
  }

  private endlessPanel(): HTMLElement {
    const copy = i18n.t.features.arena;
    const best = this.bestOf(this.choice.difficulty);
    return el(
      'article',
      { class: 'shop-item arena-panel', 'data-mode': 'endless' },
      this.keySetField(),
      this.difficultyField(),
      el('p', { class: 'shop-item-text arena-rule', text: copy.endless.rule }),
      el(
        'div',
        { class: 'arena-mode-best' },
        el('span', { class: 'stat-pill arena-best', text: bestText(best) }),
        best && best.medal > NO_MEDAL ? medalBadge(best.medal) : null,
      ),
      playButton(() => this.actions.onPlay(this.profile, this.choice)),
    );
  }

  private testPanel(): HTMLElement {
    const copy = i18n.t.features.placement;
    const regions = placementStages(this.profile.wordLanguage).map((stage) => stage.keySet.region);
    const start = startRegion(this.profile);
    return el(
      'article',
      { class: 'shop-item arena-panel', 'data-mode': 'test' },
      stageChips(regions),
      el('p', {
        class: 'shop-item-text arena-rule',
        text: format(copy.rule, { seconds: STAGE_SECONDS }),
      }),
      el('p', { class: 'shop-item-text arena-rule', text: i18n.t.placeFingers }),
      start
        ? el('span', {
            class: 'stat-pill arena-best',
            text: format(copy.startsHere, { region: start.name[i18n.current] }),
          })
        : null,
      playButton(() => this.actions.onTest(this.profile, this.choice)),
    );
  }

  private recordRows(): HTMLElement[] {
    const title = el('h3', {
      class: 'arena-records-title',
      text: this.choice.keySet.region.name[i18n.current],
    });
    const rows = DIFFICULTIES.filter((difficulty) =>
      isDifficultyOpen(difficulty, this.profile),
    ).map((difficulty) => this.recordRow(difficulty));
    return [title, ...rows];
  }

  private recordRow(difficulty: ArenaDifficulty): HTMLElement {
    const best = this.bestOf(difficulty);
    const medal = best?.medal ?? NO_MEDAL;
    const active = difficulty.id === this.choice.difficulty.id;
    return el(
      'div',
      { class: active ? 'arena-record is-active' : 'arena-record' },
      el('span', { class: 'arena-record-name', text: difficultyName(difficulty) }),
      el('strong', { class: 'arena-record-wave', text: waveLabel(best?.wave ?? 0) }),
      medalBadge(medal, 'medal medal-small'),
    );
  }

  private bestOf(difficulty: ArenaDifficulty): EndlessBest | undefined {
    return endlessBest(this.profile.arena, arenaKey(this.choice.keySet.id, difficulty.id));
  }
}

function initialChoice(profile: Profile, previous: ArenaChoice | undefined): ArenaChoice {
  const keySet =
    openKeySets(profile).find((option) => option.id === previous?.keySet.id) ??
    defaultKeySet(profile);
  const wanted = previous?.difficulty ?? difficultyById(DEFAULT_DIFFICULTY_ID);
  const difficulty = wanted && isDifficultyOpen(wanted, profile) ? wanted : DIFFICULTIES[0];
  return { keySet, difficulty };
}

function modeName(mode: ArenaMode): string {
  const copy = i18n.t.features;
  switch (mode) {
    case 'test':
      return copy.placement.title;
    case 'daily':
      return copy.daily.name;
    case 'endless':
      return copy.arena.endless.name;
  }
}

function modeIcon(mode: ArenaMode): SVGSVGElement {
  switch (mode) {
    case 'test':
      return testIcon('arena-mode-icon');
    case 'daily':
      return dailyIcon('arena-mode-icon');
    case 'endless':
      return arenaIcon('arena-mode-icon');
  }
}

function playButton(onPlay: () => void): HTMLElement {
  return primaryButton(i18n.t.play, onPlay, 'arena-play');
}

function field(area: string, label: string, ...children: Array<HTMLElement | null>): HTMLElement {
  return el(
    'div',
    { class: `arena-field ${area}` },
    el('h2', { class: 'arena-field-label', text: label }),
    ...children,
  );
}

function chip(label: string, active: boolean, onClick: () => void): HTMLElement {
  return el('button', {
    class: active ? 'chip is-active' : 'chip',
    text: label,
    'aria-pressed': String(active),
    onClick,
  });
}

function bestText(best: EndlessBest | undefined): string {
  const copy = i18n.t.features.arena.endless;
  return best && best.wave > 0 ? format(copy.best, { wave: best.wave }) : copy.noBest;
}

function lockedHintOf(difficulty: ArenaDifficulty, profile: Profile): string | undefined {
  const previous = unlockingDifficulty(difficulty);
  if (!previous || isDifficultyOpen(difficulty, profile)) return undefined;
  return format(i18n.t.features.arena.difficultyLocked, {
    level: difficultyName(previous),
    next: difficultyName(difficulty),
  });
}
