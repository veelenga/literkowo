import { describe, expect, it } from 'vitest';
import { TROPHIES } from '../course/shop';
import { treasuresNote } from './resultTreasures';

describe('treasuresNote', () => {
  it('stays hidden when nothing new was earned', () => {
    expect(treasuresNote({ trophies: [], newItems: false })).toBeNull();
  });

  it('lists each new trophy and a hint about new shop items', () => {
    const note = treasuresNote({ trophies: TROPHIES.slice(0, 2), newItems: true });
    const chips = [...(note?.querySelectorAll('.treasure-chip') ?? [])];
    expect(chips.map((chip) => chip.textContent)).toEqual([
      'Nowy skarb: Pogromca bossa',
      'Nowy skarb: Polana',
      'Nowość w sklepie',
    ]);
  });
});
