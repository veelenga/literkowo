import { describe, expect, it } from 'vitest';
import { requireLevel } from '../testing/levels';
import { LEVELS, REGIONS, type Region } from './catalog';
import {
  difficultyFor,
  FOCUS_WORD_LENGTHS,
  levelTempo,
  MINI_BOSS_HITS,
  MINI_BOSS_SPEED_SHARE,
  PRACTICE_LENGTHS,
  REVIEW_LENGTHS,
  WORD_SPEED,
} from './difficulty';

const OLD_FIRST_LEVEL = { wordSpeed: 0.7, warmupSpeed: 0.55, spawns: 18 };
const WALK_DISTANCE = 9.4;
const FIRST_LEVEL_SECONDS = 22;
const SECONDS_PRECISION = 0;
const SMALL_STEP = 1.02;
const PRECISION = 6;

function regionGrowth(region: Region): number {
  const teaching = region.levels.filter((level) => !level.isBoss);
  const first = teaching[0];
  const last = teaching[teaching.length - 1];
  return levelTempo(last).end.speed - levelTempo(first).start.speed;
}

describe('difficultyFor', () => {
  it('makes the first levels slower and shorter than the old first level', () => {
    for (const id of ['polana-1', 'polana-2', 'polana-3']) {
      const { warmup, main } = difficultyFor(requireLevel(id));
      expect(main.speed).toBeLessThan(OLD_FIRST_LEVEL.wordSpeed);
      expect(warmup?.speed).toBeLessThan(OLD_FIRST_LEVEL.warmupSpeed);
      expect((warmup?.count ?? 0) + main.count).toBeLessThan(OLD_FIRST_LEVEL.spawns);
    }
  });

  it('lets a letter of the first level take about 22 seconds to reach the hero', () => {
    const { main } = difficultyFor(requireLevel('polana-1'));
    expect(WALK_DISTANCE / main.speed).toBeCloseTo(FIRST_LEVEL_SECONDS, SECONDS_PRECISION);
  });

  it('makes the second and third levels only a little faster', () => {
    const first = levelTempo(requireLevel('polana-1')).start.speed;
    const third = levelTempo(requireLevel('polana-3')).end.speed;
    expect(third).toBeGreaterThan(first);
    expect(third / first).toBeLessThan(SMALL_STEP);
  });

  it('grows the pace slowly in Polana and lets later regions carry the growth', () => {
    const growth = REGIONS.map(regionGrowth);
    for (let index = 1; index < growth.length; index += 1) {
      expect(growth[index]).toBeGreaterThan(growth[index - 1]);
    }
  });

  it('reaches the last word speed at the end of the course', () => {
    const lastTeaching = LEVELS.filter((level) => !level.isBoss).at(-1);
    expect(lastTeaching && levelTempo(lastTeaching).end.speed).toBeCloseTo(
      WORD_SPEED.last,
      PRECISION,
    );
  });

  it('keeps the pace through a boss level', () => {
    const review = levelTempo(requireLevel('polana-18')).end;
    const boss = levelTempo(requireLevel('polana-19'));
    const nextLearn = levelTempo(requireLevel('las-1')).start;
    expect(boss.start).toEqual(review);
    expect(boss.end).toEqual(review);
    expect(nextLearn).toEqual(review);
  });

  it('allows single letters only in learn levels', () => {
    for (const level of LEVELS) {
      const { lengths } = difficultyFor(level);
      expect(lengths.min === 1).toBe(level.kind === 'learn');
    }
  });

  it('caps words by the kind of level', () => {
    expect(difficultyFor(requireLevel('polana-4')).lengths.max).toBe(FOCUS_WORD_LENGTHS.max);
    expect(difficultyFor(requireLevel('polana-5')).lengths.max).toBe(PRACTICE_LENGTHS.max);
    expect(difficultyFor(requireLevel('polana-8')).lengths.max).toBe(REVIEW_LENGTHS.max);
  });

  it('lets generated words grow longer along the course', () => {
    const early = difficultyFor(requireLevel('polana-3')).generatedLengths;
    const late = difficultyFor(requireLevel('wyspa-23')).generatedLengths;
    expect(late.max).toBeGreaterThan(early.max);
    for (const level of LEVELS) {
      const { lengths, generatedLengths } = difficultyFor(level);
      expect(generatedLengths.max).toBeLessThanOrEqual(lengths.max);
      expect(generatedLengths.max).toBeGreaterThanOrEqual(generatedLengths.min);
    }
  });

  it('closes only review levels with a mini boss of 3 to 5 hits', () => {
    for (const level of LEVELS) {
      const { miniBoss } = difficultyFor(level);
      expect(miniBoss !== undefined).toBe(level.kind === 'review');
    }
    expect(difficultyFor(requireLevel('polana-3')).miniBoss?.count).toBe(MINI_BOSS_HITS.first);
    expect(difficultyFor(requireLevel('wyspa-23')).miniBoss?.count).toBe(MINI_BOSS_HITS.last);
  });

  it('sends the mini boss a little slower than the last words of the review', () => {
    const level = requireLevel('las-10');
    const { miniBoss } = difficultyFor(level);
    expect(miniBoss?.speed).toBeCloseTo(
      levelTempo(level).end.speed * MINI_BOSS_SPEED_SHARE,
      PRECISION,
    );
    expect(miniBoss?.spawnInterval).toBe(0);
  });

  it('skips the warmup for bosses', () => {
    expect(difficultyFor(requireLevel('polana-19')).warmup).toBeUndefined();
  });
});
