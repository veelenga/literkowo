import { Game, type GameResult } from '../game/Game';
import { i18n } from '../i18n/i18n';
import type { Profile } from '../profiles/Profile';
import { ProfileStore } from '../profiles/ProfileStore';
import { gameOverOverlay, pauseOverlay } from '../ui/GameOverOverlay';
import { Hud } from '../ui/Hud';
import { KeyboardHint } from '../ui/KeyboardHint';
import { ProfileScreen } from '../ui/ProfileScreen';
import { el } from '../ui/dom';

export class App {
  private readonly store = new ProfileStore();
  private game: Game | undefined;

  constructor(private readonly root: HTMLElement) {}

  start(): void {
    document.documentElement.lang = i18n.current;
    this.showProfiles();
  }

  private showProfiles(): void {
    this.teardownGame();
    const screen = new ProfileScreen(this.store, {
      onPlay: (profile, lessonId) => this.startGame(profile, lessonId),
    });
    this.root.replaceChildren(screen.element);
  }

  private startGame(profile: Profile, lessonId: number): void {
    this.teardownGame();
    const stage = el('div', { class: 'stage' });
    const hud = new Hud(profile, () => this.showProfiles());
    const keyboard = new KeyboardHint();
    const hint = el('p', { class: 'start-hint', text: i18n.t.startHint });
    let pause: HTMLElement | undefined;
    this.root.replaceChildren(stage, hud.element, hint, keyboard.element);

    this.game = new Game(
      stage,
      { lessonId, language: profile.wordLanguage },
      {
        onStats: (stats, lives) => {
          hud.update(stats, lives);
          if (stats.hits > 0) hint.remove();
        },
        onNextKey: (char) => keyboard.show(char),
        onPause: (paused) => {
          pause?.remove();
          pause = paused ? pauseOverlay() : undefined;
          if (pause) this.root.append(pause);
        },
        onGameOver: (result) => this.finishGame(profile, lessonId, result),
      },
    );
    this.game.start();
  }

  private finishGame(profile: Profile, lessonId: number, result: GameResult): void {
    const isRecord = result.score > profile.bestScore;
    profile.bestScore = Math.max(profile.bestScore, result.score);
    profile.gamesPlayed += 1;
    const previous = profile.lessonResults[lessonId];
    if (!previous || previous.accuracy < result.accuracy) profile.lessonResults[lessonId] = result;
    this.store.update(profile);
    this.root.append(
      gameOverOverlay(result, isRecord, {
        onPlayAgain: () => this.startGame(profile, lessonId),
        onSwitchPlayer: () => this.showProfiles(),
      }),
    );
  }

  private teardownGame(): void {
    this.game?.destroy();
    this.game = undefined;
  }
}
