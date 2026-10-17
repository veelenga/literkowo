import { sfx } from '../audio/Sfx';
import { confetti } from './confetti';
import { Counter, el, prefersReducedMotion } from './dom';
import { CLOSE_KEY, createOverlay, onCardKeys, PRIMARY_KEY, type Overlay } from './overlay';
import { ResultProgress, type EarnedRewards } from './ResultProgress';
import { treasuresNote, type OpenShop, type Treasures } from './resultTreasures';
import { primaryButton } from './shortcutHint';

const REVEAL_DELAY_MS = 700;
const COUNTER_DURATION_MS = 900;
const PANEL_CLASS = 'panel panel-center result-panel';
const GHOST_BUTTON_CLASS = 'button button-ghost';

export type ResultMood = 'won' | 'lost' | 'calm';

const MOOD_CLASSES: Readonly<Record<ResultMood, string>> = {
  won: 'is-won',
  lost: 'is-lost',
  calm: 'is-calm',
};

export interface ResultRewards extends EarnedRewards {
  readonly treasures: Treasures;
}

export interface ResultPart {
  readonly element: HTMLElement;
  reveal(): void;
  stop(): void;
}

export interface ResultButton {
  readonly label: string;
  readonly run: () => void;
  readonly secondaryClass?: string;
}

export interface ResultActions {
  readonly buttons: readonly ResultButton[];
  readonly primary: ResultButton;
  readonly note?: string;
  readonly onClose?: () => void;
}

export interface ResultCard {
  readonly variant?: string;
  readonly mood: ResultMood;
  readonly title: string;
  readonly badge: HTMLElement;
  readonly hint: string;
  readonly tiles: readonly ResultPart[];
  readonly earned: ResultRewards;
  readonly revealDelayMs?: number;
  readonly celebrate?: boolean;
  readonly details?: HTMLElement;
  readonly mastery?: ResultPart;
  readonly actions: ResultActions;
  readonly onShop: OpenShop;
}

export function resultOverlay(card: ResultCard): Overlay {
  const progress = new ResultProgress(card.earned);
  const parts: ResultPart[] = [...card.tiles, progress];
  if (card.mastery) parts.push(card.mastery);
  const panel = el(
    'div',
    { class: panelClass(card) },
    el('h2', { class: 'result-title', text: card.title }),
    card.badge,
    el('p', { class: 'result-hint', text: card.hint }),
    el('div', { class: 'result-stats' }, ...card.tiles.map((tile) => tile.element)),
    progress.element,
    card.details,
    treasuresNote(card.earned.treasures, card.onShop),
    card.mastery?.element,
    actionsRow(card.actions),
  );
  const revealTimer = window.setTimeout(
    () => {
      parts.forEach((part) => part.reveal());
      if (card.celebrate) celebrate(panel);
    },
    prefersReducedMotion() ? 0 : (card.revealDelayMs ?? REVEAL_DELAY_MS),
  );
  return createOverlay(
    el('div', { class: 'overlay' }, panel),
    onCardKeys(cardKeys(card.actions)),
    () => window.clearTimeout(revealTimer),
    ...parts.map((part) => () => part.stop()),
  );
}

export function statTile(
  label: string,
  value: number,
  unit?: string,
  show?: (value: number) => string,
): ResultPart {
  const counter = new Counter(
    el('strong', { class: 'result-stat-value' }),
    show,
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

function panelClass({ variant, mood }: ResultCard): string {
  return [PANEL_CLASS, variant, MOOD_CLASSES[mood]].filter(Boolean).join(' ');
}

function celebrate(panel: HTMLElement): void {
  panel.append(confetti());
  sfx.sparkle();
}

function cardKeys({ primary, onClose }: ResultActions): ReadonlyMap<string, () => void> {
  const keys = new Map([[PRIMARY_KEY, primary.run]]);
  if (onClose) keys.set(CLOSE_KEY, onClose);
  return keys;
}

function actionsRow({ buttons, primary, note }: ResultActions): HTMLElement {
  return el(
    'div',
    { class: 'actions result-actions' },
    note ? el('p', { class: 'result-note', text: note }) : null,
    ...buttons.map((button) => actionButton(button, button === primary)),
  );
}

function actionButton(button: ResultButton, isPrimary: boolean): HTMLElement {
  if (isPrimary) return primaryButton(button.label, button.run);
  return el('button', {
    class: button.secondaryClass ?? GHOST_BUTTON_CLASS,
    text: button.label,
    onClick: button.run,
  });
}
