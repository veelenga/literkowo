import { describe, expect, it, vi } from 'vitest';
import { TROPHIES } from '../course/shop';
import { treasuresNote } from './resultTreasures';

const NOTHING = { trophies: [], newItems: false, arenaOpened: false };

describe('treasuresNote', () => {
  it('stays hidden when nothing new was earned', () => {
    expect(treasuresNote(NOTHING, vi.fn())).toBeNull();
  });

  it('lists each new trophy and a hint about new shop items', () => {
    const note = treasuresNote(
      { ...NOTHING, trophies: TROPHIES.slice(0, 2), newItems: true },
      vi.fn(),
    );
    const chips = [...(note?.querySelectorAll('.treasure-chip') ?? [])];
    expect(chips.map((chip) => chip.textContent)).toEqual([
      'Nowy skarb: Pogromca bossa›',
      'Nowy skarb: Polana›',
      'Nowość w sklepie›',
    ]);
  });

  it('opens the trophies from a trophy chip and the shop from the news chip', () => {
    const onShop = vi.fn();
    const note = treasuresNote(
      { ...NOTHING, trophies: TROPHIES.slice(0, 1), newItems: true },
      onShop,
    );
    const [trophy, news] = [
      ...(note?.querySelectorAll<HTMLButtonElement>('button.treasure-chip') ?? []),
    ];
    trophy.click();
    news.click();
    expect(onShop.mock.calls).toEqual([['trophy'], []]);
  });

  it('announces the arena once it opens, without a shop link', () => {
    const note = treasuresNote({ ...NOTHING, arenaOpened: true }, vi.fn());
    const chip = note?.querySelector('.treasure-chip.is-arena');
    expect(chip?.textContent).toBe('Arena otwarta!');
    expect(chip?.tagName).toBe('SPAN');
  });
});
