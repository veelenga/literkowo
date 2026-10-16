// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { difficultyById } from '../arena/difficulty';
import { keySetById } from '../arena/keySets';
import { SILVER } from '../arena/medals';
import { arenaKey, withEndlessRun } from '../arena/record';
import { LEVELS } from '../course/catalog';
import type { GameResult } from '../game/Game';
import { createProfile, type Profile } from '../profiles/Profile';
import type { Overlay } from '../ui/overlay';
import type { ShopExit, ShopTab } from '../ui/ShopScreen';
import { ArenaFlow, type ArenaHost, type Screen } from './ArenaFlow';
import type { GameRun } from './GameRun';
import { EMPTY_TALLY } from '../course/counters';

vi.mock('../ui/ShopHero', () => ({
  ShopHero: class {
    readonly element = document.createElement('aside');
    show(): void {}
    dispose(): void {}
  },
}));

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing test data');
  return value;
}

const CHOICE = {
  keySet: required(keySetById('las', 'pl')),
  difficulty: required(difficultyById('fast')),
};

const RESULT: GameResult = {
  won: false,
  score: 3000,
  accuracy: 0.96,
  wpm: 18,
  lettersFreed: 220,
  xp: 70,
  coins: 25,
  coinBoost: 1,
  keys: { practised: {}, weakest: [], mastered: [] },
  phasesCleared: 7,
  seconds: 120,
  phases: [],
  tally: EMPTY_TALLY,
};

function lasPlayer(): Profile {
  const profile = createProfile('Ola', 'a');
  const last = LEVELS.findIndex((level) => level.id === 'las-15');
  for (const level of LEVELS.slice(0, last + 1)) {
    profile.levelResults[level.id] = { stars: 2, score: 10, accuracy: 0.95, wpm: 10 };
  }
  const silver = {
    key: arenaKey('polana', 'normal'),
    wavesCleared: 6,
    score: 10,
    accuracy: 0.95,
    medal: SILVER,
    date: '2026-10-15',
  };
  return { ...profile, arena: withEndlessRun(profile.arena, silver) };
}

function setup() {
  const runs: GameRun[] = [];
  const overlays: Overlay[] = [];
  const screens: Screen[] = [];
  const saved: Profile[] = [];
  const shops: Array<{ profile: Profile; exit: ShopExit; tab?: ShopTab }> = [];
  const host: ArenaHost = {
    showMenu: (create) => screens.push(create()),
    showMap: vi.fn(),
    showShop: (profile, exit, tab) => shops.push({ profile, exit, tab }),
    startRun: (_, run) => runs.push(run),
    openOverlay: (overlay) => overlays.push(overlay),
    dismissThen: (next) => next,
    save: (profile) => {
      saved.push(profile);
      return profile;
    },
  };
  return { flow: new ArenaFlow(host), runs, overlays, screens, saved, shops };
}

describe('ArenaFlow', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('runs the endless plan of the choice on the boss level of the key set', () => {
    const { flow, runs } = setup();
    flow.start(createProfile('Ola', 'a'), CHOICE);
    const [run] = runs;
    expect(run.level.id).toBe('las-16');
    expect(run.plan.lives).toBe(CHOICE.difficulty.lives);
    expect(run.plan.allMechanicsUnlocked).toBe(true);
    expect(run.rotateHint).toBe(false);
  });

  it('saves the run and shows the result, then plays again with the same choice', () => {
    const { flow, runs, overlays, saved } = setup();
    flow.start(createProfile('Ola', 'a'), CHOICE);
    runs[0].onFinished(RESULT);
    expect(saved[0].arena.endless['las/fast']).toMatchObject({ wave: 7, runs: 1 });
    const card = overlays[0].element;
    expect(card.querySelector('.result-title')?.textContent).toBe('Nowy rekord!');
    card.querySelector<HTMLButtonElement>('.button-primary')?.click();
    expect(runs).toHaveLength(2);
    expect(runs[1].level.id).toBe('las-16');
    overlays[0].dispose();
  });

  it('goes back to the arena screen with the same choice', () => {
    const { flow, runs, overlays, screens } = setup();
    flow.start(lasPlayer(), CHOICE);
    runs[0].onFinished(RESULT);
    overlays[0].element.querySelector<HTMLButtonElement>('.button-ghost')?.click();
    const active = screens[0].element.querySelectorAll('.chip.is-active');
    expect([...active].map((chip) => chip.textContent)).toEqual(['Las', 'Szybko']);
    overlays[0].dispose();
  });

  it('opens the trophies from the result and comes back to the arena screen', () => {
    const { flow, runs, overlays, shops, screens } = setup();
    flow.start(lasPlayer(), CHOICE);
    runs[0].onFinished({ ...RESULT, phasesCleared: 10 });
    overlays[0].element.querySelector<HTMLButtonElement>('button.treasure-chip')?.click();
    const [shop] = shops;
    expect(shop.tab).toBe('trophy');
    expect(shop.exit.backLabel).toBe('Arena');
    shop.exit.onBack(shop.profile);
    const active = screens[0].element.querySelectorAll('.chip.is-active');
    expect([...active].map((item) => item.textContent)).toEqual(['Las', 'Szybko']);
    overlays[0].dispose();
  });

  it('opens the shop from the arena screen and comes back to the same choice', () => {
    const { flow, screens, shops } = setup();
    flow.show(lasPlayer(), CHOICE);
    screens[0].element.querySelector<HTMLButtonElement>('.shop-link')?.click();
    const [shop] = shops;
    expect(shop.tab).toBeUndefined();
    expect(shop.exit.backLabel).toBe('Arena');
    shop.exit.onBack(shop.profile);
    const active = screens[1].element.querySelectorAll('.chip.is-active');
    expect([...active].map((item) => item.textContent)).toEqual(['Las', 'Szybko']);
  });
});
