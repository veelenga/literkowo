// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { devArenaFromUrl, devLevelFromUrl, devPlacementFromUrl } from './devShortcut';

function open(search: string): void {
  history.replaceState(null, '', `/${search}`);
}

describe('dev shortcuts', () => {
  afterEach(() => open(''));

  it('reads a level id', () => {
    open('?level=polana-3');
    expect(devLevelFromUrl()?.id).toBe('polana-3');
  });

  it('reads an arena key set and a difficulty level', () => {
    open('?arena=las-2');
    const choice = devArenaFromUrl();
    expect(choice?.keySet.id).toBe('las');
    expect(choice?.difficulty.id).toBe('normal');
  });

  it('ignores an unknown key set or difficulty', () => {
    for (const value of ['mars-2', 'las-7', 'las', 'las-normal']) {
      open(`?arena=${value}`);
      expect(devArenaFromUrl()).toBeUndefined();
    }
  });

  it('starts the placement test only with placement set to 1', () => {
    open('?placement=1');
    expect(devPlacementFromUrl()).toBe(true);
    open('?placement=2');
    expect(devPlacementFromUrl()).toBe(false);
    open('');
    expect(devPlacementFromUrl()).toBe(false);
  });
});
