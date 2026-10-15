import * as THREE from 'three';
import type { PetModel } from '../../cosmetics/pets';

const SHOULDER_OFFSET = new THREE.Vector3(0.95, 1.5, -0.3);
const FOLLOW_SHARPNESS = 3.5;
const TURN_SHARPNESS = 5;
const BOB = { speed: 2.3, height: 0.12 };
const POUNCE = { duration: 0.35, scale: 0.35 };
const FULL_TURN = Math.PI * 2;

export class PetFollower {
  readonly object = new THREE.Group();
  private readonly anchor = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private pounce = 0;

  constructor(
    private readonly pet: PetModel,
    private readonly hero: THREE.Object3D,
  ) {
    this.object.add(pet.object);
    this.anchor.copy(this.restingPoint());
    this.object.position.copy(this.anchor);
    this.object.rotation.y = hero.rotation.y;
  }

  get position(): THREE.Vector3 {
    return this.pet.object.getWorldPosition(new THREE.Vector3());
  }

  update(delta: number, elapsed: number): void {
    const follow = 1 - Math.exp(-FOLLOW_SHARPNESS * delta);
    this.anchor.lerp(this.restingPoint(), follow);
    this.object.position.copy(this.anchor);
    this.object.position.y += Math.sin(elapsed * BOB.speed) * BOB.height;
    this.turnTowardHeading(delta);
    this.settlePounce(delta);
    this.pet.animate(elapsed);
  }

  pounceAt(point: THREE.Vector3): void {
    this.pounce = POUNCE.duration;
    this.object.rotation.y = Math.atan2(
      point.x - this.object.position.x,
      point.z - this.object.position.z,
    );
  }

  private restingPoint(): THREE.Vector3 {
    return this.target
      .copy(SHOULDER_OFFSET)
      .applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.hero.rotation.y)
      .add(this.hero.position);
  }

  private turnTowardHeading(delta: number): void {
    const step = 1 - Math.exp(-TURN_SHARPNESS * delta);
    const turn = THREE.MathUtils.euclideanModulo(
      this.hero.rotation.y - this.object.rotation.y + Math.PI,
      FULL_TURN,
    );
    this.object.rotation.y += (turn - Math.PI) * step;
  }

  private settlePounce(delta: number): void {
    this.pounce = Math.max(0, this.pounce - delta);
    const swell = 1 + (this.pounce / POUNCE.duration) * POUNCE.scale;
    this.pet.object.scale.setScalar(swell);
  }
}
