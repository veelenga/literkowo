import type { Level } from '../course/catalog';
import type { GameResult } from '../game/Game';
import type { RunPlan } from '../game/RunPlan';

export interface GameRun {
  readonly level: Level;
  readonly plan: RunPlan;
  readonly rotateHint: boolean;
  readonly onFinished: (result: GameResult) => void;
  readonly restart: () => void;
}
