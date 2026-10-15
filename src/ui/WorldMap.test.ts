import { beforeAll, describe, expect, it, vi } from 'vitest';
import { courseFor } from '../course/course';
import { createProfile, type Profile } from '../profiles/Profile';
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
