import { describe, expect, it } from 'vitest';
import { ENEMY_TYPE_TAG } from './mechanics/enemyTypes/kinds';
import { POWER_TAG } from './mechanics/powerWords/PowerEnemy';
import { RunTally } from './RunTally';

describe('RunTally', () => {
  it('counts words, power words, special enemies and bosses', () => {
    const tally = new RunTally();
    tally.recordWord(new Set());
    tally.recordWord(new Set([POWER_TAG]));
    tally.recordWord(new Set([ENEMY_TYPE_TAG]));
    tally.recordBossBeaten();
    expect(tally.snapshot()).toEqual({
      words: 3,
      powerWords: 1,
      specialEnemies: 1,
      bossesBeaten: 1,
    });
  });
});
