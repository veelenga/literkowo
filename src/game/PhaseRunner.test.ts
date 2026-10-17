import { describe, expect, it } from 'vitest';
import type { WordRules } from '../course/wordRules';
import { MAX_ENEMIES } from './board';
import { EMPTY_PHASE_RECORD, type PhaseRecord } from './PhaseMeter';
import { PhaseRunner } from './PhaseRunner';
import type { RunPhase, RunPlan } from './RunPlan';

const WORDS: WordRules = {
  allowedKeys: 'fj',
  focusKeys: 'fj',
  lengths: { min: 1, max: 2 },
  generatedLengths: { min: 1, max: 2 },
};
const COUNT = 3;
const INTERVAL = 2;
const BOSS_WORDS = 5;
const WORDS_PHASE: RunPhase = {
  kind: 'words',
  count: COUNT,
  speed: 1,
  spawnInterval: INTERVAL,
  words: WORDS,
};
const BOSS_PHASE: RunPhase = { ...WORDS_PHASE, kind: 'boss', count: BOSS_WORDS };
const EMPTY_BOARD = 0;
const NO_BOSS = undefined;
const REACHED: PhaseRecord = { ...EMPTY_PHASE_RECORD, reached: 1 };

function planOf(phases: readonly RunPhase[], extra: Partial<RunPlan> = {}): RunPlan {
  return {
    lives: 3,
    hitCost: 'life',
    xpFactor: 1,
    coinsPerWord: 1,
    allMechanicsUnlocked: false,
    phaseAt: (index) => phases[index],
    ...extra,
  };
}

function runnerOf(...phases: RunPhase[]): PhaseRunner {
  return new PhaseRunner(planOf(phases));
}

function spawn(runner: PhaseRunner, times: number): void {
  for (let spawned = 0; spawned < times; spawned += 1) runner.spawnNext(() => undefined);
}

describe('PhaseRunner spawning', () => {
  it('starts on the first phase of the plan', () => {
    const runner = runnerOf(WORDS_PHASE, BOSS_PHASE);
    expect(runner.phase).toBe(WORDS_PHASE);
    expect(runner.phaseIndex).toBe(0);
  });

  it('needs a plan with at least one phase', () => {
    expect(() => runnerOf()).toThrow();
  });

  it('spawns the first word at once and each next one after the spawn interval', () => {
    const runner = runnerOf(WORDS_PHASE);
    expect(runner.spawnCue(0, EMPTY_BOARD)).toBe('word');
    spawn(runner, 1);
    expect(runner.spawnCue(INTERVAL / 2, EMPTY_BOARD)).toBe('none');
    expect(runner.spawnCue(INTERVAL / 2, EMPTY_BOARD)).toBe('word');
  });

  it('rests through the calm of a phase before the first spawn', () => {
    const runner = runnerOf({ ...WORDS_PHASE, calmSeconds: 1 });
    expect(runner.spawnCue(0.6, EMPTY_BOARD)).toBe('none');
    expect(runner.spawnCue(0.6, EMPTY_BOARD)).toBe('none');
    expect(runner.spawnCue(0, EMPTY_BOARD)).toBe('word');
  });

  it('stops spawning once the count of the phase is reached', () => {
    const runner = runnerOf(WORDS_PHASE);
    spawn(runner, COUNT);
    expect(runner.spawnCue(INTERVAL, EMPTY_BOARD)).toBe('none');
  });

  it('holds spawns while the board is full', () => {
    expect(runnerOf(WORDS_PHASE).spawnCue(0, MAX_ENEMIES)).toBe('none');
    const small = runnerOf({ ...WORDS_PHASE, boardSize: 2 });
    expect(small.spawnCue(0, 2)).toBe('none');
    expect(small.spawnCue(0, 1)).toBe('word');
  });

  it('cues the boss in a boss phase', () => {
    expect(runnerOf(BOSS_PHASE).spawnCue(0, EMPTY_BOARD)).toBe('boss');
  });

  it('gives each spawn its order and the pace of that spawn', () => {
    const runner = runnerOf({ ...WORDS_PHASE, rampTo: { speed: 3, spawnInterval: 1 } });
    const spawns: { order: number; speed: number }[] = [];
    for (let spawned = 0; spawned < COUNT; spawned += 1) {
      runner.spawnNext((order) => spawns.push({ order, speed: runner.phase.speed }));
    }
    expect(spawns).toEqual([
      { order: 0, speed: 1 },
      { order: 1, speed: 2 },
      { order: 2, speed: 3 },
    ]);
    expect(runner.phase.spawnInterval).toBe(1);
  });

  it('refills a board with a size at once', () => {
    const runner = runnerOf({ ...WORDS_PHASE, boardSize: 2 });
    spawn(runner, 1);
    expect(runner.spawnCue(0, EMPTY_BOARD)).toBe('none');
    runner.refillBoard();
    expect(runner.spawnCue(0, EMPTY_BOARD)).toBe('word');
  });

  it('keeps the spawn interval of a board without a size', () => {
    const runner = runnerOf(WORDS_PHASE);
    spawn(runner, 1);
    runner.refillBoard();
    expect(runner.spawnCue(0, EMPTY_BOARD)).toBe('none');
  });
});

