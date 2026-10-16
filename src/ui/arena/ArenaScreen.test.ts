import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DifficultyId } from '../../arena/difficulty';
import { SILVER, type Medal } from '../../arena/medals';
import { arenaKey, withEndlessRun } from '../../arena/record';
import { LEVELS } from '../../course/catalog';
import { createProfile, type Profile } from '../../profiles/Profile';
import type { ArenaChoice } from '../../arena/endlessPlan';
import type { KeySet } from '../../arena/keySets';
import { ArenaScreen } from './ArenaScreen';

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

const screens: ArenaScreen[] = [];

function setup(profile: Profile, previous?: ArenaChoice) {
  const onPlay = vi.fn<(profile: Profile, choice: ArenaChoice) => void>();
  const onBack = vi.fn<(profile: Profile) => void>();
  const onShop = vi.fn<(profile: Profile, choice: ArenaChoice) => void>();
  const onDaily = vi.fn<(profile: Profile, keySet: KeySet, choice: ArenaChoice) => void>();
  const screen = new ArenaScreen(profile, { onPlay, onBack, onShop, onDaily }, { previous });
  screens.push(screen);
  const chips = (selector: string) => [
    ...screen.element.querySelectorAll<HTMLButtonElement>(`${selector} .chip`),
  ];
  const keySetChips = () => chips('.arena-chips:not(.arena-difficulties)');
  const difficultyChips = () => chips('.arena-difficulties');
  const play = () => screen.element.querySelector<HTMLButtonElement>('.arena-play')?.click();
  const lastChoice = () => onPlay.mock.lastCall?.[1];
  return { screen, keySetChips, difficultyChips, play, lastChoice, onBack, onShop, onDaily };
}

function press(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
}

function activeLabel(chips: HTMLButtonElement[]): string | null | undefined {
  return chips.find((chip) => chip.classList.contains('is-active'))?.textContent;
}

describe('ArenaScreen', () => {
  afterEach(() => {
    screens.splice(0).forEach((screen) => screen.dispose());
  });

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
    const card = () => screen.element.querySelector("[data-mode='endless']");
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

  it('opens the shop from the link next to the coins with the current choice', () => {
    const { screen, keySetChips, onShop } = setup(profileUpTo('las-16'));
    keySetChips()[0].click();
    const link = screen.element.querySelector<HTMLButtonElement>('.shop-coins .shop-link');
    expect(link?.nextElementSibling?.classList).toContain('shop-coin-pill');
    link?.click();
    expect(onShop.mock.lastCall?.[1].keySet.id).toBe('polana');
  });

  describe('keys', () => {
    it('changes the key set with left and right and the level with up and down', () => {
      const { keySetChips, difficultyChips } = setup(profileUpTo('gory-16'));
      expect(activeLabel(keySetChips())).toBe('Góry');
      press('ArrowLeft');
      press('ArrowLeft');
      press('ArrowLeft');
      expect(activeLabel(keySetChips())).toBe('Polana');
      press('ArrowRight');
      expect(activeLabel(keySetChips())).toBe('Las');
      press('ArrowDown');
      expect(activeLabel(difficultyChips())).toBe('Spokojnie');
      press('ArrowUp');
      press('ArrowUp');
      expect(activeLabel(difficultyChips())).toBe('Normalnie');
    });

    it('plays the choice with Enter and goes back to the map with Escape', () => {
      const { lastChoice, onBack } = setup(profileUpTo('las-16'));
      press('ArrowLeft');
      press('Enter');
      expect(lastChoice()?.keySet.id).toBe('polana');
      press('Escape');
      expect(onBack).toHaveBeenCalledOnce();
    });
  });

  it('puts the daily card first and plays it with the chosen key set', () => {
    const { screen, keySetChips, onDaily } = setup(profileUpTo('gory-16'));
    const cards = [...screen.element.querySelectorAll('[data-mode]')];
    expect(cards.map((card) => card.getAttribute('data-mode'))).toEqual(['daily', 'endless']);
    keySetChips()[1].click();
    screen.element.querySelector<HTMLButtonElement>('.daily-play')?.click();
    expect(onDaily.mock.lastCall?.[1].id).toBe('las');
    expect(onDaily.mock.lastCall?.[2].keySet.id).toBe('las');
  });
});
