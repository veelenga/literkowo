// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sfx } from '../audio/Sfx';
import { EMPTY_TALLY } from '../course/counters';
import { markStorySeen } from '../course/progress';
import type { GameResult } from '../game/Game';
import { LEVEL_LIVES } from '../game/LevelPlan';
import { i18n } from '../i18n/i18n';
import { createProfile, type Profile } from '../profiles/Profile';
import { afterStoryId, bossStoryId, INTRO_STORY_ID, type StoryScene } from '../story/story';
import { requireLevel } from '../testing/levels';
import type { Overlay } from '../ui/overlay';
import { CourseFlow, type CourseHost } from './CourseFlow';
import type { GameRun } from './GameRun';

interface ShownStory {
  readonly scene: StoryScene;
  readonly onDone: () => void;
}

const shown = vi.hoisted(() => ({ stories: new Array<ShownStory>() }));

vi.mock('../ui/StoryCard', () => ({
  storyCard: (scene: StoryScene, onDone: () => void) => {
    shown.stories.push({ scene, onDone });
    return { element: document.createElement('div'), dispose: () => undefined };
  },
}));

const RUN_COINS = 12;
const COINS_FOR_THREE_STARS = 37;

const WON: GameResult = {
  won: true,
  score: 1200,
  accuracy: 0.98,
  wpm: 14,
  lettersFreed: 90,
  xp: 50,
  coins: RUN_COINS,
  coinBoost: 1,
  keys: { practised: {}, weakest: [], mastered: [] },
  phasesCleared: 3,
  seconds: 70,
  phases: [],
  tally: { ...EMPTY_TALLY, words: 25 },
};

const LOST: GameResult = { ...WON, won: false, accuracy: 1 };

const BOSS = requireLevel('polana-19');

function setup() {
  const runs: GameRun[] = [];
  const overlays: Overlay[] = [];
  const saved: Profile[] = [];
  const host = {
    showMap: vi.fn<CourseHost['showMap']>(),
    showShop: vi.fn<CourseHost['showShop']>(),
    startRun: (_: Profile, run: GameRun) => runs.push(run),
    clearScreen: vi.fn<CourseHost['clearScreen']>(),
    openOverlay: (overlay: Overlay) => overlays.push(overlay),
    dismissThen: (next: () => void) => next,
    save: (profile: Profile) => {
      saved.push(profile);
      return profile;
    },
  };
  return { flow: new CourseFlow(host), host, runs, overlays, saved };
}

function newPlayer(): Profile {
  return createProfile('Ola', 'a');
}

function bossPlayer(): Profile {
  return markStorySeen(newPlayer(), bossStoryId(BOSS.regionId));
}

function click(overlay: Overlay | undefined, selector: string): void {
  overlay?.element.querySelector<HTMLButtonElement>(selector)?.click();
}

function press(overlay: Overlay | undefined, label: string): void {
  const buttons = overlay?.element.querySelectorAll<HTMLButtonElement>('.result-actions button');
  [...(buttons ?? [])].find((button) => button.textContent?.startsWith(label))?.click();
}

