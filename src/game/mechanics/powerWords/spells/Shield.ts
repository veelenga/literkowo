import * as THREE from 'three';
import { ShieldBubble } from '../effects/ShieldBubble';
import { powerColor } from '../powers';
import { SceneSpell, type SpellContext } from './Spell';

const POP_HEIGHT = 1;

export class ShieldSpell extends SceneSpell {
  private readonly color = powerColor('shield');
  private readonly bubble = new ShieldBubble(this.color);

  constructor(context: SpellContext) {
    super(context);
    this.root.add(this.bubble.group);
  }

  get isBubbleUp(): boolean {
    return this.bubble.isRaised;
  }

  cast(): void {
    this.context.absorbNextHit();
    this.bubble.raise();
  }

  update(delta: number): void {
    if (this.bubble.isRaised && this.context.shields <= 0) this.pop();
    this.bubble.update(delta, this.heroPosition);
  }

  private pop(): void {
    this.bubble.lower();
    const center = new THREE.Vector3(0, POP_HEIGHT, 0).add(this.heroPosition);
    this.context.particles.burst(center, this.color);
  }
}
