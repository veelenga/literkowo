import type { PlacementOutcome } from '../../arena/placement';
import { sfx } from '../../audio/Sfx';
import type { Region } from '../../course/catalog';
import { accuracyPercent } from '../../course/scoring';
import { format } from '../../i18n/format';
import { i18n } from '../../i18n/i18n';
import { confetti } from '../confetti';
import { el, prefersReducedMotion } from '../dom';
import { statTile } from '../LevelResult';
import { createOverlay, type Overlay } from '../overlay';
import { primaryHint } from '../shortcutHint';
import { CLOSE_KEY, onCardKeys, stageChips, START_KEY } from './placementParts';

const REVEAL_DELAY_MS = 600;

export interface PlacementSummary {
  readonly outcome: PlacementOutcome;
  readonly regions: readonly Region[];
  readonly start: Region | undefined;
}

export interface PlacementResultActions {
  readonly onMap: () => void;
  readonly onArena?: () => void;
}

export function placementResult(
  summary: PlacementSummary,
  actions: PlacementResultActions,
): Overlay {
  const t = i18n.t;
  const copy = t.features.placement;
  const { outcome, regions, start } = summary;
  const tiles = [
    statTile(t.accuracy, accuracyPercent(outcome.accuracy), '%'),
    statTile(t.speed, outcome.wpm, t.wpm),
  ];
  const panel = el(
    'div',
    { class: `panel panel-center result-panel placement-result ${start ? 'is-won' : 'is-calm'}` },
    el('h2', { class: 'result-title', text: headline(start) }),
    stageChips(regions, outcome.passed),
    el('p', { class: 'result-hint', text: start ? copy.skippedHint : copy.beginnerHint }),
    el('div', { class: 'result-stats' }, ...tiles.map((tile) => tile.element)),
    actionsRow(actions),
  );
  const revealTimer = window.setTimeout(
    () => {
      tiles.forEach((tile) => tile.reveal());
      if (start) celebrate(panel);
    },
    prefersReducedMotion() ? 0 : REVEAL_DELAY_MS,
  );
  return createOverlay(
    el('div', { class: 'overlay' }, panel),
    onCardKeys(
      new Map([
        [START_KEY, actions.onMap],
        [CLOSE_KEY, actions.onMap],
      ]),
    ),
    () => window.clearTimeout(revealTimer),
    ...tiles.map((tile) => tile.stop),
  );
}

function headline(start: Region | undefined): string {
  const copy = i18n.t.features.placement;
  if (!start) return copy.fromStart;
  return format(copy.startsHere, { region: start.name[i18n.current] });
}

function celebrate(panel: HTMLElement): void {
  panel.append(confetti());
  sfx.sparkle();
}

function actionsRow({ onMap, onArena }: PlacementResultActions): HTMLElement {
  const arena = onArena
    ? el('button', {
        class: 'button button-ghost',
        text: i18n.t.features.arena.title,
        onClick: onArena,
      })
    : null;
  return el(
    'div',
    { class: 'actions result-actions' },
    arena,
    el(
      'button',
      { class: 'button button-primary button-large', onClick: onMap },
      i18n.t.features.placement.toMap,
      primaryHint(),
    ),
  );
}
