import type * as THREE from 'three';
import type { Sfx } from '../../audio/Sfx';
import type { Level } from '../../course/regions';
import type { WordSource } from '../../course/WordSource';
import type { Equipped, WordLanguage } from '../../profiles/Profile';
import type { Enemy } from '../Enemy';
import type { Phase } from '../LevelPlan';
import type { Particles } from '../Particles';
import type { Player } from '../Player';
import type { SessionStats } from '../SessionStats';
import type { Theme } from '../themes';

export type AnnounceStyle = 'callout' | 'banner' | 'warning';

export interface Mechanic {
  update?(delta: number, elapsed: number): void;
  onSpawn?(enemy: Enemy): void;
  onHit?(): void;
  onMistake?(): void;
  onWordComplete?(enemy: Enemy): void;
  onEnemyReached?(enemy: Enemy): void;
  onPhaseChange?(phase: Phase): void;
  dispose(): void;
}

export interface MechanicContext {
  readonly enemies: readonly Enemy[];
  readonly player: Pick<Player, 'object' | 'jump' | 'hurt'>;
  readonly scene: THREE.Scene;
  readonly particles: Pick<Particles, 'burst'>;
  readonly stats: SessionStats;
  readonly phase: Phase;
  readonly playing: boolean;
  readonly shields: number;
  readonly theme: Theme;
  readonly sfx: Sfx;
  readonly words: WordSource;
  readonly level: Level;
  readonly language: WordLanguage;
  readonly equipped: Readonly<Equipped>;
  createLabel(): HTMLElement;
  addEnemy(enemy: Enemy, radius?: number): void;
  removeEnemy(enemy: Enemy): void;
  spawnWord(word?: string): Enemy;
  setTimeScale(scale: number): void;
  shakeCamera(strength: number, seconds: number): void;
  announce(text: string, style: AnnounceStyle, accent?: string): void;
  loseLife(): void;
  absorbNextHit(): void;
  addCoins(amount: number): void;
}

export type MechanicType = new (context: MechanicContext) => Mechanic;
