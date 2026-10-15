import { describe, expect, it } from 'vitest';
import { VoiceBudget } from './VoiceBudget';

const LIMIT = 4;
const NOTE_END = 10;

function fill(budget: VoiceBudget, count: number, time = 0): number {
  let played = 0;
  for (let index = 0; index < count; index += 1) {
    budget.play(time, () => {
      played += 1;
      return NOTE_END;
    });
  }
  return played;
}

describe('VoiceBudget', () => {
  it('plays core voices up to the limit', () => {
    expect(fill(new VoiceBudget(LIMIT), LIMIT + 2)).toBe(LIMIT);
  });

  it('frees voices once they have ended', () => {
    const budget = new VoiceBudget(LIMIT);
    fill(budget, LIMIT);
    expect(fill(budget, 1, NOTE_END - 1)).toBe(0);
    expect(fill(budget, 1, NOTE_END)).toBe(1);
  });

  it('counts sustained layers against the limit', () => {
    const budget = new VoiceBudget(LIMIT);
    budget.sustain();
    expect(fill(budget, LIMIT)).toBe(LIMIT - 1);
  });

  it('stops counting a sustained layer after release', () => {
    const budget = new VoiceBudget(LIMIT);
    budget.sustain();
    budget.releaseSustain();
    budget.releaseSustain();
    expect(fill(budget, LIMIT)).toBe(LIMIT);
  });

  it('keeps headroom for core voices when playing ornaments', () => {
    const budget = new VoiceBudget(LIMIT);
    let ornaments = 0;
    for (let index = 0; index < LIMIT; index += 1) {
      budget.play(
        0,
        () => {
          ornaments += 1;
          return NOTE_END;
        },
        'ornament',
      );
    }
    expect(ornaments).toBe(LIMIT - 2);
    expect(fill(budget, LIMIT)).toBe(2);
  });
});
