import type { PlacementOutcome } from '../../arena/placement';
import type { Region } from '../../course/catalog';
import { accuracyPercent } from '../../course/scoring';
import { format } from '../../i18n/format';
import { i18n } from '../../i18n/i18n';
import type { Overlay } from '../overlay';
import { resultOverlay, statTile, type ResultActions, type ResultRewards } from '../ResultOverlay';
import type { OpenShop } from '../resultTreasures';
import { stageChips } from './placementParts';

const REVEAL_DELAY_MS = 600;

export interface PlacementSummary {
  readonly outcome: PlacementOutcome;
  readonly regions: readonly Region[];
  readonly start: Region | undefined;
  readonly earned: ResultRewards;
}

export interface PlacementResultActions {
  readonly onMap: () => void;
  readonly onArena?: () => void;
  readonly onShop: OpenShop;
}

export function placementResult(
  summary: PlacementSummary,
  actions: PlacementResultActions,
): Overlay {
  const t = i18n.t;
  const copy = t.features.placement;
  const { outcome, regions, start, earned } = summary;
  return resultOverlay({
    variant: 'placement-result',
    mood: start ? 'won' : 'calm',
    title: headline(start),
    badge: stageChips(regions, outcome.passed),
    hint: start ? copy.skippedHint : copy.beginnerHint,
    tiles: [
      statTile(t.accuracy, accuracyPercent(outcome.accuracy), '%'),
      statTile(t.speed, outcome.wpm, t.wpm),
    ],
    earned,
    revealDelayMs: REVEAL_DELAY_MS,
    celebrate: start !== undefined,
    actions: resultActions(actions),
    onShop: actions.onShop,
  });
}

function headline(start: Region | undefined): string {
  const copy = i18n.t.features.placement;
  if (!start) return copy.fromStart;
  return format(copy.startsHere, { region: start.name[i18n.current] });
}

function resultActions({ onMap, onArena }: PlacementResultActions): ResultActions {
  const map = { label: i18n.t.features.placement.toMap, run: onMap };
  const arena = onArena ? [{ label: i18n.t.features.arena.title, run: onArena }] : [];
  return { buttons: [...arena, map], primary: map, onClose: onMap };
}
