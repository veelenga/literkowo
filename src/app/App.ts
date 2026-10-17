import { music } from '../audio/Music';
import type { MusicMood } from '../audio/music/specs';
import { sfx } from '../audio/Sfx';
import { regionOf } from '../course/catalog';
import { hasCoarsePointer } from '../game/deviceProbe';
import type { Game } from '../game/Game';
import type { PhaseKind } from '../game/RunPlan';
import type { SessionStats } from '../game/SessionStats';
import { i18n } from '../i18n/i18n';
import { requestPersistentStorage } from '../persistentStorage';
import type { Profile } from '../profiles/Profile';
import { ProfileStore } from '../profiles/ProfileStore';
import { el } from '../ui/dom';
import { Callouts } from '../ui/Callouts';
import { Hud } from '../ui/Hud';
import { usesBuiltInKeyboard } from '../ui/formFactor';
import { KeyboardHint } from '../ui/KeyboardHint';
import { KEYBOARD_LAYOUTS } from '../ui/keyboardLayout';
import { loadErrorOverlay } from '../ui/LoadErrorOverlay';
import { Notice } from '../ui/Notice';
import { OverlaySlot, type Overlay } from '../ui/overlay';
import { pauseOverlay } from '../ui/PauseOverlay';
import { ProfileScreen } from '../ui/ProfileScreen';
import { rotateHint } from '../ui/RotateHint';
import { SettingsScreen, settingsOverlay } from '../ui/SettingsScreen';
import { ShopScreen, type ShopExit, type ShopTab } from '../ui/ShopScreen';
import { watchStageInsets } from '../ui/stageInsets';
import { TouchTyping } from '../ui/TouchTyping';
import { WorldMap } from '../ui/WorldMap';
import {
  devArenaFromUrl,
  devDailyFromUrl,
  devLevelFromUrl,
  devPlacementFromUrl,
  devProfile,
  unlockAudioOnFirstInput,
} from './devShortcut';
import { ArenaFlow, type Screen } from './ArenaFlow';
import { CourseFlow } from './CourseFlow';
import type { GameRun } from './GameRun';
import { loadGameModule, prefetchGameModule, type GameModule } from './gameModule';
import { PageAttention } from './PageAttention';
import { PlacementFlow } from './PlacementFlow';
import { progressBackupActions } from './progressBackup';
import { saveWatch } from './saveWatch';

const COMBO_FOR_FULL_INTENSITY = 20;
const FULL_INTENSITY = 1;

export class App {
  private readonly notice = new Notice();
  private readonly store = new ProfileStore({
    onSave: saveWatch({
      onFirstSaved: () => void requestPersistentStorage(),
      onFirstUnsaved: () => this.notice.show(i18n.t.features.notice.unsaved),
    }),
  });
  private readonly backup = progressBackupActions({
    store: this.store,
    notify: (text) => this.notice.show(text),
    onImported: () => this.showProfiles(),
  });
  private readonly screen = el('div', { class: 'app-screen' });
  private readonly overlays: OverlaySlot;
  private readonly attention = new PageAttention((away) => this.onAttentionChange(away));
  private readonly arena = new ArenaFlow({
    showMenu: (create) => this.showMenu(create),
    showMap: (profile) => this.showMap(profile),
    showShop: (profile, exit, tab) => this.showShop(profile, exit, tab),
    startRun: (profile, run) => this.startRun(profile, run),
    openOverlay: (overlay) => this.overlays.open(overlay),
    dismissThen: (next) => this.dismissThen(next),
    save: (profile) => this.save(profile),
    profiles: () => this.store.all(),
    startTest: (profile) => this.placement.start(profile),
  });
  private readonly course = new CourseFlow({
    showMap: (profile) => this.showMap(profile),
    showShop: (profile, exit, tab) => this.showShop(profile, exit, tab),
    startRun: (profile, run) => this.startRun(profile, run),
    clearScreen: () => this.leaveScreen(),
    openOverlay: (overlay) => this.overlays.open(overlay),
    dismissThen: (next) => this.dismissThen(next),
    save: (profile) => this.save(profile),
  });
  private readonly placement = new PlacementFlow({
    showMap: (profile) => this.showMap(profile),
    showArena: (profile) => this.showArena(profile),
    showShop: (profile, exit, tab) => this.showShop(profile, exit, tab),
    startRun: (profile, run) => this.startRun(profile, run),
    openOverlay: (overlay) => this.overlays.open(overlay),
    dismissThen: (next) => this.dismissThen(next),
    save: (profile) => this.save(profile),
  });
  private game: Game | undefined;
  private run: GameRun | undefined;
  private touch: TouchTyping | undefined;
  private pauseLayer: Overlay | undefined;
  private levelToken = 0;
  private disposeScreen: (() => void) | undefined;

