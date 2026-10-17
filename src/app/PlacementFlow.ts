import {
  placementOutcome,
  placementStages,
  type PlacementOutcome,
  type PlacementStage,
} from '../arena/placement';
import { placementLevel, placementPlan } from '../arena/placementPlan';
import {
  FINGERS_CARD_ID,
  recordPlacement,
  showsFingersCard,
  skippedKeys,
  startRegion,
  type PlacementAttempt,
} from '../arena/placementProgress';
import type { Region } from '../course/catalog';
import { practiceDay } from '../course/keyStats';
import { markStorySeen } from '../course/progress';
import type { GameResult } from '../game/Game';
import type { Profile } from '../profiles/Profile';
import type { Overlay } from '../ui/overlay';
import { fingersCard } from '../ui/placement/FingersCard';
import { placementIntro } from '../ui/placement/PlacementIntro';
import { placementResult } from '../ui/placement/PlacementResult';
import type { ShopExit, ShopTab } from '../ui/ShopScreen';
import { earnedOf } from './earned';
import type { GameRun } from './GameRun';

export interface PlacementHost {
  showMap(profile: Profile): void;
  showArena(profile: Profile): void;
  showShop(profile: Profile, exit: ShopExit, tab?: ShopTab): void;
  startRun(profile: Profile, run: GameRun): void;
  openOverlay(overlay: Overlay): void;
  dismissThen(next: () => void): () => void;
  save(profile: Profile): Profile;
}

type Leave = (profile: Profile) => void;

export class PlacementFlow {
  constructor(private readonly host: PlacementHost) {}

  offer(profile: Profile, onClose: () => void): void {
    const stages = placementStages(profile.wordLanguage);
    this.host.openOverlay(
      placementIntro(regionsOf(stages), {
        onStart: this.host.dismissThen(() => this.start(profile)),
        onClose: this.host.dismissThen(onClose),
      }),
    );
  }

  start(profile: Profile): void {
    const stages = placementStages(profile.wordLanguage);
    this.host.startRun(profile, {
      level: placementLevel(stages),
      plan: placementPlan(stages),
      rotateHint: false,
      canEnd: false,
      onFinished: (result) => this.finish(profile, stages, result),
      restart: () => this.start(profile),
    });
  }

  private finish(profile: Profile, stages: readonly PlacementStage[], result: GameResult): void {
    const outcome = placementOutcome(stages, result.phases);
    const record = recordPlacement(profile, attemptOf(outcome, result));
    const updated = this.host.save(record.profile);
    const earned = earnedOf(profile, updated, result.xp, record.coins);
    const leave = (then: Leave) => this.host.dismissThen(() => this.afterResult(updated, then));
    const start = startRegion(updated);
    this.host.openOverlay(
      placementResult(
        { outcome, regions: regionsOf(stages), start, earned },
        {
          onMap: leave((current) => this.host.showMap(current)),
          onArena: start ? leave((current) => this.host.showArena(current)) : undefined,
          onShop: (tab) => this.host.dismissThen(() => this.openShop(updated, tab))(),
        },
      ),
    );
  }

  private openShop(profile: Profile, tab?: ShopTab): void {
    this.host.showShop(profile, { onBack: (current) => this.host.showMap(current) }, tab);
  }

  private afterResult(profile: Profile, then: Leave): void {
    if (!showsFingersCard(profile)) return then(profile);
    const seen = this.host.save(markStorySeen(profile, FINGERS_CARD_ID));
    const next = this.host.dismissThen(() => then(seen));
    this.host.openOverlay(fingersCard(skippedKeys(seen), { onStart: next, onClose: next }));
  }
}

function regionsOf(stages: readonly PlacementStage[]): Region[] {
  return stages.map((stage) => stage.keySet.region);
}

function attemptOf(outcome: PlacementOutcome, result: GameResult): PlacementAttempt {
  return {
    outcome,
    keyStats: result.keys.practised,
    date: practiceDay(new Date()),
    score: result.score,
    lettersFreed: result.lettersFreed,
    xp: result.xp,
    runCoins: result.coins,
    coinBoost: result.coinBoost,
    tally: result.tally,
  };
}
