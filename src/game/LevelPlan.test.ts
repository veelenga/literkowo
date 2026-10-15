import { describe, expect, it } from 'vitest';
import type { LevelKind } from '../course/catalog';
import { COINS_PER_WORD } from '../course/coins';
import { KIND_RULES, MINI_BOSS_HITS } from '../course/difficulty';
import { LEVELS, REGIONS, type Level } from '../course/regions';
import { requireLevel } from '../testing/levels';
import { LEVEL_LIVES, LEVEL_XP_FACTOR, levelPhases, levelPlan } from './LevelPlan';
import type { Phase, RunPhase, RunPlan } from './RunPlan';

const PRECISION = 6;

const bossLevel = (regionIndex: number): Level =>
  REGIONS[regionIndex].levels.find((level) => level.isBoss)!;

const phasesOf = (level: Level): RunPhase[] => levelPhases(level, 'pl');

const mainPhase = (level: Level): Phase =>
  phasesOf(level).find((phase) => phase.kind !== 'warmup')!;

const levelsOf = (kind: LevelKind): Level[] => LEVELS.filter((level) => level.kind === kind);

function planPhases(plan: RunPlan): RunPhase[] {
  const phases: RunPhase[] = [];
  for (let phase = plan.phaseAt(0); phase; phase = plan.phaseAt(phases.length)) {
    phases.push(phase);
  }
  return phases;
}

function expectPace(phase: RunPhase | undefined, expected: Phase): void {
  expect(phase?.kind).toBe(expected.kind);
  expect(phase?.count).toBe(expected.count);
  expect(phase?.speed).toBeCloseTo(expected.speed, PRECISION);
  expect(phase?.spawnInterval).toBeCloseTo(expected.spawnInterval, PRECISION);
  expect(phase?.rampTo?.speed).toBeCloseTo(expected.rampTo?.speed ?? NaN, PRECISION);
  expect(phase?.rampTo?.spawnInterval).toBeCloseTo(
    expected.rampTo?.spawnInterval ?? NaN,
    PRECISION,
  );
}

function expectSteady(phase: RunPhase | undefined, expected: Phase): void {
  expect(phase).toMatchObject({ kind: expected.kind, count: expected.count });
  expect(phase?.speed).toBeCloseTo(expected.speed, PRECISION);
  expect(phase?.spawnInterval).toBeCloseTo(expected.spawnInterval, PRECISION);
  expect(phase?.rampTo).toBeUndefined();
}

describe('levelPlan', () => {
  it('runs a learn level as a warmup and a learn phase', () => {
    const plan = levelPlan(requireLevel('polana-1'), 'pl');
    expect(plan.lives).toBe(LEVEL_LIVES);
    expect(plan.xpFactor).toBe(LEVEL_XP_FACTOR);
    expect(plan.coinsPerWord).toBe(COINS_PER_WORD);
    expect(plan.allMechanicsUnlocked).toBe(false);
    expectSteady(plan.phaseAt(0), { kind: 'warmup', count: 5, speed: 0.42, spawnInterval: 1.6 });
    expectPace(plan.phaseAt(1), {
      kind: 'learn',
      count: 12,
      speed: 0.42,
      spawnInterval: 4.4,
      rampTo: { speed: 0.420856, spawnInterval: 4.397257 },
    });
    expect(plan.phaseAt(2)).toBeUndefined();
    expect(plan.phaseAt(1)?.words).toEqual({
      allowedKeys: 'fj',
      focusKeys: 'fj',
      lengths: { min: 1, max: 3 },
      generatedLengths: { min: 1, max: 3 },
      stages: KIND_RULES.learn.stages,
    });
  });

  it('runs a practice level as a warmup and a words phase', () => {
    const plan = levelPlan(requireLevel('polana-5'), 'pl');
    expectSteady(plan.phaseAt(0), {
      kind: 'warmup',
      count: 5,
      speed: 0.426847,
      spawnInterval: 1.5,
    });
    expectPace(plan.phaseAt(1), {
      kind: 'words',
      count: 12,
      speed: 0.426847,
      spawnInterval: 4.378055,
      rampTo: { speed: 0.429569, spawnInterval: 4.369331 },
    });
    expect(plan.phaseAt(2)).toBeUndefined();
    expect(plan.phaseAt(1)?.words).toEqual({
      allowedKeys: 'fjd',
      focusKeys: 'd',
      lengths: { min: 2, max: 4 },
      generatedLengths: { min: 2, max: 3 },
      stages: KIND_RULES.practice.stages,
    });
  });

  it('runs a review level as a warmup, a longer words phase and a mini boss', () => {
    const plan = levelPlan(requireLevel('polana-8'), 'pl');
    expectSteady(plan.phaseAt(0), {
      kind: 'warmup',
      count: 5,
      speed: 0.435851,
      spawnInterval: 1.5,
    });
    expectPace(plan.phaseAt(1), {
      kind: 'words',
      count: 13,
      speed: 0.435851,
      spawnInterval: 4.349196,
      rampTo: { speed: 0.439366, spawnInterval: 4.33793 },
    });
    expectSteady(plan.phaseAt(2), { kind: 'boss', count: 3, speed: 0.351493, spawnInterval: 0 });
    expect(plan.phaseAt(2)?.miniBoss).toBe(true);
    expect(plan.phaseAt(2)?.words).toBe(plan.phaseAt(1)?.words);
    expect(plan.phaseAt(3)).toBeUndefined();
    expect(plan.phaseAt(1)?.words).toEqual({
      allowedKeys: 'fjdk',
      focusKeys: 'dk',
      lengths: { min: 2, max: 5 },
      generatedLengths: { min: 2, max: 3 },
      stages: KIND_RULES.review.stages,
    });
  });

  it('runs a boss level as a single boss phase', () => {
    const plan = levelPlan(requireLevel('polana-19'), 'pl');
    expectSteady(plan.phaseAt(0), { kind: 'boss', count: 6, speed: 0.340408, spawnInterval: 0 });
    expect(plan.phaseAt(1)).toBeUndefined();
    expect(plan.phaseAt(0)?.miniBoss).toBeUndefined();
    expect(plan.phaseAt(0)?.words).toEqual({
      allowedKeys: 'fjdksla;',
      focusKeys: 'fjdksla;',
      lengths: { min: 2, max: 5 },
      generatedLengths: { min: 2, max: 3 },
      stages: [],
    });
  });

  it('keeps one set of word rules for the whole level', () => {
    const [warmup, main] = planPhases(levelPlan(requireLevel('las-10'), 'pl'));
    expect(warmup.words).toBe(main.words);
    expect(main.words.focusKeys).toBe('ei');
  });

  it('takes the keys of the word language', () => {
    const level = requireLevel('wyspa-1');
    const polish = levelPlan(level, 'pl').phaseAt(0)?.words.allowedKeys;
    const english = levelPlan(level, 'en').phaseAt(0)?.words.allowedKeys;
    expect(polish).toContain('ą');
    expect(english).not.toContain('ą');
  });

  it('has no phase before the first one', () => {
    expect(levelPlan(requireLevel('polana-2'), 'pl').phaseAt(-1)).toBeUndefined();
  });
});

