import { music } from '../audio/Music';
import { sfx } from '../audio/Sfx';
import { regionOf, type Level } from '../course/catalog';
import { courseFor } from '../course/course';
import {
  markStorySeen,
  recordResult,
  storyAfter,
  storyBefore,
  type Attempt,
} from '../course/progress';
import { starsFor } from '../course/scoring';
import type { Game, GameResult } from '../game/Game';
import { i18n } from '../i18n/i18n';
import type { Profile } from '../profiles/Profile';
import { ProfileStore } from '../profiles/ProfileStore';
import type { StoryScene } from '../story/story';
import { el } from '../ui/dom';
import { Callouts } from '../ui/Callouts';
import { Hud } from '../ui/Hud';
import { KeyboardHint } from '../ui/KeyboardHint';
import { learnCard } from '../ui/LearnCard';
import { levelResult } from '../ui/LevelResult';
import { loadErrorOverlay } from '../ui/LoadErrorOverlay';
import { OverlaySlot, type Overlay } from '../ui/overlay';
import { pauseOverlay } from '../ui/PauseOverlay';
import { ProfileScreen } from '../ui/ProfileScreen';
import { storyCard } from '../ui/StoryCard';
import { WorldMap } from '../ui/WorldMap';
import { devLevelFromUrl, devProfile, unlockAudioOnFirstInput } from './devShortcut';
import { loadGameModule, prefetchGameModule, type GameModule } from './gameModule';

const COMBO_FOR_FULL_INTENSITY = 20;

export class App {
  private readonly store = new ProfileStore();
  private readonly screen = el('div', { class: 'app-screen' });
  private readonly overlays: OverlaySlot;
  private game: Game | undefined;
  private pause: Overlay | undefined;
  private levelToken = 0;

  constructor(private readonly root: HTMLElement) {
    this.overlays = new OverlaySlot(root, this.screen);
  }

  start(): void {
    document.documentElement.lang = i18n.current;
    this.root.replaceChildren(this.screen);
    if (import.meta.env.DEV) {
      const level = devLevelFromUrl();
      if (level) return this.startDevLevel(level);
    }
    this.showProfiles();
  }

  private startDevLevel(level: Level): void {
    unlockAudioOnFirstInput();
    this.startLevel(devProfile(), level);
  }

  private showProfiles(): void {
    this.teardownGame();
    const screen = new ProfileScreen(this.store, {
      onPlay: (profile) => {
        sfx.unlock();
        this.showMap(profile);
      },
    });
    this.showScreen(screen.element);
  }

  private showMap(profile: Profile): void {
    this.teardownGame();
    music.stop();
    prefetchGameModule();
    const map = new WorldMap(profile, {
      onPlay: (level) => this.openLevel(profile, level),
      onSwitchPlayer: () => this.showProfiles(),
    });
    this.showScreen(map.element);
  }

  private openLevel(profile: Profile, level: Level): void {
    const story = storyBefore(profile, level);
    if (!story) return this.showLearnCard(profile, level);
    const updated = this.save(markStorySeen(profile, story.id));
    this.showStory(story, () => this.showLearnCard(updated, level));
  }

  private showLearnCard(profile: Profile, level: Level): void {
    if (level.isBoss) return this.startLevel(profile, level);
    this.overlays.open(
      learnCard(
        level,
        this.dismissThen(() => this.startLevel(profile, level)),
      ),
    );
  }

  private startLevel(profile: Profile, level: Level): void {
    this.teardownGame();
    const token = this.levelToken;
    loadGameModule()
      .then((module) => {
        if (this.isCurrent(token)) this.runLevel(module, profile, level);
      })
      .catch((error: unknown) => {
        if (this.isCurrent(token)) this.showLoadError(profile, level, error);
      });
  }

