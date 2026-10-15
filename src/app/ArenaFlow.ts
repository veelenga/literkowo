import { endlessPlan, type ArenaChoice } from '../arena/endlessPlan';
import { recordEndlessRun, type EndlessAttempt, type EndlessOutcome } from '../arena/progress';
import { hasNewItems } from '../course/inventory';
import { practiceDay } from '../course/keyStats';
import { freshTrophies } from '../course/trophies';
import type { GameResult } from '../game/Game';
import { i18n } from '../i18n/i18n';
import type { Profile } from '../profiles/Profile';
import { arenaResult, type ArenaRunSummary } from '../ui/arena/ArenaResult';
import { ArenaScreen } from '../ui/arena/ArenaScreen';
import type { Overlay } from '../ui/overlay';
import type { ShopExit, ShopTab } from '../ui/ShopScreen';
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
}

export class ArenaFlow {
  constructor(private readonly host: ArenaHost) {}

  show(profile: Profile, previous?: ArenaChoice): void {
    this.host.showMenu(
      () =>
        new ArenaScreen(
          profile,
          {
            onBack: (current) => this.host.showMap(current),
            onPlay: (current, choice) => this.start(current, choice),
          },
          previous,
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

  private finish(profile: Profile, choice: ArenaChoice, result: GameResult): void {
    const outcome = recordEndlessRun(profile, endlessAttemptOf(choice, result));
    const updated = this.host.save(outcome.profile);
    this.host.openOverlay(
      arenaResult(summaryOf(profile, updated, result, outcome), {
        onArena: this.host.dismissThen(() => this.show(updated, choice)),
        onRetry: this.host.dismissThen(() => this.start(updated, choice)),
        onShop: (tab) => this.host.dismissThen(() => this.openShop(updated, choice, tab))(),
      }),
    );
  }

  private openShop(profile: Profile, choice: ArenaChoice, tab?: ShopTab): void {
    const backLabel = i18n.t.features.arena.title;
    this.host.showShop(
      profile,
      { onBack: (current) => this.show(current, choice), backLabel },
      tab,
    );
  }
}

function summaryOf(
  before: Profile,
  after: Profile,
  result: GameResult,
  outcome: EndlessOutcome,
): ArenaRunSummary {
  const treasures = {
    trophies: freshTrophies(before, after),
    newItems: hasNewItems(before, after),
    arenaOpened: false,
  };
  return {
    result,
    wavesCleared: result.phasesCleared,
    medal: outcome.medal,
    newRecord: outcome.newBestWave,
    earned: { xpBefore: before.xp, xp: result.xp, coins: outcome.payout.total, treasures },
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
    keyStats: result.keys.practised,
    date: practiceDay(new Date()),
  };
}
