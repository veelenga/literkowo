import * as THREE from 'three';
import { disposeObject } from '../../disposal';

export interface Landing {
  readonly position: THREE.Vector3;
  readonly color: THREE.Color;
}

const GRAVITY = 9;
const LAUNCH = { up: 1.4, outward: 0.8 };
const SPIN = { min: 4, max: 9 };
const GROUND_HEIGHT = 0.25;

interface Tumble {
  readonly body: THREE.Object3D;
  readonly color: THREE.Color;
  readonly velocity: THREE.Vector3;
  readonly spin: THREE.Vector3;
}

export class Tumbles {
  readonly group = new THREE.Group();
  private tumbles: Tumble[] = [];

  add(body: THREE.Object3D, color: THREE.Color): void {
    this.group.attach(body);
    const outward = new THREE.Vector3(body.position.x, 0, body.position.z).normalize();
    this.tumbles.push({
      body,
      color,
      velocity: outward.multiplyScalar(LAUNCH.outward).setY(LAUNCH.up),
      spin: new THREE.Vector3(randomSpin(), randomSpin(), randomSpin()),
    });
  }

  update(delta: number): Landing[] {
    this.tumbles.forEach((tumble) => fall(tumble, delta));
    const landed = this.tumbles.filter((tumble) => tumble.body.position.y <= GROUND_HEIGHT);
    this.tumbles = this.tumbles.filter((tumble) => !landed.includes(tumble));
    return landed.map((tumble) => crash(tumble));
  }

  dispose(): void {
    this.tumbles.forEach((tumble) => disposeObject(tumble.body));
    this.tumbles = [];
    this.group.clear();
  }
}

function fall(tumble: Tumble, delta: number): void {
  tumble.velocity.y -= GRAVITY * delta;
  tumble.body.position.addScaledVector(tumble.velocity, delta);
  tumble.body.rotation.x += tumble.spin.x * delta;
  tumble.body.rotation.y += tumble.spin.y * delta;
  tumble.body.rotation.z += tumble.spin.z * delta;
}

function crash(tumble: Tumble): Landing {
  const position = tumble.body.position.clone().setY(GROUND_HEIGHT);
  tumble.body.removeFromParent();
  disposeObject(tumble.body);
  return { position, color: tumble.color };
}

function randomSpin(): number {
  return THREE.MathUtils.randFloat(SPIN.min, SPIN.max);
}