  private runLevel({ Game, themeFor }: GameModule, profile: Profile, level: Level): void {
    const stage = el('div', { class: 'stage' });
    const hud = new Hud(profile, () => this.showMap(profile));
    const keyboard = new KeyboardHint();
    const callouts = new Callouts();
    this.showScreen(stage, callouts.element, hud.element, keyboard.element);

    const config = {
      character: profile.avatar,
      level,
      language: profile.wordLanguage,
      theme: themeFor(regionOf(level).theme),
    };
    music.play(config.theme.id, level.isBoss ? 'boss' : 'calm');
    this.game = new Game(stage, config, {
      onStats: (stats, lives) => {
        hud.update(stats, lives);
        music.setIntensity(Math.min(1, stats.combo / COMBO_FOR_FULL_INTENSITY));
      },
      onNextKey: (char) => keyboard.show(char),
      onProgress: (progress) => hud.progress(progress),
      onCallout: (kind) => callouts.show(kind),
      onFever: (active) => {
        callouts.setFever(active);
        if (active) music.setIntensity(1);
      },
      onPause: (paused) => this.setPaused(paused),
      onFinished: (result) => this.finishLevel(profile, level, result),
    });
    this.game.start();
  }

  private setPaused(paused: boolean): void {
    if (paused) this.pauseLevel();
    else this.resumeLevel();
  }

  private pauseLevel(): void {
    music.pause();
    this.pause = pauseOverlay();
    this.overlays.open(this.pause);
  }

  private resumeLevel(): void {
    music.resume();
    if (this.pause) this.overlays.release(this.pause);
    this.pause = undefined;
  }

  private showLoadError(profile: Profile, level: Level, error: unknown): void {
    reportError(error);
    this.overlays.open(
      loadErrorOverlay({
        onRetry: this.dismissThen(() => this.startLevel(profile, level)),
        onMap: this.dismissThen(() => this.showMap(profile)),
      }),
    );
  }

  private finishLevel(profile: Profile, level: Level, result: GameResult): void {
    const stars = starsFor(result.accuracy, result.won);
    const updated = this.recordAttempt(profile, level, attemptOf(result, stars));
    const next = courseFor(updated.wordLanguage).next(level);
    const leave = (then: (current: Profile) => void) =>
      this.dismissThen(() => this.afterLevel(updated, level, stars, then));
    this.overlays.open(
      levelResult(result, stars, {
        onNext: next ? leave((current) => this.openLevel(current, next)) : undefined,
        onRetry: this.dismissThen(() => this.openLevel(updated, level)),
        onMap: leave((current) => this.showMap(current)),
      }),
    );
  }

  private recordAttempt(profile: Profile, level: Level, attempt: Attempt): Profile {
    let updated = profile;
    try {
      updated = recordResult(profile, level, attempt);
      this.store.update(updated);
    } catch (error) {
      reportError(error);
    }
    return updated;
  }

  private afterLevel(
    profile: Profile,
    level: Level,
    stars: number,
    then: (current: Profile) => void,
  ): void {
    const story = storyAfter(profile, level, stars);
    if (!story) return then(profile);
    const updated = this.save(markStorySeen(profile, story.id));
    this.showStory(story, () => then(updated));
  }

  private showStory(scene: StoryScene, then: () => void): void {
    this.teardownGame();
    this.overlays.open(storyCard(scene, this.dismissThen(then)));
  }

  private save(profile: Profile): Profile {
    this.store.update(profile);
    return profile;
  }

  private showScreen(...nodes: Node[]): void {
    this.overlays.close();
    this.screen.replaceChildren(...nodes);
  }

  private dismissThen(next: () => void): () => void {
    return () => {
      this.overlays.close();
      next();
    };
  }

  private isCurrent(token: number): boolean {
    return token === this.levelToken;
  }

  private teardownGame(): void {
    this.levelToken += 1;
    music.resume();
    this.game?.destroy();
    this.game = undefined;
    this.pause = undefined;
  }
}

function attemptOf(result: GameResult, stars: number): Attempt {
  return {
    stars,
    score: result.score,
    accuracy: result.accuracy,
    wpm: result.wpm,
    lettersFreed: result.lettersFreed,
  };
}
