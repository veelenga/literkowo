export const BELOW_DOCK_CLASS = 'is-below-dock';

export type StopDock = () => void;

export function keepDockBelowRow(
  grid: HTMLElement,
  anchor: HTMLElement,
  tiles: readonly HTMLElement[],
): StopDock {
  let width: number | undefined;
  const observer = new ResizeObserver(() => {
    if (grid.clientWidth === width) return;
    width = grid.clientWidth;
    markTilesBelow(anchor, tiles);
  });
  observer.observe(grid);
  return () => observer.disconnect();
}

export function markTilesBelow(anchor: HTMLElement, tiles: readonly HTMLElement[]): void {
  tiles.forEach((tile) => tile.classList.remove(BELOW_DOCK_CLASS));
  const rowTop = anchor.offsetTop;
  tiles.forEach((tile) => tile.classList.toggle(BELOW_DOCK_CLASS, tile.offsetTop > rowTop));
}
