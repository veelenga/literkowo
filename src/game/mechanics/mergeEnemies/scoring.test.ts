import { describe, expect, it } from 'vitest';
import { FEVER_COMBO } from '../../combo';
import { SessionStats } from '../../SessionStats';
import { wordPoints } from './scoring';

const WORD = 'kotlas';

function pointsRecordedBy(stats: SessionStats): number {
  const before = stats.score;
  stats.recordWord(WORD);
  return stats.score - before;
}

describe('wordPoints', () => {
  it('matches the points the session gives a word', () => {
    const stats = new SessionStats();
    expect(wordPoints(WORD, stats)).toBe(pointsRecordedBy(stats));
    for (let hit = 0; hit < FEVER_COMBO; hit += 1) stats.recordHit();
    expect(stats.fever).toBe(true);
    expect(wordPoints(WORD, stats)).toBe(pointsRecordedBy(stats));
  });
});
