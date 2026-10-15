import { sfx } from '../../audio/Sfx';
import { NO_MEDAL, type Medal } from '../../arena/medals';
import { accuracyPercent } from '../../course/scoring';
import type { GameResult } from '../../game/Game';
import { i18n } from '../../i18n/i18n';
import { confetti } from '../confetti';
import { el, prefersReducedMotion } from '../dom';
import { statTile, type LevelRewards } from '../LevelResult';
import { createOverlay, KEY_READY_MS, onWindowKeyAfter, type Overlay } from '../overlay';
import { ResultProgress } from '../ResultProgress';
import { treasuresNote } from '../resultTreasures';
import { medalBadge, nextMedalHint } from './arenaParts';

const REVEAL_DELAY_MS = 700;
const RETRY_KEY = 'Enter';
const RETRY_KEY_LABEL = '⏎';

export interface ArenaRunSummary {
  readonly result: GameResult;
  readonly wavesCleared: number;
  readonly medal: Medal;
  readonly newRecord: boolean;
  readonly earned: LevelRewards;
}

interface ArenaResultActions {
  onArena: () => void;
  onRetry: () => void;
}

export function arenaResult(summary: ArenaRunSummary, actions: ArenaResultActions): Overlay {
  const t = i18n.t;
  const { result, medal, newRecord, earned } = summary;
  const progress = new ResultProgress(earned);
  const tiles = [
    statTile(t.features.arena.waves, summary.wavesCleared),
    statTile(t.score, result.score),
    statTile(t.accuracy, accuracyPercent(result.accuracy), '%'),
  ];
  const panel = el(
    'div',
    { class: `panel panel-center result-panel arena-result ${outcomeClass(summary)}` },
    el('h2', { class: 'result-title', text: titleOf(summary) }),
    medalBadge(medal, 'medal medal-large'),
    el('p', { class: 'result-hint', text: nextMedalHint(medal) }),
    el('div', { class: 'result-stats' }, ...tiles.map((tile) => tile.element)),
    progress.element,
    treasuresNote(earned.treasures),
    actionsRow(actions),
  );
  const revealTimer = window.setTimeout(
    () => {
      tiles.forEach((tile) => tile.reveal());
      progress.reveal();
      if (newRecord) celebrate(panel);
    },
    prefersReducedMotion() ? 0 : REVEAL_DELAY_MS,
  );
  return createOverlay(
    el('div', { class: 'overlay' }, panel),
    retryOnKey(actions.onRetry),
    () => window.clearTimeout(revealTimer),
    () => progress.stop(),
    ...tiles.map((tile) => tile.stop),
  );
}

function titleOf({ newRecord, medal }: ArenaRunSummary): string {
  const copy = i18n.t.features.arena;
  if (newRecord) return copy.newRecord;
  return medal > NO_MEDAL ? copy.goodRun : i18n.t.levelFailed;
}

function outcomeClass({ newRecord, medal }: ArenaRunSummary): string {
  return newRecord || medal > NO_MEDAL ? 'is-won' : 'is-lost';
}

function celebrate(panel: HTMLElement): void {
  panel.append(confetti());
  sfx.sparkle();
}

function actionsRow(actions: ArenaResultActions): HTMLElement {
  return el(
    'div',
    { class: 'actions result-actions' },
    el('button', {
      class: 'button button-ghost',
      text: i18n.t.features.arena.title,
      onClick: actions.onArena,
    }),
    el(
      'button',
      { class: 'button button-primary button-large', onClick: actions.onRetry },
      i18n.t.features.arena.again,
      el('kbd', { class: 'kbd kbd-on-primary', text: RETRY_KEY_LABEL }),
    ),
  );
}

function retryOnKey(onRetry: () => void): () => void {
  const stopListening = onWindowKeyAfter(KEY_READY_MS, (event) => {
    if (event.key !== RETRY_KEY || event.repeat) return;
    event.preventDefault();
    stopListening();
    onRetry();
  });
  return stopListening;
}
