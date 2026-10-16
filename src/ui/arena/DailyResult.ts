import type { DailyOutcome } from '../../arena/dailyProgress';
import { nextDailyGoal, type DailyFormat } from '../../arena/formats';
import { NO_MEDAL, type Medal } from '../../arena/medals';
import { accuracyPercent } from '../../course/scoring';
import type { GameResult } from '../../game/Game';
import { format } from '../../i18n/format';
import { i18n } from '../../i18n/i18n';
import { clockText } from '../clock';
import { el } from '../dom';
import { statTile, type LevelRewards, type StatTile } from '../LevelResult';
import type { Overlay } from '../overlay';
import { coinPill } from '../progression';
import type { OpenShop } from '../resultTreasures';
import { medalName } from './arenaParts';
import { medalResult } from './ArenaResult';
import { minutesText } from './DailyCard';

export interface DailyRunSummary {
  readonly result: GameResult;
  readonly format: DailyFormat;
  readonly outcome: Pick<DailyOutcome, 'medal' | 'improved' | 'triesLeft' | 'payout'>;
  readonly earned: LevelRewards;
}

interface DailyResultActions {
  onArena: () => void;
  onRetry: () => void;
  onShop: OpenShop;
}

type CoinLine = keyof DailyOutcome['payout'];

const COIN_LINES: readonly Exclude<CoinLine, 'total' | 'run'>[] = [
  'stamp',
  'medal',
  'chests',
  'family',
];
const PLUS = '+';

export function dailyResult(summary: DailyRunSummary, actions: DailyResultActions): Overlay {
  const { outcome, earned } = summary;
  const arena = { label: i18n.t.features.arena.title, run: actions.onArena };
  const canRetry = outcome.triesLeft > 0;
  return medalResult({
    variant: 'arena-result daily-result',
    title: titleOf(summary),
    medal: outcome.medal,
    hint: nextDailyHint(summary.format, outcome.medal),
    tiles: tilesOf(summary),
    earned,
    won: outcome.medal > NO_MEDAL,
    celebrate: outcome.improved && outcome.medal > NO_MEDAL,
    details: coinLines(outcome.payout),
    secondary: canRetry ? arena : undefined,
    note: canRetry ? undefined : i18n.t.features.daily.tomorrow,
    primary: canRetry ? { label: i18n.t.features.arena.again, run: actions.onRetry } : arena,
    onShop: actions.onShop,
  });
}

export function nextDailyHint(daily: DailyFormat, medal: Medal): string {
  const copy = i18n.t.features;
  const goal = nextDailyGoal(daily, medal);
  if (!goal) return copy.arena.topMedal;
  const values = {
    medal: medalName(medal),
    next: medalName(goal.medal),
    accuracy: goal.accuracyPercent,
  };
  if (goal.grade === 'pace') return format(copy.daily.nextPace, { ...values, pace: goal.target });
  return format(copy.daily.nextTime, { ...values, time: minutesText(goal.target) });
}

function titleOf({ outcome }: DailyRunSummary): string {
  if (outcome.medal === NO_MEDAL) return i18n.t.levelFailed;
  return outcome.improved ? i18n.t.features.daily.bestToday : i18n.t.features.arena.goodRun;
}

function tilesOf({ result, format: daily }: DailyRunSummary): StatTile[] {
  const t = i18n.t;
  const copy = t.features.daily;
  const timing =
    daily.grade === 'pace'
      ? statTile(copy.pace, result.wpm, t.wpm)
      : statTile(copy.time, result.seconds, undefined, clockText);
  return [
    statTile(t.words, result.tally.words),
    timing,
    statTile(t.accuracy, accuracyPercent(result.accuracy), '%'),
  ];
}

function coinLines(payout: DailyOutcome['payout']): HTMLElement {
  const copy = i18n.t.features.daily.coins;
  const extras = COIN_LINES.filter((line) => payout[line] > 0);
  return el(
    'ul',
    { class: 'daily-coins' },
    coinLine(copy.run, payout.run),
    ...extras.map((line) => coinLine(copy[line], payout[line])),
  );
}

function coinLine(label: string, coins: number): HTMLElement {
  return el(
    'li',
    { class: 'daily-coin' },
    el('span', { class: 'daily-coin-label', text: label }),
    coinPill(`${PLUS}${coins}`, 'coin-pill daily-coin-pill'),
  );
}
