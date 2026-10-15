import * as THREE from 'three';
import { disposeObject } from '../../../disposal';
import type { Enemy } from '../../../Enemy';
import type { MechanicContext } from '../../Mechanic';
import { isPowerEnemy } from '../PowerEnemy';

export interface Spell {
  cast(): void;
  update(delta: number): void;
  dispose(): void;
}

export type SpellContext = Pick<
  MechanicContext,
  | 'enemies'
  | 'scene'
  | 'particles'
  | 'player'
  | 'stats'
  | 'sfx'
  | 'shields'
  | 'removeEnemy'
  | 'shakeCamera'
  | 'absorbNextHit'
>;

export abstract class SceneSpell implements Spell {
  protected readonly root = new THREE.Group();

  constructor(protected readonly context: SpellContext) {
    context.scene.add(this.root);
  }

  abstract cast(): void;

  abstract update(delta: number): void;

  dispose(): void {
    this.root.removeFromParent();
    disposeObject(this.root);
  }

  protected get bystanders(): Enemy[] {
    return this.context.enemies.filter((enemy) => !isPowerEnemy(enemy));
  }

  protected get heroPosition(): THREE.Vector3 {
    return this.context.player.object.position;
  }

  protected isOnBoard(enemy: Enemy): boolean {
    return this.context.enemies.includes(enemy);
  }
}
