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
import type { GameRun } from './GameRun';

export interface PlacementHost {
  showMap(profile: Profile): void;
  showArena(profile: Profile): void;
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
      onFinished: (result) => this.finish(profile, stages, result),
      restart: () => this.start(profile),
    });
  }

  private finish(profile: Profile, stages: readonly PlacementStage[], result: GameResult): void {
    const outcome = placementOutcome(stages, result.phases);
    const updated = this.host.save(recordPlacement(profile, attemptOf(outcome, result)));
    const leave = (then: Leave) => this.host.dismissThen(() => this.afterResult(updated, then));
    this.host.openOverlay(
      placementResult(
        { outcome, regions: regionsOf(stages) },
        {
          onMap: leave((current) => this.host.showMap(current)),
          onArena: outcome.placed ? leave((current) => this.host.showArena(current)) : undefined,
        },
      ),
    );
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
    score: result.score,
    lettersFreed: result.lettersFreed,
    xp: result.xp,
    keyStats: result.keys.practised,
    tally: result.tally,
    date: practiceDay(new Date()),
  };
}
