import { describe, expect, it } from 'vitest';
import { RECENT_WORDS, RecentWords } from './recentWords';

describe('RecentWords', () => {
  it('remembers the last words shown', () => {
    const recent = new RecentWords();
    recent.add('kot');
    expect(recent.has('kot')).toBe(true);
    expect(recent.has('las')).toBe(false);
  });

  it('forgets a word once enough other words came after it', () => {
    const recent = new RecentWords();
    recent.add('kot');
    for (let index = 1; index < RECENT_WORDS; index += 1) recent.add(`word${index}`);
    expect(recent.has('kot')).toBe(true);
    recent.add('las');
    expect(recent.has('kot')).toBe(false);
  });

  it('reads the words shown elsewhere without counting them as its own', () => {
    const spawns = new RecentWords();
    const features = new RecentWords(spawns);
    spawns.add('kot');
    expect(features.hasElsewhere('kot')).toBe(true);
    expect(features.has('kot')).toBe(false);
    features.add('las');
    expect(spawns.has('las')).toBe(false);
  });
});
