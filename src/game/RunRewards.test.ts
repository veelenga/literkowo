import { describe, expect, it } from 'vitest';
import { tagFactor, type CompletedWord } from '../course/xp';
import { MINION_TAG } from './mechanics/bossPhases/Minions';
import { MERGED_TAG } from './mechanics/mergeEnemies/rules';
import { POWER_TAG } from './mechanics/powerWords/PowerEnemy';
import { RunRewards } from './RunRewards';

function word(overrides: Partial<CompletedWord> = {}): CompletedWord {
  return { letters: 3, tags: [], bossHit: false, fever: false, multiplier: 2, ...overrides };
}

describe('RunRewards', () => {
  it('adds XP and a coin for every completed word', () => {
    const rewards = new RunRewards();
    expect(rewards.recordWord(word())).toBe(6);
    expect(rewards.recordWord(word({ fever: true }))).toBe(12);
    expect(rewards).toMatchObject({ xp: 18, coins: 2 });
  });

  it('takes extra coins from mechanics and ignores negative amounts', () => {
    const rewards = new RunRewards();
    rewards.addCoins(5);
    rewards.addCoins(-3);
    expect(rewards.coins).toBe(5);
  });
});

describe('enemy tags', () => {
  it('match the tags the mechanics put on enemies', () => {
    expect(tagFactor([MERGED_TAG])).toBe(3);
    expect(tagFactor([POWER_TAG])).toBe(2);
    expect(tagFactor([MINION_TAG])).toBe(1);
  });
});
