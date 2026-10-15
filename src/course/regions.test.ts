import { describe, expect, it } from 'vitest';
import { LEVELS, REGIONS, allowedKeysFor, nextLevel, previousLevel, regionsFor } from './regions';

describe('regions', () => {
  it('ends every region with a boss', () => {
    for (const region of REGIONS) expect(region.levels.at(-1)?.isBoss).toBe(true);
  });

  it('unlocks keys cumulatively in level order', () => {
    const [first, second, third, fourth] = LEVELS;
    expect(allowedKeysFor(first)).toBe('fj');
    expect(allowedKeysFor(second)).toBe('fj');
    expect(allowedKeysFor(third)).toBe('fj');
    expect(allowedKeysFor(fourth, 'en')).toBe('fjd');
  });

  it('hides the Polish letters region for English profiles', () => {
    expect(regionsFor('en').map((region) => region.id)).not.toContain('wyspa');
    expect(regionsFor('pl').map((region) => region.id)).toContain('wyspa');
  });

  it('keeps the level walking helpers as course wrappers', () => {
    const lastMeadow = REGIONS[0].levels.at(-1);
    expect(lastMeadow && nextLevel(lastMeadow, 'pl')?.id).toBe('las-1');
    expect(previousLevel(LEVELS[0], 'pl')).toBeUndefined();
  });
});
