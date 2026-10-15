import { describe, expect, it } from 'vitest';
import { hasReachedArenaGoal } from './goals';
import { GOLD, SILVER } from './medals';
import { emptyArenaRecord, type EndlessBest } from './record';

const BEST: EndlessBest = { wave: 14, score: 1, accuracy: 0.97, medal: SILVER, date: '', runs: 3 };

describe('hasReachedArenaGoal', () => {
  it('needs a gold medal in any key set and difficulty', () => {
    const silver = { ...emptyArenaRecord(), endless: { 'las/normal': BEST } };
    expect(hasReachedArenaGoal(silver, { kind: 'gold' })).toBe(false);
    const gold = {
      ...silver,
      endless: { ...silver.endless, 'gory/calm': { ...BEST, medal: GOLD } },
    };
    expect(hasReachedArenaGoal(gold, { kind: 'gold' })).toBe(true);
  });

  it('needs the waves cleared in one run', () => {
    const record = { ...emptyArenaRecord(), endless: { 'las/normal': BEST } };
    expect(hasReachedArenaGoal(record, { kind: 'wave', wave: 15 })).toBe(false);
    expect(hasReachedArenaGoal(record, { kind: 'wave', wave: 14 })).toBe(true);
    expect(hasReachedArenaGoal(emptyArenaRecord(), { kind: 'wave', wave: 1 })).toBe(false);
  });
});