  constructor(private readonly root: HTMLElement) {
    this.overlays = new OverlaySlot(root, this.screen);
  }

  start(): void {
    document.documentElement.lang = i18n.current;
    this.root.replaceChildren(this.screen, this.notice.element);
    if (import.meta.env.DEV && this.startDevShortcut()) return;
    this.showProfiles();
  }

  private startDevShortcut(): boolean {
    const profile = devProfile(this.store.active());
    const start = this.devStart(profile);
    if (!start) return false;
    unlockAudioOnFirstInput();
    start();
    return true;
  }

  private devStart(profile: Profile): (() => void) | undefined {
    const level = devLevelFromUrl();
    if (level) return () => this.course.start(profile, level);
    const arena = devArenaFromUrl(profile.wordLanguage);
    if (arena) return () => this.arena.start(profile, arena);
    const daily = devDailyFromUrl(profile.wordLanguage);
    if (daily) return () => this.arena.startDaily(profile, daily);
    if (devPlacementFromUrl()) return () => this.placement.start(profile);
    return undefined;
  }

  private showProfiles(): void {
    this.leaveScreen();
    const screen = new ProfileScreen(this.store, {
      onPlay: (profile) => {
        sfx.unlock();
        this.showMap(profile);
      },
      onSettings: () => this.showSettings(() => this.showProfiles()),
      onPlacement: (profile) => {
        sfx.unlock();
        this.placement.offer(profile, () => undefined);
      },
    });
    this.showScreen(screen.element);
    this.disposeScreen = () => screen.dispose();
  }

  private showMap(shown: Profile): void {
    const profile = this.latest(shown);
    this.showMenu(
      () =>
        new WorldMap(profile, {
          onPlay: (level) => this.course.open(profile, level),
          onSwitchPlayer: () => this.showProfiles(),
          onShop: () => this.showShop(profile, this.backToMap()),
          onArena: () => this.showArena(profile),
          onSettings: () => this.showSettings(() => this.showMap(profile), profile),
        }),
    );
  }

  private showArena(profile: Profile): void {
    this.arena.show(this.latest(profile));
  }

  private showMenu(create: () => Screen): void {
    this.leaveScreen();
    music.stop();
    prefetchGameModule();
    const screen = create();
    this.showScreen(screen.element);
    this.disposeScreen = () => screen.dispose();
  }

  private showSettings(back: () => void, profile?: Profile): void {
    const deletable = profile && { profile, onDelete: () => this.deleteProfile(profile) };
    this.showMenu(
      () => new SettingsScreen({ onBack: back, profile: deletable, backup: this.backup }),
    );
  }

  private deleteProfile(profile: Profile): void {
    this.store.remove(profile.id);
    this.showProfiles();
  }

  private showShop(profile: Profile, exit: ShopExit, tab?: ShopTab): void {
    this.leaveScreen();
    const shop = new ShopScreen(
      this.latest(profile),
      { ...exit, onChange: (current) => this.save(current) },
      tab,
    );
    this.showScreen(shop.element);
    this.disposeScreen = () => shop.dispose();
  }

  private backToMap(): ShopExit {
    return { onBack: (current) => this.showMap(current) };
  }

  private startRun(profile: Profile, run: GameRun): void {
    this.leaveScreen();
    const token = this.levelToken;
    loadGameModule()
      .then((module) => {
        if (this.isCurrent(token)) this.runGame(module, profile, run);
      })
      .catch((error: unknown) => {
        if (this.isCurrent(token)) this.showLoadError(profile, run, error);
      });
  }

