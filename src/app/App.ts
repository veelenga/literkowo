import { music } from '../audio/Music';
import { sfx } from '../audio/Sfx';
import { regionOf, type Level } from '../course/catalog';
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
import { hasCoarsePointer } from '../game/deviceProbe';
import type { Game, GameResult } from '../game/Game';
import type { SessionStats } from '../game/SessionStats';
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
import { ShopScreen } from '../ui/ShopScreen';
import { storyCard } from '../ui/StoryCard';
import { TouchTyping } from '../ui/TouchTyping';
import { WorldMap } from '../ui/WorldMap';
import { devLevelFromUrl, devProfile, unlockAudioOnFirstInput } from './devShortcut';
import { loadGameModule, prefetchGameModule, type GameModule } from './gameModule';
import { PageAttention } from './PageAttention';

const COMBO_FOR_FULL_INTENSITY = 20;
const FULL_INTENSITY = 1;

export class App {
  private readonly store = new ProfileStore();
  private readonly screen = el('div', { class: 'app-screen' });
  private readonly overlays: OverlaySlot;
  private readonly attention = new PageAttention((away) => this.onAttentionChange(away));
  private game: Game | undefined;
  private touch: TouchTyping | undefined;
  private pause: Overlay | undefined;
  private levelToken = 0;
  private disposeScreen: (() => void) | undefined;

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
    this.startLevel(devProfile(this.store.active()), level);
  }

  private showProfiles(): void {
    this.leaveScreen();
    const screen = new ProfileScreen(this.store, {
      onPlay: (profile) => {
        sfx.unlock();
        this.showMap(profile);
      },
    });
    this.showScreen(screen.element);
    this.disposeScreen = () => screen.dispose();
  }

  private showMap(profile: Profile): void {
    this.leaveScreen();
    music.stop();
    prefetchGameModule();
    const map = new WorldMap(profile, {
      onPlay: (level) => this.openLevel(profile, level),
      onSwitchPlayer: () => this.showProfiles(),
      onShop: () => this.showShop(profile),
    });
    this.showScreen(map.element);
  }

  private showShop(profile: Profile): void {
    this.leaveScreen();
    const shop = new ShopScreen(profile, {
      onBack: (current) => this.showMap(current),
      onChange: (current) => this.save(current),
    });
    this.showScreen(shop.element);
    this.disposeScreen = () => shop.dispose();
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
        profile.keyStats,
        this.dismissThen(() => this.startLevel(profile, level)),
      ),
    );
  }

  private startLevel(profile: Profile, level: Level): void {
    this.leaveScreen();
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
    const type = (char: string) => this.game?.typeCharacter(char);
    const hud = new Hud(profile, {
      onMap: () => this.showMap(profile),
      onPause: () => this.game?.togglePause(),
    });
    const keyboard = new KeyboardHint(type);
    const callouts = new Callouts();
    this.showScreen(
      el('div', { class: 'level-screen' }, stage, callouts.element, hud.element, keyboard.element),
    );
    if (hasCoarsePointer()) this.touch = new TouchTyping(stage, type);

    const config = {
      character: profile.avatar,
      level,
      language: profile.wordLanguage,
      theme: themeFor(regionOf(level).theme),
      keyStats: profile.keyStats,
      equipped: profile.equipped,
    };
    music.play(config.theme.id, level.isBoss ? 'boss' : 'calm');
    this.game = new Game(stage, config, {
      onStats: (stats, lives) => {
        hud.update(stats, lives);
        callouts.setFever(stats.fever);
        music.setIntensity(musicIntensity(stats));
      },
      onRewards: (rewards) => hud.setRewards(rewards),
      onNextKey: (char) => keyboard.show(char),
      onProgress: (progress) => hud.progress(progress),
      onAnnounce: (text, style, accent) => callouts.show(text, style, accent),
      onPause: (paused) => this.setPaused(paused),
      onFinished: (result) => this.finishLevel(profile, level, result),
    });
    this.game.start();
    if (this.attention.away) this.game.suspend();
  }

  private onAttentionChange(away: boolean): void {
    if (away) this.game?.suspend();
    else this.game?.wake();
    this.syncAudio();
  }

  private syncAudio(): void {
    if (this.attention.away || this.pause) music.pause();
    else music.resume();
  }

  private setPaused(paused: boolean): void {
    if (paused) this.pauseLevel();
    else this.resumeLevel();
  }

  private pauseLevel(): void {
    music.pause();
    this.pause = pauseOverlay(() => this.game?.togglePause(), this.game?.keyStats ?? {});
    this.overlays.open(this.pause);
  }

  private resumeLevel(): void {
    music.resume();
    if (this.pause) this.overlays.release(this.pause);
    this.pause = undefined;
    this.touch?.focus();
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
    const coins = levelCoins({ runCoins: result.coins, won: result.won, stars });
    const updated = this.recordAttempt(profile, level, attemptOf(result, stars, coins));
    const next = courseFor(updated.wordLanguage).next(level);
    const leave = (then: (current: Profile) => void) =>
      this.dismissThen(() => this.afterLevel(updated, level, stars, then));
    this.overlays.open(
      levelResult(
        result,
        stars,
        { xpBefore: profile.xp, xp: result.xp, coins },
        {
          onNext: next ? leave((current) => this.openLevel(current, next)) : undefined,
          onRetry: this.dismissThen(() => this.openLevel(updated, level)),
          onMap: leave((current) => this.showMap(current)),
        },
      ),
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
    this.leaveScreen();
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

  private leaveScreen(): void {
    this.disposeScreen?.();
    this.disposeScreen = undefined;
    this.levelToken += 1;
    this.game?.destroy();
    this.game = undefined;
    this.touch?.dispose();
    this.touch = undefined;
    this.pause = undefined;
    this.syncAudio();
  }
}

function musicIntensity(stats: SessionStats): number {
  if (stats.fever) return FULL_INTENSITY;
  return Math.min(FULL_INTENSITY, stats.combo / COMBO_FOR_FULL_INTENSITY);
}

function attemptOf(result: GameResult, stars: number, coins: number): Attempt {
  return {
    stars,
    score: result.score,
    accuracy: result.accuracy,
    wpm: result.wpm,
    lettersFreed: result.lettersFreed,
    xp: result.xp,
    coins,
    keyStats: result.keys.practised,
  };
}
