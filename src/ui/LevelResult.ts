import { MAX_STARS, accuracyPercent, starThresholdPercents } from '../course/scoring';
import type { GameResult } from '../game/Game';
import { format } from '../i18n/format';
import { i18n } from '../i18n/i18n';
import { Counter, el, icon, prefersReducedMotion } from './dom';
import { ResultKeys } from './mastery';
import { createOverlay, onWindowKeyAfter, type Overlay } from './overlay';
import { ResultProgress, type EarnedRewards } from './ResultProgress';
import { treasuresNote, type Treasures } from './resultTreasures';

const STAR_INTRO_MS = 240;
const STAR_STAGGER_MS = 220;
const COUNTER_START_MS = STAR_INTRO_MS + MAX_STARS * STAR_STAGGER_MS;
const COUNTER_DURATION_MS = 900;
const PRIMARY_KEY = 'Enter';
const PRIMARY_KEY_LABEL = '⏎';
const PRIMARY_KEY_READY_MS = 600;
const PRIMARY_BUTTON_CLASS = 'button button-primary button-large';

export interface LevelRewards extends EarnedRewards {
  readonly treasures: Treasures;
}

interface Actions {
  onNext?: () => void;
  onRetry: () => void;
  onMap: () => void;
}

interface ResultAction {
  readonly label: string;
  readonly run: () => void;
  readonly secondaryClass: string;
}

interface ResultActions {
  readonly all: readonly ResultAction[];
  readonly primary: ResultAction;
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
  const choices = resultActions(stars, actions);
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
      actionsRow(choices),
    ),
  );
  return createOverlay(
    element,
    runOnPrimaryKey(choices.primary),
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

function resultActions(stars: number, actions: Actions): ResultActions {
  const t = i18n.t;
  const map = { label: t.map, run: actions.onMap, secondaryClass: 'button button-ghost' };
  const retry = { label: t.retry, run: actions.onRetry, secondaryClass: 'button' };
  const onNext = stars > 0 ? actions.onNext : undefined;
  if (!onNext) return { all: [map, retry], primary: stars === 0 ? retry : map };
  const next = { label: t.next, run: onNext, secondaryClass: PRIMARY_BUTTON_CLASS };
  return { all: [map, retry, next], primary: next };
}

function actionsRow(choices: ResultActions): HTMLElement {
  return el(
    'div',
    { class: 'actions result-actions' },
    ...choices.all.map((action) => actionButton(action, action === choices.primary)),
  );
}

function actionButton(action: ResultAction, isPrimary: boolean): HTMLElement {
  if (!isPrimary) {
    return el('button', { class: action.secondaryClass, text: action.label, onClick: action.run });
  }
  return el(
    'button',
    { class: PRIMARY_BUTTON_CLASS, onClick: action.run },
    action.label,
    el('kbd', { class: 'kbd kbd-on-primary', text: PRIMARY_KEY_LABEL }),
  );
}

function runOnPrimaryKey(action: ResultAction): () => void {
  const stopListening = onWindowKeyAfter(PRIMARY_KEY_READY_MS, (event) => {
    if (event.key !== PRIMARY_KEY || event.repeat) return;
    event.preventDefault();
    stopListening();
    action.run();
  });
  return stopListening;
}
