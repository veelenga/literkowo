import { MAX_ENEMIES } from './board';
import type { PhaseRecord } from './PhaseMeter';
import { tempoAt, type PhaseKind, type RunPhase, type RunPlan, type StageMark } from './RunPlan';

const FIRST_PHASE = 0;
const NO_CALM = 0;
const NONE_DONE = 0;
const PROGRESS_STEPS_PER_SECOND = 10;

export type SpawnCue = 'none' | 'boss' | 'word';

export type ClockTick = 'unchanged' | 'progressed' | 'expired';

export interface Progress {
  kind: PhaseKind;
  done: number;
  total: number;
  timed: boolean;
  wave?: number;
  stage?: StageMark;
}

export interface BoardProgress {
  readonly pendingSpawns: number;
  readonly bossHealth: number | undefined;
}

export interface PhaseSummary {
  readonly phasesCleared: number;
  readonly phases: readonly PhaseRecord[];
  readonly seconds: number;
}

interface ProgressClock {
  readonly limit: number;
  readonly spent: number;
}

export class PhaseRunner {
  private planned: RunPhase;
  private current: RunPhase;
  private index = FIRST_PHASE;
  private spawned = 0;
  private calm: number;
  private sinceSpawn = Number.POSITIVE_INFINITY;
  private phaseSeconds = 0;
  private runSeconds = 0;
  private readonly records: PhaseRecord[] = [];

  constructor(private readonly plan: RunPlan) {
    this.planned = firstPhase(plan);
    this.current = this.planned;
    this.calm = calmOf(this.planned);
  }

  get phase(): RunPhase {
    return this.current;
  }

  get phaseIndex(): number {
    return this.index;
  }

  spawnCue(delta: number, boardCount: number): SpawnCue {
    if (this.restsInCalm(delta)) return 'none';
    if (this.current.kind === 'boss') return 'boss';
    this.sinceSpawn += delta;
    return this.isSpawnDue(boardCount) ? 'word' : 'none';
  }

  spawnNext(spawn: (order: number) => void): void {
    const order = this.spawned;
    this.sinceSpawn = 0;
    this.spawned += 1;
    spawn(order);
    this.retime();
  }

  refillBoard(): void {
    if (this.current.boardSize === undefined) return;
    this.sinceSpawn = Math.max(this.sinceSpawn, this.current.spawnInterval);
  }

  isCleared(boardCount: number): boolean {
    if (this.current.kind === 'boss' || this.current.seconds !== undefined) return false;
    return this.spawned >= this.current.count && boardCount === 0;
  }

  countPhaseTime(delta: number): ClockTick {
    const limit = this.current.seconds;
    if (limit === undefined) return 'unchanged';
    const step = progressStep(this.phaseSeconds);
    this.phaseSeconds += delta;
    if (this.phaseSeconds >= limit) return 'expired';
    if (this.isTimedRun) return 'unchanged';
    return progressStep(this.phaseSeconds) === step ? 'unchanged' : 'progressed';
  }

  countRunTime(delta: number): ClockTick {
    const step = progressStep(this.runSeconds);
    this.runSeconds += delta;
    const limit = this.plan.seconds;
    if (limit === undefined) return 'unchanged';
    if (this.runSeconds >= limit) return 'expired';
    return progressStep(this.runSeconds) === step ? 'unchanged' : 'progressed';
  }

  advance(record: PhaseRecord): RunPhase | undefined {
    this.records.push(record);
    this.index += 1;
    this.spawned = 0;
    this.phaseSeconds = 0;
    this.sinceSpawn = Number.POSITIVE_INFINITY;
    const next = this.nextPhase();
    if (!next) return undefined;
    this.planned = next;
    this.retime();
    this.calm = calmOf(next);
    return next;
  }

  progress(board: BoardProgress): Progress {
    const { kind, wave, stage } = this.current;
    const clock = this.progressClock();
    if (clock) {
      const done = Math.min(clock.limit, progressStep(clock.spent) / PROGRESS_STEPS_PER_SECOND);
      return { kind, done, total: clock.limit, timed: true, wave, stage };
    }
    const total = this.current.count;
    return { kind, done: this.spawnsDone(board, total), total, timed: false, wave, stage };
  }

  summary(): PhaseSummary {
    return { phasesCleared: this.index, phases: [...this.records], seconds: this.runSeconds };
  }

  private get isTimedRun(): boolean {
    return this.plan.seconds !== undefined;
  }

  private restsInCalm(delta: number): boolean {
    if (this.calm <= 0) return false;
    this.calm -= delta;
    return true;
  }

  private isSpawnDue(boardCount: number): boolean {
    return (
      this.spawned < this.current.count &&
      this.sinceSpawn >= this.current.spawnInterval &&
      boardCount < Math.min(MAX_ENEMIES, this.current.boardSize ?? MAX_ENEMIES)
    );
  }

  private retime(): void {
    this.current = { ...this.planned, ...tempoAt(this.planned, this.spawned) };
  }

  private nextPhase(): RunPhase | undefined {
    const goesOn = this.plan.continuesAfter?.(this.records) ?? true;
    return goesOn ? this.plan.phaseAt(this.index) : undefined;
  }

  private progressClock(): ProgressClock | undefined {
    const runLimit = this.plan.seconds;
    if (runLimit !== undefined) return { limit: runLimit, spent: this.runSeconds };
    const phaseLimit = this.current.seconds;
    if (phaseLimit === undefined) return undefined;
    return { limit: phaseLimit, spent: this.phaseSeconds };
  }

  private spawnsDone({ bossHealth, pendingSpawns }: BoardProgress, total: number): number {
    if (bossHealth !== undefined) return total - Math.round(bossHealth * total);
    return Math.max(NONE_DONE, Math.min(total, this.spawned - pendingSpawns));
  }
}

function firstPhase(plan: RunPlan): RunPhase {
  const phase = plan.phaseAt(FIRST_PHASE);
  if (!phase) throw new Error('A run plan needs at least one phase');
  return phase;
}

function calmOf(phase: RunPhase): number {
  return phase.calmSeconds ?? NO_CALM;
}

function progressStep(seconds: number): number {
  return Math.floor(seconds * PROGRESS_STEPS_PER_SECOND);
}
