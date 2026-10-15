import { describe, expect, it } from 'vitest';
import { tagFactor, type CompletedWord } from '../course/xp';
import { MINION_TAG } from './mechanics/bossPhases/Minions';
import { MERGED_TAG } from './mechanics/mergeEnemies/rules';
import { POWER_TAG } from './mechanics/powerWords/PowerEnemy';
import { RunRewards } from './RunRewards';

const FULL_XP = 1;
const ARENA_XP = 0.4;

function word(overrides: Partial<CompletedWord> = {}): CompletedWord {
  return { letters: 3, tags: [], bossHit: false, fever: false, multiplier: 2, ...overrides };
}

describe('RunRewards', () => {
  it('adds XP and a coin for every completed word', () => {
    const rewards = new RunRewards(FULL_XP);
    expect(rewards.recordWord(word())).toBe(6);
    expect(rewards.recordWord(word({ fever: true }))).toBe(12);
    expect(rewards).toMatchObject({ xp: 18, coins: 2 });
  });

  it('scales the XP of each word by the XP factor of the plan', () => {
    const rewards = new RunRewards(ARENA_XP);
    expect(rewards.recordWord(word())).toBe(2);
    expect(rewards.recordWord(word({ fever: true }))).toBe(5);
    expect(rewards).toMatchObject({ xp: 7, coins: 2 });
  });

  it('takes extra coins from mechanics and ignores negative amounts', () => {
    const rewards = new RunRewards(FULL_XP);
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
