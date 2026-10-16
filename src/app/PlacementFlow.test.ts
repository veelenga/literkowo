// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FINGERS_CARD_ID } from '../arena/placementProgress';
import { sfx } from '../audio/Sfx';
import { EMPTY_TALLY } from '../course/counters';
import { EMPTY_KEY_STAT } from '../course/keyStats';
import type { GameResult } from '../game/Game';
import type { PhaseRecord } from '../game/PhaseMeter';
import { createProfile, type Profile } from '../profiles/Profile';
import type { Overlay } from '../ui/overlay';
import type { GameRun } from './GameRun';
import { PlacementFlow, type PlacementHost } from './PlacementFlow';

const PASS: PhaseRecord = { hits: 40, mistakes: 0, reached: 0, typingSeconds: 9 };
const FAIL: PhaseRecord = { hits: 10, mistakes: 0, reached: 3, typingSeconds: 5 };

function result(phases: PhaseRecord[]): GameResult {
  return {
    won: true,
    score: 900,
    accuracy: 1,
    wpm: 30,
    lettersFreed: 80,
    xp: 40,
    coins: 0,
    coinBoost: 1,
    keys: { practised: { f: { ...EMPTY_KEY_STAT, hits: 9 } }, weakest: [], mastered: [] },
    phasesCleared: phases.length,
    phases,
    tally: { ...EMPTY_TALLY, words: 20 },
  };
}

function setup() {
  const runs: GameRun[] = [];
  const overlays: Overlay[] = [];
  const saved: Profile[] = [];
  const host = {
    showMap: vi.fn<PlacementHost['showMap']>(),
    showArena: vi.fn<PlacementHost['showArena']>(),
    startRun: (_: Profile, run: GameRun) => runs.push(run),
    openOverlay: (overlay: Overlay) => overlays.push(overlay),
    dismissThen: (next: () => void) => next,
    save: (profile: Profile) => {
      saved.push(profile);
      return profile;
    },
  };
  return { flow: new PlacementFlow(host), host, runs, overlays, saved };
}

function click(overlay: Overlay | undefined, selector: string): void {
  overlay?.element.querySelector<HTMLButtonElement>(selector)?.click();
}

describe('PlacementFlow', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    vi.spyOn(sfx, 'sparkle').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('opens the intro card and runs one stage per region of the word language', () => {
    const { flow, runs, overlays } = setup();
    flow.offer({ ...createProfile('Ola', 'a'), wordLanguage: 'en' }, () => undefined);
    expect(overlays[0].element.querySelectorAll('.stage-chip')).toHaveLength(4);
    click(overlays[0], '.button-primary');
    const [run] = runs;
    expect(run.level.id).toBe('jaskinia-24');
    expect(run.plan.lives).toBe(0);
    expect([0, 1, 2, 3, 4].map((index) => run.plan.phaseAt(index)?.stage?.number)).toEqual([
      1,
      2,
      3,
      4,
      undefined,
    ]);
    overlays.forEach((overlay) => overlay.dispose());
  });

  it('places the child, saves the keystrokes and shows the fingers card once', () => {
    const { flow, host, runs, overlays, saved } = setup();
    flow.start(createProfile('Ola', 'a'));
    runs[0].onFinished(result([PASS, FAIL]));
    const placed = saved[0];
    expect(placed.arena.placement?.regionId).toBe('polana');
    expect(placed.keyStats.f.hits).toBe(9);
    expect(placed).toMatchObject({ xp: 0, totalScore: 0, lettersFreed: 0, coins: 0 });
    expect(placed.counters.wordsTyped).toBe(0);
    expect(overlays[0].element.querySelector('.result-title')?.textContent).toBe(
      'Zaczynasz tutaj: Las',
    );
    click(overlays[0], '.result-actions .button-primary');
    expect(overlays[1].element.querySelector('.eyebrow')?.textContent).toBe('Palce na start');
    click(overlays[1], '.button-primary');
    const shown = host.showMap.mock.calls[0][0];
    expect(shown.seenStories).toContain(FINGERS_CARD_ID);

    flow.start(shown);
    runs[1].onFinished(result([PASS, PASS, FAIL]));
    click(overlays[2], '.result-actions .button-ghost');
    expect(overlays).toHaveLength(3);
    expect(host.showArena.mock.calls[0][0].arena.placement?.regionId).toBe('las');
    overlays.forEach((overlay) => overlay.dispose());
  });

  it('names the start of the kept placement after a weaker retake', () => {
    const { flow, runs, overlays, saved } = setup();
    flow.start(createProfile('Ola', 'a'));
    runs[0].onFinished(result([PASS, PASS, PASS, FAIL]));
    flow.start(saved[0]);
    runs[1].onFinished(result([FAIL]));
    expect(saved[1].arena.placement?.regionId).toBe('gory');
    const card = overlays.at(-1)?.element;
    expect(card?.querySelector('.result-title')?.textContent).toBe('Zaczynasz tutaj: Jaskinia');
    expect(card?.querySelectorAll('.stage-chip.is-lit')).toHaveLength(0);
    expect(card?.querySelector('.result-actions .button-ghost')?.textContent).toBe('Arena');
    overlays.forEach((overlay) => overlay.dispose());
  });

  it('sends a beginner to the map with the course untouched', () => {
    const { flow, host, runs, overlays, saved } = setup();
    flow.start(createProfile('Ola', 'a'));
    runs[0].onFinished(result([FAIL]));
    expect(saved[0].arena.placement).toBeUndefined();
    expect(saved[0].levelResults).toEqual({});
    expect(overlays[0].element.querySelector('.result-actions .button-ghost')).toBeNull();
    click(overlays[0], '.result-actions .button-primary');
    expect(overlays).toHaveLength(1);
    expect(host.showMap).toHaveBeenCalledOnce();
    overlays.forEach((overlay) => overlay.dispose());
  });
});