describe('CourseFlow', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    vi.spyOn(sfx, 'sparkle').mockImplementation(() => undefined);
    shown.stories.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('runs a course level that the pause card cannot end', () => {
    const { flow, runs } = setup();
    flow.start(newPlayer(), requireLevel('polana-1'));
    const [run] = runs;
    expect(run.level.id).toBe('polana-1');
    expect(run.plan.lives).toBe(LEVEL_LIVES);
    expect(run.rotateHint).toBe(true);
    expect(run.canEnd).toBe(false);
  });

  it('plays the intro story once before the learn card of the first level', () => {
    const { flow, host, runs, overlays, saved } = setup();
    flow.open(newPlayer(), requireLevel('polana-1'));
    expect(shown.stories.map((story) => story.scene.id)).toEqual([INTRO_STORY_ID]);
    expect(host.clearScreen).toHaveBeenCalledOnce();
    expect(saved[0].seenStories).toContain(INTRO_STORY_ID);
    shown.stories[0].onDone();
    click(overlays[1], '.learn-panel .button-primary');
    expect(runs[0].level.id).toBe('polana-1');

    flow.open(saved[0], requireLevel('polana-1'));
    expect(shown.stories).toHaveLength(1);
    expect(overlays[2].element.querySelector('.learn-panel')).not.toBeNull();
    overlays.forEach((overlay) => overlay.dispose());
  });

  it('starts a boss level without a learn card', () => {
    const { flow, runs, overlays } = setup();
    flow.open(bossPlayer(), BOSS);
    expect(overlays).toHaveLength(0);
    expect(runs[0].level.id).toBe(BOSS.id);
  });

  it('saves the stars and the coin payout of a won level', () => {
    const { flow, runs, overlays, saved } = setup();
    flow.start(newPlayer(), requireLevel('polana-2'));
    runs[0].onFinished(WON);
    expect(saved[0].levelResults['polana-2']).toEqual({
      stars: 3,
      score: WON.score,
      accuracy: WON.accuracy,
      wpm: WON.wpm,
    });
    expect(saved[0]).toMatchObject({ coins: COINS_FOR_THREE_STARS, xp: WON.xp });
    expect(saved[0].counters.wordsTyped).toBe(WON.tally.words);
    expect(overlays[0].element.querySelectorAll('.star.is-earned')).toHaveLength(3);
    overlays.forEach((overlay) => overlay.dispose());
  });

  it('opens the next level from the result card', () => {
    const { flow, runs, overlays } = setup();
    flow.start(newPlayer(), requireLevel('polana-1'));
    runs[0].onFinished(WON);
    press(overlays[0], i18n.t.next);
    click(overlays[1], '.learn-panel .button-primary');
    expect(runs[1].level.id).toBe('polana-2');
    overlays.forEach((overlay) => overlay.dispose());
  });

  it('retries the level or goes back to the map from the result card', () => {
    const { flow, host, runs, overlays, saved } = setup();
    flow.start(newPlayer(), requireLevel('polana-2'));
    runs[0].onFinished(WON);
    press(overlays[0], i18n.t.retry);
    click(overlays[1], '.learn-panel .button-primary');
    expect(runs[1].level.id).toBe('polana-2');
    runs[1].onFinished(WON);
    press(overlays[2], i18n.t.map);
    expect(host.showMap).toHaveBeenCalledWith(saved[1]);
    overlays.forEach((overlay) => overlay.dispose());
  });

  it('plays the story after a beaten boss only once', () => {
    const { flow, host, runs, overlays, saved } = setup();
    flow.start(bossPlayer(), BOSS);
    runs[0].onFinished(WON);
    press(overlays[0], i18n.t.map);
    expect(shown.stories.map((story) => story.scene.id)).toEqual([afterStoryId(BOSS.regionId)]);
    shown.stories[0].onDone();
    const seen = saved[1];
    expect(seen.seenStories).toContain(afterStoryId(BOSS.regionId));
    expect(host.showMap).toHaveBeenLastCalledWith(seen);

    flow.start(seen, BOSS);
    runs[1].onFinished(WON);
    press(overlays[2], i18n.t.map);
    expect(shown.stories).toHaveLength(1);
    expect(host.showMap).toHaveBeenLastCalledWith(saved[2]);
    overlays.forEach((overlay) => overlay.dispose());
  });

  it('opens the shop from the result card and comes back to the map', () => {
    const { flow, host, runs, overlays } = setup();
    flow.start(bossPlayer(), BOSS);
    runs[0].onFinished(WON);
    click(overlays[0], 'button.treasure-chip');
    shown.stories[0].onDone();
    const [profile, exit, tab] = host.showShop.mock.calls[0];
    expect(tab).toBe('trophy');
    expect(profile.inventory.trophies).toContain('first-boss');
    exit.onBack(profile);
    expect(host.showMap).toHaveBeenCalledWith(profile);
    overlays.forEach((overlay) => overlay.dispose());
  });

  it('gives no stars and no finishing coins for a lost level', () => {
    const { flow, runs, overlays, saved } = setup();
    flow.start(newPlayer(), requireLevel('polana-2'));
    runs[0].onFinished(LOST);
    expect(saved[0].levelResults['polana-2'].stars).toBe(0);
    expect(saved[0].coins).toBe(RUN_COINS);
    expect(saved[0].counters.perfectLevels).toBe(0);
    const card = overlays[0].element;
    expect(card.querySelectorAll('.star.is-earned')).toHaveLength(0);
    expect(card.querySelector('.result-actions .button-primary')?.textContent).toContain(
      i18n.t.retry,
    );
    overlays.forEach((overlay) => overlay.dispose());
  });
});
