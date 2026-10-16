import { triesLeft } from '../arena/daily';
import { dailyPlan, type DailyChoice } from '../arena/dailyPlan';
import { payFamilyChest, recordDailyRun, type DailyAttempt } from '../arena/dailyProgress';
import { endlessPlan, type ArenaChoice } from '../arena/endlessPlan';
import { formatOn, type DailyFormat } from '../arena/formats';
import type { KeySet } from '../arena/keySets';
import { recordEndlessRun, type EndlessAttempt, type EndlessOutcome } from '../arena/progress';
import { systemClock, todayOf, type Clock } from '../arena/week';
import { practiceDay } from '../course/keyStats';
import type { GameResult } from '../game/Game';
import { i18n } from '../i18n/i18n';
import type { Profile } from '../profiles/Profile';
import { arenaResult, type ArenaRunSummary } from '../ui/arena/ArenaResult';
import { ArenaScreen, type ArenaMode } from '../ui/arena/ArenaScreen';
import { dailyResult } from '../ui/arena/DailyResult';
import type { Overlay } from '../ui/overlay';
import type { ShopExit, ShopTab } from '../ui/ShopScreen';
import { earnedOf } from './earned';
import type { GameRun } from './GameRun';

export interface Screen {
  readonly element: HTMLElement;
  dispose(): void;
}

export interface ArenaHost {
  showMenu(create: () => Screen): void;
  showMap(profile: Profile): void;
  showShop(profile: Profile, exit: ShopExit, tab?: ShopTab): void;
  startRun(profile: Profile, run: GameRun): void;
  openOverlay(overlay: Overlay): void;
  dismissThen(next: () => void): () => void;
  save(profile: Profile): Profile;
  profiles(): readonly Profile[];
  startTest(profile: Profile): void;
}

export interface DailyStart {
  readonly keySet: KeySet;
  readonly format?: DailyFormat;
  readonly previous?: ArenaChoice;
}

export class ArenaFlow {
  constructor(
    private readonly host: ArenaHost,
    private readonly clock: Clock = systemClock,
  ) {}

  show(profile: Profile, previous?: ArenaChoice, mode?: ArenaMode): void {
    const today = todayOf(this.clock);
    const paid = payFamilyChest(profile, this.familyOf(profile), today);
    const current = paid.coins > 0 ? this.host.save(paid.profile) : profile;
    this.host.showMenu(
      () =>
        new ArenaScreen(
          current,
          {
            onBack: (shown) => this.host.showMap(shown),
            onPlay: (shown, choice) => this.start(shown, choice),
            onDaily: (shown, keySet, choice) =>
              this.startDaily(shown, { keySet, previous: choice }),
            onTest: (shown) => this.host.startTest(shown),
            onShop: (shown, choice) => this.openShop(shown, choice, undefined, mode),
          },
          { previous, mode, family: this.familyOf(current), today },
        ),
    );
  }

  start(profile: Profile, choice: ArenaChoice): void {
    this.host.startRun(profile, {
      level: choice.keySet.bossLevel,
      plan: endlessPlan(choice),
      rotateHint: false,
      onFinished: (result) => this.finish(profile, choice, result),
      restart: () => this.start(profile, choice),
    });
  }

  startDaily(profile: Profile, start: DailyStart): void {
    const day = todayOf(this.clock);
    if (triesLeft(profile.arena.daily, day) === 0)
      return this.show(profile, start.previous, 'daily');
    const choice = { keySet: start.keySet, format: start.format ?? formatOn(day), day };
    this.host.startRun(profile, {
      level: start.keySet.bossLevel,
      plan: dailyPlan(choice),
      rotateHint: false,
      onFinished: (result) => this.finishDaily(profile, start, choice, result),
      restart: () => this.startDaily(profile, start),
    });
  }

  private finish(profile: Profile, choice: ArenaChoice, result: GameResult): void {
    const outcome = recordEndlessRun(profile, endlessAttemptOf(choice, result));
    const updated = this.host.save(outcome.profile);
    this.host.openOverlay(
      arenaResult(summaryOf(profile, updated, result, outcome), {
        onArena: this.host.dismissThen(() => this.show(updated, choice, 'endless')),
        onRetry: this.host.dismissThen(() => this.start(updated, choice)),
        onShop: (tab) =>
          this.host.dismissThen(() => this.openShop(updated, choice, tab, 'endless'))(),
      }),
    );
  }

  private finishDaily(
    profile: Profile,
    start: DailyStart,
    choice: DailyChoice,
    result: GameResult,
  ): void {
    const outcome = recordDailyRun(profile, dailyAttemptOf(choice, result), this.familyOf(profile));
    const updated = this.host.save(outcome.profile);
    const earned = earnedOf(profile, updated, result.xp, outcome.payout.total);
    const { previous } = start;
    this.host.openOverlay(
      dailyResult(
        { result, format: choice.format, outcome, earned },
        {
          onArena: this.host.dismissThen(() => this.show(updated, previous, 'daily')),
          onRetry: this.host.dismissThen(() => this.startDaily(updated, start)),
          onShop: (tab) =>
            this.host.dismissThen(() => this.openShop(updated, previous, tab, 'daily'))(),
        },
      ),
    );
  }

  private openShop(profile: Profile, choice?: ArenaChoice, tab?: ShopTab, mode?: ArenaMode): void {
    const backLabel = i18n.t.features.arena.title;
    this.host.showShop(
      profile,
      { onBack: (current) => this.show(current, choice, mode), backLabel },
      tab,
    );
  }

  private familyOf(profile: Profile): Profile[] {
    const others = this.host.profiles().filter((member) => member.id !== profile.id);
    return [...others, profile];
  }
}

function summaryOf(
  before: Profile,
  after: Profile,
  result: GameResult,
  outcome: EndlessOutcome,
): ArenaRunSummary {
  return {
    result,
    wavesCleared: result.phasesCleared,
    medal: outcome.medal,
    newRecord: outcome.newBestWave,
    earned: earnedOf(before, after, result.xp, outcome.payout.total),
  };
}

function endlessAttemptOf(choice: ArenaChoice, result: GameResult): EndlessAttempt {
  return {
    ...choice,
    wavesCleared: result.phasesCleared,
    score: result.score,
    accuracy: result.accuracy,
    lettersFreed: result.lettersFreed,
    xp: result.xp,
    runCoins: result.coins,
    coinBoost: result.coinBoost,
    keyStats: result.keys.practised,
    tally: result.tally,
    date: practiceDay(new Date()),
  };
}

function dailyAttemptOf(choice: DailyChoice, result: GameResult): DailyAttempt {
  return {
    choice,
    completed: result.won,
    seconds: result.seconds,
    score: result.score,
    accuracy: result.accuracy,
    wpm: result.wpm,
    lettersFreed: result.lettersFreed,
    xp: result.xp,
    runCoins: result.coins,
    coinBoost: result.coinBoost,
    keyStats: result.keys.practised,
    tally: result.tally,
  };
}
