import { describe, expect, it } from 'vitest';
import { REGIONS, type Level } from '../course/regions';
import { planFor, type Phase } from './LevelPlan';

const firstRegularLevel = (regionIndex: number): Level =>
  REGIONS[regionIndex].levels.find((level) => !level.isBoss)!;

const bossLevel = (regionIndex: number): Level =>
  REGIONS[regionIndex].levels.find((level) => level.isBoss)!;

const wordsPhase = (level: Level): Phase => planFor(level).find((phase) => phase.kind === 'words')!;

describe('planFor', () => {
  it('plans a warmup followed by words for regular levels', () => {
    const kinds = planFor(firstRegularLevel(0)).map((phase) => phase.kind);
    expect(kinds).toEqual(['warmup', 'words']);
  });

  it('grows the word count with each region', () => {
    const counts = REGIONS.map((_, index) => wordsPhase(firstRegularLevel(index)).count);
    for (let index = 1; index < counts.length; index += 1) {
      expect(counts[index]).toBeGreaterThan(counts[index - 1]);
    }
  });

  it('speeds words up and spawns them more often in later levels', () => {
    const early = wordsPhase(firstRegularLevel(0));
    const late = wordsPhase(firstRegularLevel(REGIONS.length - 1));
    expect(late.speed).toBeGreaterThan(early.speed);
    expect(late.spawnInterval).toBeLessThanOrEqual(early.spawnInterval);
    expect(late.spawnInterval).toBeGreaterThan(0);
  });

  it('plans a single boss phase that gets tougher with each region', () => {
    const bosses = REGIONS.map((_, index) => planFor(bossLevel(index)));
    for (const plan of bosses) expect(plan.map((phase) => phase.kind)).toEqual(['boss']);
    for (let index = 1; index < bosses.length; index += 1) {
      expect(bosses[index][0].count).toBeGreaterThan(bosses[index - 1][0].count);
      expect(bosses[index][0].speed).toBeGreaterThan(bosses[index - 1][0].speed);
    }
  });
});
