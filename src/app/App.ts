import { music } from '../audio/Music';
import { sfx } from '../audio/Sfx';
import { levelById, nextLevel, regionOf, regionsFor, type Level } from '../course/regions';
import { starsFor } from '../course/scoring';
import type { Game, GameResult } from '../game/Game';
import { i18n } from '../i18n/i18n';
import { createProfile, type Profile } from '../profiles/Profile';
import { ProfileStore } from '../profiles/ProfileStore';
import { storyScene } from '../story/story';
import { el } from '../ui/dom';
import { pauseOverlay } from '../ui/PauseOverlay';
import { Hud } from '../ui/Hud';
import { KeyboardHint } from '../ui/KeyboardHint';
import { learnCard } from '../ui/LearnCard';
import { levelResult } from '../ui/LevelResult';
import { ProfileScreen } from '../ui/ProfileScreen';
import { storyCard } from '../ui/StoryCard';
import { WorldMap } from '../ui/WorldMap';

const COMBO_FOR_FULL_INTENSITY = 20;

const loadGameModule = (() => {
  let pending: Promise<typeof import('../game/Game')> | undefined;
  return () => (pending ??= import('../game/Game'));
})();

export class App {
  private readonly store = new ProfileStore();
  private game: Game | undefined;
  private levelToken = 0;

  constructor(private readonly root: HTMLElement) {}

  start(): void {
    document.documentElement.lang = i18n.current;
    const devLevel = levelById(new URLSearchParams(location.search).get('level') ?? '');
    if (devLevel) return void this.startLevel(this.devProfile(), devLevel);
    this.showProfiles();
  }

  private devProfile(): Profile {
    const existing = this.store.active() ?? this.store.all()[0];
    if (existing) return existing;
    const profile = createProfile('Test', '🦊');
    this.store.add(profile);
    return profile;
  }

  private showProfiles(): void {
    this.teardownGame();
    const screen = new ProfileScreen(this.store, {
      onPlay: (profile) => {
        sfx.unlock();
        this.showMap(profile);
      },
    });
    this.root.replaceChildren(screen.element);
  }

  private showMap(profile: Profile): void {
    this.teardownGame();
    music.stop();
    void loadGameModule();
    const map = new WorldMap(profile, {
      onPlay: (level) => this.openLevel(profile, level),
      onSwitchPlayer: () => this.showProfiles(),
    });
    this.root.replaceChildren(map.element);
  }

  private openLevel(profile: Profile, level: Level): void {
    const storyId = this.storyBefore(profile, level);
    const afterStory = () => this.showLearnCard(profile, level);
    if (!storyId) return afterStory();
    this.markStorySeen(profile, storyId);
    this.showStory(storyId, afterStory);
  }

  private showLearnCard(profile: Profile, level: Level): void {
    if (level.isBoss) return void this.startLevel(profile, level);
    this.root.append(learnCard(level, () => void this.startLevel(profile, level)));
  }

  private async startLevel(profile: Profile, level: Level): Promise<void> {
    this.teardownGame();
    const token = ++this.levelToken;
    const { Game, themeFor } = await loadGameModule();
    if (token !== this.levelToken) return;
    const stage = el('div', { class: 'stage' });
    const hud = new Hud(profile, () => this.showMap(profile));
    const keyboard = new KeyboardHint();
    let pause: HTMLElement | undefined;
    this.root.replaceChildren(stage, hud.element, keyboard.element);

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
      onPause: (paused) => {
        if (paused) music.pause();
        else music.resume();
        pause?.remove();
        pause = paused ? pauseOverlay() : undefined;
        if (pause) this.root.append(pause);
      },
      onFinished: (result) => this.finishLevel(profile, level, result),
    });
    this.game.start();
  }

  private finishLevel(profile: Profile, level: Level, result: GameResult): void {
    const stars = starsFor(result.accuracy, result.won);
    this.recordResult(profile, level, result, stars);
    const next = nextLevel(level, profile.wordLanguage);
    this.root.append(
      levelResult(result, stars, {
        onNext: next
          ? () => this.afterLevel(profile, level, stars, () => this.openLevel(profile, next))
          : undefined,
        onRetry: () => this.openLevel(profile, level),
        onMap: () => this.afterLevel(profile, level, stars, () => this.showMap(profile)),
      }),
    );
  }

  private afterLevel(profile: Profile, level: Level, stars: number, then: () => void): void {
    const storyId = stars > 0 ? this.storyAfter(profile, level) : undefined;
    if (!storyId) return then();
    this.markStorySeen(profile, storyId);
    this.showStory(storyId, then);
  }

  private recordResult(profile: Profile, level: Level, result: GameResult, stars: number): void {
    const previous = profile.levelResults[level.id];
    const improved =
      !previous ||
      stars > previous.stars ||
      (stars === previous.stars && result.score > previous.score);
    if (improved) {
      profile.levelResults[level.id] = {
        stars,
        score: result.score,
        accuracy: result.accuracy,
        wpm: result.wpm,
      };
    }
    profile.totalScore += result.score;
    profile.lettersFreed += result.lettersFreed;
    this.store.update(profile);
  }

  private storyBefore(profile: Profile, level: Level): string | undefined {
    const region = regionOf(level);
    const first = regionsFor(profile.wordLanguage)[0];
    if (level.index === 1 && region.id === first.id) return this.unseen(profile, 'intro');
    if (level.isBoss) return this.unseen(profile, `boss-${region.id}`);
    return undefined;
  }

  private storyAfter(profile: Profile, level: Level): string | undefined {
    if (!level.isBoss) return undefined;
    const isLast = !nextLevel(level, profile.wordLanguage);
    return this.unseen(profile, isLast ? 'finale' : `after-${level.regionId}`);
  }

  private unseen(profile: Profile, storyId: string): string | undefined {
    return !profile.seenStories.includes(storyId) && storyScene(storyId) ? storyId : undefined;
  }

  private markStorySeen(profile: Profile, storyId: string): void {
    profile.seenStories.push(storyId);
    this.store.update(profile);
  }

  private showStory(storyId: string, then: () => void): void {
    this.teardownGame();
    this.root.append(storyCard(storyScene(storyId)!, then));
  }

  private teardownGame(): void {
    this.levelToken += 1;
    this.game?.destroy();
    this.game = undefined;
  }
}