describe('PhaseRunner phases', () => {
  it('clears a words phase once every spawn has left the board', () => {
    const runner = runnerOf(WORDS_PHASE);
    expect(runner.isCleared(EMPTY_BOARD)).toBe(false);
    spawn(runner, COUNT);
    expect(runner.isCleared(1)).toBe(false);
    expect(runner.isCleared(EMPTY_BOARD)).toBe(true);
  });

  it('never clears a boss or a timed phase by its spawns', () => {
    const boss = runnerOf(BOSS_PHASE);
    spawn(boss, BOSS_WORDS);
    expect(boss.isCleared(EMPTY_BOARD)).toBe(false);
    const timed = runnerOf({ ...WORDS_PHASE, seconds: 10 });
    spawn(timed, COUNT);
    expect(timed.isCleared(EMPTY_BOARD)).toBe(false);
  });

  it('starts the next phase with fresh spawns and its own calm', () => {
    const next: RunPhase = { ...WORDS_PHASE, count: 2, calmSeconds: 1 };
    const runner = runnerOf(WORDS_PHASE, next);
    spawn(runner, COUNT);
    expect(runner.advance(EMPTY_PHASE_RECORD)).toBe(next);
    expect(runner.phase).toEqual(next);
    expect(runner.phaseIndex).toBe(1);
    expect(runner.isCleared(EMPTY_BOARD)).toBe(false);
    expect(runner.spawnCue(0.5, EMPTY_BOARD)).toBe('none');
    expect(runner.spawnCue(0.5, EMPTY_BOARD)).toBe('none');
    expect(runner.spawnCue(0, EMPTY_BOARD)).toBe('word');
  });

  it('ends the run after the last phase of the plan', () => {
    const runner = runnerOf(WORDS_PHASE);
    expect(runner.advance(EMPTY_PHASE_RECORD)).toBeUndefined();
    expect(runner.summary().phasesCleared).toBe(1);
  });

  it('ends the run early when the plan does not go on after the finished phases', () => {
    const plan = planOf([WORDS_PHASE, WORDS_PHASE], {
      continuesAfter: (finished) => finished.every((record) => record.reached === 0),
    });
    const runner = new PhaseRunner(plan);
    expect(runner.advance(REACHED)).toBeUndefined();
    expect(runner.summary().phases).toEqual([REACHED]);
  });

  it('counts the phases cleared and keeps their records in order', () => {
    const runner = runnerOf(WORDS_PHASE, WORDS_PHASE, BOSS_PHASE);
    const records = [EMPTY_PHASE_RECORD, REACHED, EMPTY_PHASE_RECORD];
    const cleared = records.map((record) => {
      runner.advance(record);
      return runner.summary().phasesCleared;
    });
    expect(cleared).toEqual([1, 2, 3]);
    expect(runner.summary().phases).toEqual(records);
  });

  it('reports what was cleared and the play time when a run ends early', () => {
    const runner = runnerOf(WORDS_PHASE, WORDS_PHASE, BOSS_PHASE);
    runner.advance(REACHED);
    runner.countRunTime(4.5);
    expect(runner.summary()).toEqual({ phasesCleared: 1, phases: [REACHED], seconds: 4.5 });
  });
});