  private runGame({ Game, themeFor }: GameModule, profile: Profile, run: GameRun): void {
    const stage = el('div', { class: 'stage' });
    const type = (char: string) => this.game?.typeCharacter(char);
    const hud = new Hud(
      profile,
      {
        onMap: () => (run.canEnd ? this.game?.pause() : this.showMap(profile)),
        onPause: () => this.game?.togglePause(),
        onKeyboard: () => this.touch?.toggleNativeKeyboard(),
      },
      run.plan,
    );
    const builtInKeyboard = usesBuiltInKeyboard();
    const layout = builtInKeyboard ? KEYBOARD_LAYOUTS.compact : KEYBOARD_LAYOUTS.full;
    const keyboard = new KeyboardHint(type, layout);
    const callouts = new Callouts();
    const hint = run.rotateHint ? rotateHint() : undefined;
    this.showScreen(
      el(
        'div',
        { class: 'level-screen' },
        stage,
        callouts.element,
        hud.element,
        keyboard.element,
        hint,
      ),
    );
    if (hasCoarsePointer()) this.touch = new TouchTyping(stage, type, () => builtInKeyboard);

    const config = {
      character: profile.avatar,
      plan: run.plan,
      level: run.level,
      language: profile.wordLanguage,
      theme: themeFor(regionOf(run.level).theme),
      keyStats: profile.keyStats,
      equipped: profile.equipped,
    };
    this.run = run;
    this.game = new Game(stage, config, {
      onStats: (stats, lives) => {
        hud.update(stats, lives);
        callouts.setFever(stats.fever);
        music.setIntensity(musicIntensity(stats));
      },
      onRewards: (rewards) => hud.setRewards(rewards),
      onNextKey: (char) => keyboard.show(char),
      onProgress: (progress) => {
        hud.progress(progress);
        music.play(config.theme.id, musicMood(progress.kind));
      },
      onAnnounce: (text, style, accent) => callouts.show(text, style, accent),
      onPause: (paused) => this.setPaused(paused),
      onFinished: run.onFinished,
    });
    this.disposeScreen = watchStageInsets(stage, hud.element, (insets) =>
      this.game?.setInsets(insets),
    );
    this.game.start();
    if (this.attention.away) this.game.suspend();
  }

  private onAttentionChange(away: boolean): void {
    if (away) this.game?.suspend();
    else this.game?.wake();
    this.syncAudio();
  }

  private syncAudio(): void {
    if (this.attention.away || this.pauseLayer) music.pause();
    else music.resume();
  }

  private setPaused(paused: boolean): void {
    if (paused) this.pauseLevel();
    else this.resumeLevel();
  }

  private pauseLevel(): void {
    music.pause();
    this.showPause();
  }

  private showPause(): void {
    const onEnd = this.run?.canEnd ? () => this.game?.endRun() : undefined;
    this.openPauseLayer(
      pauseOverlay(
        {
          onResume: () => this.game?.togglePause(),
          onSettings: () =>
            this.openPauseLayer(settingsOverlay({ onBack: () => this.showPause() })),
          onEnd,
        },
        this.game?.keyStats ?? {},
      ),
    );
  }

  private openPauseLayer(layer: Overlay): void {
    this.pauseLayer = layer;
    this.overlays.open(layer);
  }

  private resumeLevel(): void {
    music.resume();
    if (this.pauseLayer) this.overlays.release(this.pauseLayer);
    this.pauseLayer = undefined;
    this.touch?.refocus();
  }

  private showLoadError(profile: Profile, run: GameRun, error: unknown): void {
    reportError(error);
    this.overlays.open(
      loadErrorOverlay({
        onRetry: this.dismissThen(run.restart),
        onMap: this.dismissThen(() => this.showMap(profile)),
      }),
    );
  }

  private latest(profile: Profile): Profile {
    return this.store.find(profile.id) ?? profile;
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
    this.run = undefined;
    this.touch?.dispose();
    this.touch = undefined;
    this.pauseLayer = undefined;
    this.syncAudio();
  }
}

function musicMood(kind: PhaseKind): MusicMood {
  return kind === 'boss' ? 'boss' : 'calm';
}

function musicIntensity(stats: SessionStats): number {
  if (stats.fever) return FULL_INTENSITY;
  return Math.min(FULL_INTENSITY, stats.combo / COMBO_FOR_FULL_INTENSITY);
}
