import { beforeAll, describe, expect, it, vi } from 'vitest';
import { courseFor } from '../course/course';
import { createProfile, type Profile } from '../profiles/Profile';
import { WorldMap } from './WorldMap';

const DONE = { stars: 2, score: 1, accuracy: 1, wpm: 1 };

function mapOf(profile: Profile): HTMLElement {
  const noop = () => undefined;
  return new WorldMap(profile, { onPlay: noop, onSwitchPlayer: noop, onShop: noop }).element;
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

  it('marks learn and review levels with a badge', () => {
    const profile = createProfile('Ola', 'a');
    const map = mapOf({ ...profile, levelResults: { 'polana-1': DONE, 'polana-2': DONE } });
    const badges = nodes(map)
      .slice(0, 3)
      .map((node) => node.querySelector('.node-kind')?.textContent ?? null);
    expect(badges).toEqual(['✨', null, '🔁']);
  });
});
