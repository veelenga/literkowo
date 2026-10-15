// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { devArenaFromUrl, devLevelFromUrl } from './devShortcut';

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
});