describe('PhaseRunner clocks', () => {
  it('ends a timed phase when its time is up', () => {
    const runner = runnerOf({ ...WORDS_PHASE, seconds: 2 });
    expect(runner.countPhaseTime(1)).toBe('progressed');
    expect(runner.countPhaseTime(1)).toBe('expired');
  });

  it('reports the phase clock only on a new tenth of a second', () => {
    const runner = runnerOf({ ...WORDS_PHASE, seconds: 2 });
    expect(runner.countPhaseTime(0.04)).toBe('unchanged');
    expect(runner.countPhaseTime(0.07)).toBe('progressed');
  });

  it('ignores the phase clock of a phase without a time limit', () => {
    expect(runnerOf(WORDS_PHASE).countPhaseTime(100)).toBe('unchanged');
  });

  it('leaves the progress of a timed run to the run clock', () => {
    const runner = new PhaseRunner(planOf([{ ...WORDS_PHASE, seconds: 2 }], { seconds: 60 }));
    expect(runner.countPhaseTime(1)).toBe('unchanged');
    expect(runner.countPhaseTime(1)).toBe('expired');
  });

  it('ends a timed run when its time is up', () => {
    const runner = new PhaseRunner(planOf([WORDS_PHASE], { seconds: 3 }));
    expect(runner.countRunTime(1)).toBe('progressed');
    expect(runner.countRunTime(1)).toBe('progressed');
    expect(runner.countRunTime(1)).toBe('expired');
    expect(runner.summary().seconds).toBe(3);
  });

  it('counts the play time of a run without a time limit', () => {
    const runner = runnerOf(WORDS_PHASE);
    expect(runner.countRunTime(1.5)).toBe('unchanged');
    expect(runner.summary().seconds).toBe(1.5);
  });
});

describe('PhaseRunner progress', () => {
  it('counts a spawn as done once it has left the board', () => {
    const runner = runnerOf(WORDS_PHASE);
    spawn(runner, 2);
    expect(runner.progress({ pendingSpawns: 1, bossHealth: NO_BOSS })).toEqual({
      kind: 'words',
      done: 1,
      total: COUNT,
      timed: false,
      wave: undefined,
      stage: undefined,
    });
  });

  it('keeps the spawns done between zero and the count', () => {
    const runner = runnerOf(WORDS_PHASE);
    expect(runner.progress({ pendingSpawns: 1, bossHealth: NO_BOSS }).done).toBe(0);
  });

  it('shows the words the boss has taken', () => {
    const runner = runnerOf(BOSS_PHASE);
    expect(runner.progress({ pendingSpawns: 0, bossHealth: 0.6 })).toMatchObject({
      kind: 'boss',
      done: 2,
      total: BOSS_WORDS,
    });
  });

  it('shows the time spent in a timed phase in tenths of a second', () => {
    const runner = runnerOf({ ...WORDS_PHASE, seconds: 10 });
    runner.countPhaseTime(2.345);
    expect(runner.progress({ pendingSpawns: 0, bossHealth: NO_BOSS })).toMatchObject({
      done: 2.3,
      total: 10,
      timed: true,
    });
  });

  it('shows the run clock over the phase clock in a timed run', () => {
    const runner = new PhaseRunner(planOf([{ ...WORDS_PHASE, seconds: 10 }], { seconds: 60 }));
    runner.countPhaseTime(2);
    runner.countRunTime(5);
    expect(runner.progress({ pendingSpawns: 0, bossHealth: NO_BOSS })).toMatchObject({
      done: 5,
      total: 60,
      timed: true,
    });
  });

  it('passes on the wave and the stage of the phase', () => {
    const stage = { number: 2, count: 4, regionId: 'las' };
    const runner = runnerOf({ ...WORDS_PHASE, wave: 3, stage });
    expect(runner.progress({ pendingSpawns: 0, bossHealth: NO_BOSS })).toMatchObject({
      wave: 3,
      stage,
    });
  });
});
