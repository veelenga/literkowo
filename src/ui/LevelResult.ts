import { MAX_STARS, accuracyPercent, starThresholdPercents } from '../course/scoring';
import type { GameResult } from '../game/Game';
import { format } from '../i18n/format';
import { i18n } from '../i18n/i18n';
import { Counter, el, icon, prefersReducedMotion } from './dom';
import { ResultKeys } from './mastery';
import { createOverlay, type Overlay } from './overlay';
import { ResultProgress, type EarnedRewards } from './ResultProgress';
import { treasuresNote, type Treasures } from './resultTreasures';

const STAR_INTRO_MS = 240;
const STAR_STAGGER_MS = 220;
const COUNTER_START_MS = STAR_INTRO_MS + MAX_STARS * STAR_STAGGER_MS;
const COUNTER_DURATION_MS = 900;

export interface LevelRewards extends EarnedRewards {
  readonly treasures: Treasures;
}

interface Actions {
  onNext?: () => void;
  onRetry: () => void;
  onMap: () => void;
}

interface StatTile {
  element: HTMLElement;
  reveal: () => void;
  stop: () => void;
}

export function levelResult(
  result: GameResult,
  stars: number,
  earned: LevelRewards,
  actions: Actions,
): Overlay {
  const t = i18n.t;
  const progress = new ResultProgress(earned);
  const keys = new ResultKeys(result.keys);
  const tiles = [
    statTile(t.score, result.score),
    statTile(t.accuracy, accuracyPercent(result.accuracy), '%'),
    statTile(t.speed, result.wpm, t.wpm),
    statTile(t.lettersFreed, result.lettersFreed),
  ];
  const revealDelay = prefersReducedMotion() ? 0 : COUNTER_START_MS;
  const revealTimer = window.setTimeout(() => {
    tiles.forEach((tile) => tile.reveal());
    progress.reveal();
    keys.reveal();
  }, revealDelay);
  const element = el(
    'div',
    { class: 'overlay' },
    el(
      'div',
      { class: `panel panel-center result-panel ${result.won ? 'is-won' : 'is-lost'}` },
      el('h2', { class: 'result-title', text: result.won ? t.levelComplete : t.levelFailed }),
      starsRow(stars),
      el('p', { class: 'result-hint', text: result.won ? starsHint() : t.retryHint }),
      el('div', { class: 'result-stats' }, ...tiles.map((tile) => tile.element)),
      progress.element,
      treasuresNote(earned.treasures),
      keys.element,
      actionsRow(stars, actions),
    ),
  );
  return createOverlay(
    element,
    () => window.clearTimeout(revealTimer),
    () => progress.stop(),
    () => keys.stop(),
    ...tiles.map((tile) => tile.stop),
  );
}

function starsHint(): string {
  const [one, two, three] = starThresholdPercents();
  return format(i18n.t.starsHint, { one, two, three });
}

function starsRow(stars: number): HTMLElement {
  return el(
    'div',
    { class: 'stars-row', 'aria-label': `${stars} / ${MAX_STARS}` },
    ...Array.from({ length: MAX_STARS }, (_, index) => {
      const star = icon('star', index < stars ? 'star is-earned' : 'star');
      star.style.setProperty('--delay', `${STAR_INTRO_MS + index * STAR_STAGGER_MS}ms`);
      return star;
    }),
  );
}

function statTile(label: string, value: number, unit?: string): StatTile {
  const counter = new Counter(
    el('strong', { class: 'result-stat-value' }),
    undefined,
    COUNTER_DURATION_MS,
  );
  const element = el(
    'div',
    { class: 'result-stat' },
    el('span', { class: 'result-stat-label', text: label }),
    el(
      'span',
      { class: 'result-stat-reading' },
      counter.element,
      unit ? el('span', { class: 'result-stat-unit', text: unit }) : null,
    ),
  );
  return { element, reveal: () => counter.set(value), stop: () => counter.stop() };
}

function actionsRow(stars: number, actions: Actions): HTMLElement {
  const t = i18n.t;
  const onNext = stars > 0 ? actions.onNext : undefined;
  const retryIsPrimary = stars === 0;
  const mapIsPrimary = !onNext && !retryIsPrimary;
  return el(
    'div',
    { class: 'actions result-actions' },
    el('button', {
      class: mapIsPrimary ? 'button button-primary button-large' : 'button button-ghost',
      text: t.map,
      onClick: actions.onMap,
    }),
    el('button', {
      class: retryIsPrimary ? 'button button-primary button-large' : 'button',
      text: t.retry,
      onClick: actions.onRetry,
    }),
    onNext
      ? el('button', {
          class: 'button button-primary button-large',
          text: t.next,
          onClick: onNext,
        })
      : null,
  );
}
