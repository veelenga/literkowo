import { NO_MEDAL, type Medal } from '../../arena/medals';
import { accuracyPercent } from '../../course/scoring';
import type { GameResult } from '../../game/Game';
import { i18n } from '../../i18n/i18n';
import type { Overlay } from '../overlay';
import { resultOverlay, statTile, type ResultRewards } from '../ResultOverlay';
import type { OpenShop } from '../resultTreasures';
import { largeMedalBadge, nextMedalHint } from './arenaParts';

export interface ArenaRunSummary {
  readonly result: GameResult;
  readonly wavesCleared: number;
  readonly medal: Medal;
  readonly newRecord: boolean;
  readonly earned: ResultRewards;
}

interface ArenaResultActions {
  onArena: () => void;
  onRetry: () => void;
  onShop: OpenShop;
}

export function arenaResult(summary: ArenaRunSummary, actions: ArenaResultActions): Overlay {
  const t = i18n.t;
  const { result, medal, newRecord, earned } = summary;
  const won = newRecord || medal > NO_MEDAL;
  const again = { label: t.features.arena.again, run: actions.onRetry };
  return resultOverlay({
    variant: 'arena-result',
    mood: won ? 'won' : 'lost',
    title: titleOf(summary),
    badge: largeMedalBadge(medal),
    hint: nextMedalHint(medal),
    tiles: [
      statTile(t.features.arena.waves, summary.wavesCleared),
      statTile(t.score, result.score),
      statTile(t.accuracy, accuracyPercent(result.accuracy), '%'),
    ],
    earned,
    celebrate: newRecord,
    actions: {
      buttons: [{ label: t.features.arena.title, run: actions.onArena }, again],
      primary: again,
    },
    onShop: actions.onShop,
  });
}

function titleOf({ newRecord, medal }: ArenaRunSummary): string {
  const copy = i18n.t.features.arena;
  if (newRecord) return copy.newRecord;
  return medal > NO_MEDAL ? copy.goodRun : i18n.t.levelFailed;
}