describe('levelPhases', () => {
  it('plans a warmup and the main phase for each kind of level', () => {
    const kinds = (id: string) => phasesOf(requireLevel(id)).map((phase) => phase.kind);
    expect(kinds('polana-1')).toEqual(['warmup', 'learn']);
    expect(kinds('polana-2')).toEqual(['warmup', 'words']);
    expect(kinds('polana-3')).toEqual(['warmup', 'words', 'boss']);
    expect(kinds('polana-19')).toEqual(['boss']);
  });

  it('matches the phases the plan gives by index', () => {
    for (const level of LEVELS) {
      expect(planPhases(levelPlan(level, 'pl'))).toEqual(phasesOf(level));
    }
  });

  it('starts every level at the pace the level before it ended with', () => {
    const teaching = LEVELS.filter((level) => !level.isBoss).map(mainPhase);
    for (let index = 1; index < teaching.length; index += 1) {
      const previous = teaching[index - 1].rampTo;
      expect(teaching[index].speed).toBeCloseTo(previous?.speed ?? NaN, PRECISION);
      expect(teaching[index].spawnInterval).toBeCloseTo(previous?.spawnInterval ?? NaN, PRECISION);
    }
  });

  it('starts the warmup at the pace the main phase starts with', () => {
    for (const level of LEVELS.filter((candidate) => !candidate.isBoss)) {
      const [warmup, main] = phasesOf(level);
      expect(warmup.speed).toBe(main.speed);
    }
  });

  it('speeds up inside a level', () => {
    for (const level of LEVELS.filter((candidate) => !candidate.isBoss)) {
      const main = mainPhase(level);
      expect(main.rampTo?.speed).toBeGreaterThan(main.speed);
      expect(main.rampTo?.spawnInterval).toBeLessThan(main.spawnInterval);
    }
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

  it('ends only review levels with a mini boss a little slower than their last words', () => {
    for (const level of LEVELS) {
      const miniBoss = phasesOf(level).find((phase) => phase.miniBoss);
      expect(miniBoss !== undefined).toBe(level.kind === 'review');
      if (!miniBoss) continue;
      expect(miniBoss.kind).toBe('boss');
      expect(miniBoss.count).toBeGreaterThanOrEqual(MINI_BOSS_HITS.first);
      expect(miniBoss.count).toBeLessThanOrEqual(MINI_BOSS_HITS.last);
      expect(miniBoss.speed).toBeLessThan(mainPhase(level).rampTo?.speed ?? 0);
    }
  });

  it('gives later mini bosses more hits', () => {
    const hits = (id: string) => phasesOf(requireLevel(id)).at(-1)?.count;
    expect([hits('polana-3'), hits('gory-10'), hits('wyspa-23')]).toEqual([3, 4, 5]);
  });

  it('plans a single boss phase that gets tougher with each region', () => {
    const bosses = REGIONS.map((_, index) => phasesOf(bossLevel(index)));
    for (const plan of bosses) expect(plan.map((phase) => phase.kind)).toEqual(['boss']);
    for (let index = 1; index < bosses.length; index += 1) {
      expect(bosses[index][0].count).toBeGreaterThan(bosses[index - 1][0].count);
      expect(bosses[index][0].speed).toBeGreaterThan(bosses[index - 1][0].speed);
    }
  });
});
