import { describe, expect, it } from 'vitest';
import { tagFactor, type CompletedWord } from '../course/xp';
import { MINION_TAG } from './mechanics/bossPhases/Minions';
import { MERGED_TAG } from './mechanics/mergeEnemies/rules';
import { POWER_TAG } from './mechanics/powerWords/PowerEnemy';
import { RunRewards } from './RunRewards';

const COURSE = { xpFactor: 1, coinsPerWord: 1 };
const ARENA = { xpFactor: 0.4, coinsPerWord: 0.625 };

function wordOf(overrides: Partial<CompletedWord> = {}): CompletedWord {
  return { letters: 3, tags: [], bossHit: false, fever: false, multiplier: 2, ...overrides };
}

describe('RunRewards', () => {
  it('adds XP and a coin for every completed word', () => {
    const rewards = new RunRewards(COURSE);
    expect(rewards.recordWord(wordOf())).toBe(6);
    expect(rewards.recordWord(wordOf({ fever: true }))).toBe(12);
    expect(rewards).toMatchObject({ xp: 18, coins: 2 });
  });

  it('scales the XP of each word by the XP factor of the plan', () => {
    const rewards = new RunRewards(ARENA);
    expect(rewards.recordWord(wordOf())).toBe(2);
    expect(rewards.recordWord(wordOf({ fever: true }))).toBe(5);
    expect(rewards).toMatchObject({ xp: 7, coins: 1 });
  });

  it('pays whole coins once the word coins of the plan add up', () => {
    const rewards = new RunRewards(ARENA);
    for (let word = 0; word < 8; word += 1) rewards.recordWord(wordOf());
    rewards.addCoins(15);
    expect(rewards.coins).toBe(20);
  });

  it('takes extra coins from mechanics and ignores negative amounts', () => {
    const rewards = new RunRewards(COURSE);
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
