import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Level } from '../course/catalog';
import { courseFor } from '../course/course';
import { createProfile, type Profile } from '../profiles/Profile';
import { levelTitle } from './levelKind';
import { WorldMap } from './WorldMap';

const DONE = { stars: 2, score: 1, accuracy: 1, wpm: 1 };

function mapOf(
  profile: Profile,
  onArena: () => void = () => undefined,
  onSettings: () => void = () => undefined,
): HTMLElement {
  const noop = () => undefined;
  const actions = { onPlay: noop, onSwitchPlayer: noop, onShop: noop, onArena, onSettings };
  return new WorldMap(profile, actions).element;
}

function polanaDone(): Profile {
  const profile = createProfile('Ola', 'a');
  const polana = courseFor('pl').regions[0].levels;
  return { ...profile, levelResults: Object.fromEntries(polana.map((level) => [level.id, DONE])) };
}

function nodes(map: HTMLElement): HTMLElement[] {
  return [...map.querySelectorAll<HTMLElement>('.level-node')];
}

describe('WorldMap', () => {
  beforeAll(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    Element.prototype.scrollIntoView = () => undefined;
  });

  it('shows a stop for every level of the course', () => {
    const map = mapOf(createProfile('Ola', 'a'));
    expect(nodes(map)).toHaveLength(courseFor('pl').levels.length);
  });

  it('names each node after its kind and keys', () => {
    const profile = createProfile('Ola', 'a');
    const map = mapOf({ ...profile, levelResults: { 'polana-1': DONE, 'polana-2': DONE } });
    const titles = nodes(map)
      .slice(0, 3)
      .map((node) => node.title);
    expect(titles).toEqual(['Nowe klawisze F J', 'Trening F J', 'Powtórka F J']);
    expect(map.querySelector('.level-node.is-current')?.classList).toContain('is-review');
  });

  it('marks learn levels and the mini boss of review levels with a badge', () => {
    const profile = createProfile('Ola', 'a');
    const map = mapOf({ ...profile, levelResults: { 'polana-1': DONE, 'polana-2': DONE } });
    const badges = nodes(map)
      .slice(0, 3)
      .map((node) => node.querySelector('.node-kind')?.textContent ?? null);
    expect(badges).toEqual(['✨', null, '👑']);
  });

  it('shows the levels of the window as open with the hero on the first one', () => {
    const profile = createProfile('Ola', 'a');
    const results = { 'polana-1': DONE, 'polana-2': DONE, 'polana-3': DONE };
    const map = mapOf({ ...profile, levelResults: results });
    const looks = nodes(map)
      .slice(0, 8)
      .map((node) =>
        node.matches(':disabled') ? 'locked' : node.classList.contains('is-current'),
      );
    expect(looks).toEqual([false, false, false, true, true, true, 'locked', 'locked']);
    const current = map.querySelectorAll('.journey-stop.is-current');
    expect(current).toHaveLength(1);
    expect(current[0].querySelector('.level-node')?.getAttribute('title')).toBe('Nowy klawisz D');
    expect(current[0].querySelector('.journey-hero')).not.toBeNull();
    expect(map.querySelectorAll('.journey-stop.is-open .journey-hero')).toHaveLength(0);
  });

  it('tells on a locked stop what to win first', () => {
    const profile = createProfile('Ola', 'a');
    const titles = nodes(mapOf({ ...profile, levelResults: { 'polana-1': DONE } })).map(
      (node) => node.title,
    );
    expect(titles[2]).toBe('Wygraj poziomy przed powtórką');
    expect(titles[3]).toBe('Najpierw ukończ wcześniejsze poziomy');
    expect(titles[18]).toBe('Wygraj powtórkę przed bossem');
  });

  it('hangs every learn level on its practice stop with a short link', () => {
    const map = mapOf(createProfile('Ola', 'a'));
    const learnLevels = courseFor('pl').levels.filter((level) => level.kind === 'learn');
    const satellites = [...map.querySelectorAll('.journey-stop.is-satellite')];
    expect(satellites).toHaveLength(learnLevels.length);
    satellites.forEach((satellite) => expect(satellite.querySelector('.stop-link')).not.toBeNull());
    expect(map.querySelector('.journey-stop.is-boss .stop-link')).toBeNull();
  });

  it('keeps the stops in course order for keyboard focus', () => {
    const map = mapOf(polanaDone());
    const titles = [...map.querySelectorAll<HTMLElement>('.level-node:not([disabled])')].map(
      (node) => node.title,
    );
    const expected = courseFor('pl')
      .levels.slice(0, titles.length)
      .map((level) => levelTitle(level));
    expect(titles).toEqual(expected);
  });

  it('shows a dimmed arena gate and a locked header button before the Polana boss', () => {
    const onArena = vi.fn();
    const map = mapOf(createProfile('Ola', 'a'), onArena);
    const gate = map.querySelector('.journey-gate');
    expect(gate?.classList).toContain('is-locked');
    expect(gate?.querySelector<HTMLButtonElement>('.gate-node')?.disabled).toBe(true);
    expect(gate?.textContent).toBe('Pokonaj bossa Polany');
    const button = map.querySelector<HTMLButtonElement>('.arena-button');
    expect(button?.classList).toContain('is-locked');
    expect(button?.title).toBe('Arena. Pokonaj bossa Polany');
    button?.click();
    expect(onArena).not.toHaveBeenCalled();
  });

  it('opens the arena from the gate and the header once the Polana boss is beaten', () => {
    const onArena = vi.fn();
    const map = mapOf(polanaDone(), onArena);
    expect(map.querySelectorAll('.journey-gate')).toHaveLength(1);
    map.querySelector<HTMLButtonElement>('.gate-node')?.click();
    map.querySelector<HTMLButtonElement>('.arena-button')?.click();
    expect(onArena).toHaveBeenCalledTimes(2);
    expect(map.querySelector('.arena-button')?.classList).not.toContain('is-locked');
  });

  it('opens the settings from the gear next to the sound toggle', () => {
    const onSettings = vi.fn();
    const map = mapOf(createProfile('Ola', 'a'), undefined, onSettings);
    const gear = map.querySelector<HTMLButtonElement>('.settings-button');
    expect(gear?.nextElementSibling?.classList).toContain('sound-toggle');
    expect(gear?.getAttribute('aria-label')).toBe('Ustawienia');
    gear?.click();
    expect(onSettings).toHaveBeenCalledOnce();
  });
});

