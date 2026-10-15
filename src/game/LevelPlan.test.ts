import { describe, expect, it } from 'vitest';
import type { LevelKind } from '../course/catalog';
import { LEVELS, REGIONS, type Level } from '../course/regions';
import { requireLevel } from '../testing/levels';
import { planFor, type Phase } from './LevelPlan';

const bossLevel = (regionIndex: number): Level =>
  REGIONS[regionIndex].levels.find((level) => level.isBoss)!;

const mainPhase = (level: Level): Phase => planFor(level).at(-1)!;

const levelsOf = (kind: LevelKind): Level[] => LEVELS.filter((level) => level.kind === kind);

describe('planFor', () => {
  it('plans a warmup and the main phase for each kind of level', () => {
    const kinds = (id: string) => planFor(requireLevel(id)).map((phase) => phase.kind);
    expect(kinds('polana-1')).toEqual(['warmup', 'learn']);
    expect(kinds('polana-2')).toEqual(['warmup', 'words']);
    expect(kinds('polana-3')).toEqual(['warmup', 'words']);
    expect(kinds('polana-19')).toEqual(['boss']);
  });

  it('makes a learn level slower and shorter than the practice level after it', () => {
    const learn = planFor(requireLevel('polana-4'));
    const practice = planFor(requireLevel('polana-5'));
    expect(learn[1].speed).toBeLessThan(practice[1].speed);
    expect(learn[1].count).toBeLessThan(practice[1].count);
    expect(learn[0].speed).toBeLessThan(practice[0].speed);
  });

  it.each(['learn', 'practice', 'review'] as const)(
    'ramps %s levels slowly along the course',
    (kind) => {
      const phases = levelsOf(kind).map(mainPhase);
      for (let index = 1; index < phases.length; index += 1) {
        expect(phases[index].speed).toBeGreaterThan(phases[index - 1].speed);
        expect(phases[index].spawnInterval).toBeLessThan(phases[index - 1].spawnInterval);
        expect(phases[index].count).toBeGreaterThanOrEqual(phases[index - 1].count);
      }
    },
  );

  it('plans a single boss phase that gets tougher with each region', () => {
    const bosses = REGIONS.map((_, index) => planFor(bossLevel(index)));
    for (const plan of bosses) expect(plan.map((phase) => phase.kind)).toEqual(['boss']);
    for (let index = 1; index < bosses.length; index += 1) {
      expect(bosses[index][0].count).toBeGreaterThan(bosses[index - 1][0].count);
      expect(bosses[index][0].speed).toBeGreaterThan(bosses[index - 1][0].speed);
    }
  });
});
