import { describe, expect, it } from 'vitest';
import { BELOW_DOCK_CLASS, markTilesBelow } from './dockRow';

const ROW_HEIGHT = 320;

function tileAt(row: number): HTMLElement {
  const tile = document.createElement('button');
  Object.defineProperty(tile, 'offsetTop', { value: row * ROW_HEIGHT });
  return tile;
}

function belowDock(tiles: readonly HTMLElement[]): boolean[] {
  return tiles.map((tile) => tile.classList.contains(BELOW_DOCK_CLASS));
}

describe('markTilesBelow', () => {
  it('moves only the tiles of later rows below the dock', () => {
    const tiles = [tileAt(0), tileAt(0), tileAt(0), tileAt(1), tileAt(2)];
    markTilesBelow(tiles[1], tiles);
    expect(belowDock(tiles)).toEqual([false, false, false, true, true]);
  });

  it('keeps earlier rows above the dock', () => {
    const tiles = [tileAt(0), tileAt(1), tileAt(1), tileAt(2)];
    markTilesBelow(tiles[2], tiles);
    expect(belowDock(tiles)).toEqual([false, false, false, true]);
  });

  it('clears marks from an earlier layout', () => {
    const tiles = [tileAt(0), tileAt(0)];
    tiles[1].classList.add(BELOW_DOCK_CLASS);
    markTilesBelow(tiles[0], tiles);
    expect(belowDock(tiles)).toEqual([false, false]);
  });
});