describe('WorldMap keys', () => {
  function setup(profile: Profile) {
    const actions = {
      onPlay: vi.fn<(level: Level) => void>(),
      onSwitchPlayer: vi.fn(),
      onShop: vi.fn(),
      onArena: vi.fn(),
      onSettings: vi.fn(),
    };
    const map = new WorldMap(profile, actions);
    document.body.append(map.element);
    const press = (key: string) =>
      window.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
    const focusedTitle = () =>
      document.activeElement instanceof HTMLElement ? document.activeElement.title : undefined;
    return { map, actions, press, focusedTitle };
  }

  beforeAll(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    Element.prototype.scrollIntoView = () => undefined;
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('plays the current level with Enter', () => {
    const { actions, press } = setup(polanaDone());
    press('Enter');
    expect(actions.onPlay.mock.lastCall?.[0].id).toBe('las-1');
  });

  it('moves the focus along the path with the arrow keys', () => {
    const { map, press, focusedTitle } = setup(polanaDone());
    const open = [...map.element.querySelectorAll<HTMLElement>('.level-node:not([disabled])')];
    press('ArrowRight');
    expect(focusedTitle()).toBe('Nowy klawisz G');
    press('ArrowUp');
    expect(focusedTitle()).toBe('Strażnik regionu');
    press('ArrowLeft');
    press('ArrowDown');
    expect(focusedTitle()).toBe('Strażnik regionu');
    press('ArrowRight');
    press('ArrowRight');
    expect(focusedTitle()).toBe('Trening G');
    open.forEach(() => press('ArrowRight'));
    expect(focusedTitle()).toBe(open.at(-1)?.title);
  });

  it('goes back to the profiles with Escape and stops listening once disposed', () => {
    const { map, actions, press } = setup(createProfile('Ola', 'a'));
    press('Escape');
    expect(actions.onSwitchPlayer).toHaveBeenCalledOnce();
    map.dispose();
    press('Escape');
    expect(actions.onSwitchPlayer).toHaveBeenCalledOnce();
  });
});
