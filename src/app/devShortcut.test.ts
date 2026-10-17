// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { AVATARS, createProfile } from '../profiles/Profile';
import {
  devArenaFromUrl,
  devDailyFromUrl,
  devLevelFromUrl,
  devPlacementFromUrl,
  devProfile,
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
    const choice = devArenaFromUrl('pl');
    expect(choice?.keySet.id).toBe('las');
    expect(choice?.difficulty.id).toBe('normal');
  });

  it('ignores an unknown key set or difficulty', () => {
    for (const value of ['mars-2', 'las-7', 'las', 'las-normal']) {
      open(`?arena=${value}`);
      expect(devArenaFromUrl('pl')).toBeUndefined();
    }
  });

  it('reads the key set of the daily and an optional weekday from Monday', () => {
    open('?daily=las');
    expect(devDailyFromUrl('pl')).toMatchObject({ keySet: { id: 'las' } });
    expect(devDailyFromUrl('pl')?.format).toBeUndefined();
    open('?daily=gory&weekday=1');
    expect(devDailyFromUrl('pl')).toMatchObject({
      keySet: { id: 'gory' },
      format: { id: 'twoMinutes' },
    });
    open('?daily=gory&weekday=9');
    expect(devDailyFromUrl('pl')?.format).toBeUndefined();
  });

  it('ignores an unknown daily key set', () => {
    open('?daily=mars');
    expect(devDailyFromUrl('pl')).toBeUndefined();
  });

  it('resolves key sets in the given word language', () => {
    open('?arena=wyspa-3');
    expect(devArenaFromUrl('pl')?.keySet.id).toBe('wyspa');
    expect(devArenaFromUrl('en')).toBeUndefined();
    open('?daily=wyspa');
    expect(devDailyFromUrl('en')).toBeUndefined();
  });

  it('gives the temporary profile the word language of the active one', () => {
    const active = { ...createProfile('Ola', AVATARS[1], 'en'), coins: 50 };
    const profile = devProfile(active);
    expect(profile.name).toBe('Test');
    expect(profile.wordLanguage).toBe('en');
    expect(profile.avatar).toBe(AVATARS[1]);
    expect(profile.coins).toBe(0);
    expect(devProfile().wordLanguage).toBe('pl');
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
