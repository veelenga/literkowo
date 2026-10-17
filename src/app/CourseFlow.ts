import type { Level } from '../course/catalog';
import { levelCoins } from '../course/coins';
import { courseFor } from '../course/course';
import {
  markStorySeen,
  recordResult,
  storyAfter,
  storyBefore,
  type Attempt,
} from '../course/progress';
import { starsFor } from '../course/scoring';
import type { GameResult } from '../game/Game';
import { levelPlan } from '../game/LevelPlan';
import type { Profile } from '../profiles/Profile';
import type { StoryScene } from '../story/story';
import { learnCard } from '../ui/LearnCard';
import { levelResult } from '../ui/LevelResult';
import type { Overlay } from '../ui/overlay';
import type { ShopExit, ShopTab } from '../ui/ShopScreen';
import { storyCard } from '../ui/StoryCard';
import { earnedOf } from './earned';
import type { GameRun } from './GameRun';
import { runCoinsOf, runTotalsOf } from './runTotals';

export interface CourseHost {
  showMap(profile: Profile): void;
  showShop(profile: Profile, exit: ShopExit, tab?: ShopTab): void;
  startRun(profile: Profile, run: GameRun): void;
  clearScreen(): void;
  openOverlay(overlay: Overlay): void;
  dismissThen(next: () => void): () => void;
  save(profile: Profile): Profile;
}

type Leave = (profile: Profile) => void;

export class CourseFlow {
  constructor(private readonly host: CourseHost) {}

  open(profile: Profile, level: Level): void {
    const story = storyBefore(profile, level);
    if (!story) return this.showLearnCard(profile, level);
    const seen = this.host.save(markStorySeen(profile, story.id));
    this.showStory(story, () => this.showLearnCard(seen, level));
  }

  start(profile: Profile, level: Level): void {
    this.host.startRun(profile, {
      level,
      plan: levelPlan(level, profile.wordLanguage),
      rotateHint: courseFor(profile.wordLanguage).isFirst(level),
      canEnd: false,
      onFinished: (result) => this.finish(profile, level, result),
      restart: () => this.start(profile, level),
    });
  }

  private showLearnCard(profile: Profile, level: Level): void {
    if (level.isBoss) return this.start(profile, level);
    this.host.openOverlay(
      learnCard(level, profile.keyStats, {
        onStart: this.host.dismissThen(() => this.start(profile, level)),
        onClose: this.host.dismissThen(() => this.host.showMap(profile)),
      }),
    );
  }

  private finish(profile: Profile, level: Level, result: GameResult): void {
    const stars = starsFor(result.accuracy, result.won);
    const coins = levelCoins({ ...runCoinsOf(result), won: result.won, stars });
    const updated = this.host.save(recordResult(profile, level, attemptOf(result, stars, coins)));
    const next = openNext(updated, level);
    const leave = (then: Leave) =>
      this.host.dismissThen(() => this.afterLevel(updated, level, stars, then));
    this.host.openOverlay(
      levelResult(result, stars, earnedOf(profile, updated, result.xp, coins), {
        onNext: next ? leave((current) => this.open(current, next)) : undefined,
        onRetry: this.host.dismissThen(() => this.open(updated, level)),
        onMap: leave((current) => this.host.showMap(current)),
        onShop: (tab) => leave((current) => this.openShop(current, tab))(),
      }),
    );
  }

  private afterLevel(profile: Profile, level: Level, stars: number, then: Leave): void {
    const story = storyAfter(profile, level, stars);
    if (!story) return then(profile);
    const seen = this.host.save(markStorySeen(profile, story.id));
    this.showStory(story, () => then(seen));
  }

  private openShop(profile: Profile, tab?: ShopTab): void {
    this.host.showShop(profile, { onBack: (current) => this.host.showMap(current) }, tab);
  }

  private showStory(scene: StoryScene, then: () => void): void {
    this.host.clearScreen();
    this.host.openOverlay(storyCard(scene, this.host.dismissThen(then)));
  }
}

function attemptOf(result: GameResult, stars: number, coins: number): Attempt {
  return {
    ...runTotalsOf(result),
    stars,
    accuracy: result.accuracy,
    wpm: result.wpm,
    coins,
  };
}

function openNext(profile: Profile, level: Level): Level | undefined {
  const course = courseFor(profile.wordLanguage);
  const next = course.next(level);
  return next && course.isUnlocked(next, profile) ? next : undefined;
}
