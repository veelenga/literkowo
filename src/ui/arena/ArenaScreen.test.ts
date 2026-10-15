import { describe, expect, it, vi } from 'vitest';
import type { DifficultyId } from '../../arena/difficulty';
import { SILVER, type Medal } from '../../arena/medals';
import { arenaKey, withEndlessRun } from '../../arena/record';
import { LEVELS } from '../../course/catalog';
import { createProfile, type Profile } from '../../profiles/Profile';
import { ArenaScreen, type ArenaChoice } from './ArenaScreen';

vi.mock('../ShopHero', () => ({
  ShopHero: class {
    readonly element = document.createElement('aside');
    show(): void {}
    dispose(): void {}
  },
}));

const STAR = { stars: 2, score: 10, accuracy: 0.95, wpm: 10 };

function profileUpTo(levelId: string): Profile {
  const profile = createProfile('Ola', 'a');
  const last = LEVELS.findIndex((level) => level.id === levelId);
  for (const level of LEVELS.slice(0, last + 1)) profile.levelResults[level.id] = STAR;
  return profile;
}

function withBest(profile: Profile, keySet: string, id: DifficultyId, medal: Medal): Profile {
  const run = {
    key: arenaKey(keySet, id),
    wavesCleared: 7,
    score: 900,
    accuracy: 0.95,
    medal,
    date: '2026-10-15',
  };
  return { ...profile, arena: withEndlessRun(profile.arena, run) };
}

function setup(profile: Profile, previous?: ArenaChoice) {
  const onPlay = vi.fn<(profile: Profile, choice: ArenaChoice) => void>();
  const onBack = vi.fn<(profile: Profile) => void>();
  const screen = new ArenaScreen(profile, { onPlay, onBack }, previous);
  const chips = (selector: string) => [
    ...screen.element.querySelectorAll<HTMLButtonElement>(`${selector} .chip`),
  ];
  const keySetChips = () => chips('.arena-chips:not(.arena-difficulties)');
  const difficultyChips = () => chips('.arena-difficulties');
  const play = () => screen.element.querySelector<HTMLButtonElement>('.arena-play')?.click();
  const lastChoice = () => onPlay.mock.lastCall?.[1];
  return { screen, keySetChips, difficultyChips, play, lastChoice, onBack };
}

describe('ArenaScreen', () => {
  it('offers the Polana keys and the first two levels after the Polana boss', () => {
    const { keySetChips, difficultyChips, screen } = setup(profileUpTo('polana-19'));
    expect(keySetChips().map((chip) => chip.textContent)).toEqual(['Polana']);
    expect(difficultyChips().map((chip) => [chip.textContent, chip.disabled])).toEqual([
      ['Spokojnie', false],
      ['Normalnie', false],
      ['Szybko', true],
      ['Szaleństwo', true],
    ]);
    expect(screen.element.querySelector('.arena-hint')?.textContent).toBe(
      'Srebro na poziomie Normalnie otworzy Szybko',
    );
    expect(screen.element.querySelector('.arena-keys')?.textContent).toBe('F J D K S L A ;');
  });

  it('starts on the highest key set and Normalnie, and plays the choice', () => {
    const { keySetChips, difficultyChips, play, lastChoice } = setup(profileUpTo('wyspa-24'));
    expect(keySetChips()).toHaveLength(5);
    expect(keySetChips().at(-1)?.classList.contains('is-active')).toBe(true);
    keySetChips()[1].click();
    difficultyChips()[0].click();
    play();
    expect(lastChoice()?.keySet.id).toBe('las');
    expect(lastChoice()?.difficulty.id).toBe('calm');
  });

  it('shows the best wave and medal of the chosen combination', () => {
    const profile = withBest(profileUpTo('las-16'), 'las', 'normal', SILVER);
    const { screen, difficultyChips } = setup(profile);
    const card = () => screen.element.querySelector('.arena-mode');
    expect(card()?.querySelector('.arena-best')?.textContent).toBe('Rekord: fala 7');
    expect(card()?.querySelector('.medal.is-silver')).not.toBeNull();
    expect(difficultyChips()[2].disabled).toBe(false);
    difficultyChips()[2].click();
    expect(card()?.querySelector('.arena-best')?.textContent).toBe('Jeszcze bez rekordu');
  });

  it('keeps the previous choice when it comes back from a run', () => {
    const profile = profileUpTo('gory-16');
    const first = setup(profile);
    first.keySetChips()[0].click();
    first.difficultyChips()[0].click();
    first.play();
    const choice = first.lastChoice();
    const back = setup(profile, choice);
    expect(back.keySetChips()[0].classList.contains('is-active')).toBe(true);
    expect(back.difficultyChips()[0].classList.contains('is-active')).toBe(true);
  });

  it('goes back to the map', () => {
    const { screen, onBack } = setup(profileUpTo('polana-19'));
    screen.element.querySelector<HTMLButtonElement>('.shop-back')?.click();
    expect(onBack).toHaveBeenCalledOnce();
  });
});
