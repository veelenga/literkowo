// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  devArenaFromUrl,
  devDailyFromUrl,
  devLevelFromUrl,
  devPlacementFromUrl,
} from './devShortcut';

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

  it('reads the key set of the daily and an optional weekday from Monday', () => {
    open('?daily=las');
    expect(devDailyFromUrl()).toMatchObject({ keySet: { id: 'las' } });
    expect(devDailyFromUrl()?.format).toBeUndefined();
    open('?daily=gory&weekday=1');
    expect(devDailyFromUrl()).toMatchObject({
      keySet: { id: 'gory' },
      format: { id: 'twoMinutes' },
    });
    open('?daily=gory&weekday=9');
    expect(devDailyFromUrl()?.format).toBeUndefined();
  });

  it('ignores an unknown daily key set', () => {
    open('?daily=mars');
    expect(devDailyFromUrl()).toBeUndefined();
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
