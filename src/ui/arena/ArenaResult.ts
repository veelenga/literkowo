import { sfx } from '../../audio/Sfx';
import { NO_MEDAL, type Medal } from '../../arena/medals';
import { accuracyPercent } from '../../course/scoring';
import type { GameResult } from '../../game/Game';
import { i18n } from '../../i18n/i18n';
import { confetti } from '../confetti';
import { el, prefersReducedMotion } from '../dom';
import { statTile, type LevelRewards, type StatTile } from '../LevelResult';
import { createOverlay, onCardKeys, PRIMARY_KEY, type Overlay } from '../overlay';
import { ResultProgress } from '../ResultProgress';
import { treasuresNote, type OpenShop } from '../resultTreasures';
import { primaryButton } from '../shortcutHint';
import { medalBadge, nextMedalHint } from './arenaParts';

const REVEAL_DELAY_MS = 700;

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
  onShop: OpenShop;
}

export interface ResultButton {
  readonly label: string;
  readonly run: () => void;
}

export interface MedalCard {
  readonly variant: string;
  readonly title: string;
  readonly medal: Medal;
  readonly hint: string;
  readonly tiles: readonly StatTile[];
  readonly earned: LevelRewards;
  readonly won: boolean;
  readonly celebrate: boolean;
  readonly details?: HTMLElement | null;
  readonly secondary?: ResultButton;
  readonly note?: string;
  readonly primary: ResultButton;
  readonly onShop: OpenShop;
}

export function arenaResult(summary: ArenaRunSummary, actions: ArenaResultActions): Overlay {
  const t = i18n.t;
  const { result, medal, newRecord, earned } = summary;
  return medalResult({
    variant: 'arena-result',
    title: titleOf(summary),
    medal,
    hint: nextMedalHint(medal),
    tiles: [
      statTile(t.features.arena.waves, summary.wavesCleared),
      statTile(t.score, result.score),
      statTile(t.accuracy, accuracyPercent(result.accuracy), '%'),
    ],
    earned,
    won: newRecord || medal > NO_MEDAL,
    celebrate: newRecord,
    secondary: { label: t.features.arena.title, run: actions.onArena },
    primary: { label: t.features.arena.again, run: actions.onRetry },
    onShop: actions.onShop,
  });
}

export function medalResult(card: MedalCard): Overlay {
  const progress = new ResultProgress(card.earned);
  const panel = el(
    'div',
    {
      class: `panel panel-center result-panel ${card.variant} ${card.won ? 'is-won' : 'is-lost'}`,
    },
    el('h2', { class: 'result-title', text: card.title }),
    medalBadge(card.medal, 'medal medal-large'),
    el('p', { class: 'result-hint', text: card.hint }),
    el('div', { class: 'result-stats' }, ...card.tiles.map((tile) => tile.element)),
    progress.element,
    card.details ?? null,
    treasuresNote(card.earned.treasures, card.onShop),
    actionsRow(card),
  );
  const revealTimer = window.setTimeout(
    () => {
      card.tiles.forEach((tile) => tile.reveal());
      progress.reveal();
      if (card.celebrate) celebrate(panel);
    },
    prefersReducedMotion() ? 0 : REVEAL_DELAY_MS,
  );
  return createOverlay(
    el('div', { class: 'overlay' }, panel),
    onCardKeys(new Map([[PRIMARY_KEY, card.primary.run]])),
    () => window.clearTimeout(revealTimer),
    () => progress.stop(),
    ...card.tiles.map((tile) => tile.stop),
  );
}

function titleOf({ newRecord, medal }: ArenaRunSummary): string {
  const copy = i18n.t.features.arena;
  if (newRecord) return copy.newRecord;
  return medal > NO_MEDAL ? copy.goodRun : i18n.t.levelFailed;
}

function celebrate(panel: HTMLElement): void {
  panel.append(confetti());
  sfx.sparkle();
}

function actionsRow({ secondary, note, primary }: MedalCard): HTMLElement {
  return el(
    'div',
    { class: 'actions result-actions' },
    secondary
      ? el('button', {
          class: 'button button-ghost',
          text: secondary.label,
          onClick: secondary.run,
        })
      : null,
    note ? el('p', { class: 'result-note', text: note }) : null,
    primaryButton(primary.label, primary.run),
  );
}
