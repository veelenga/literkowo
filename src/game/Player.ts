import * as THREE from 'three';

const FUR = 0xf08a3c;
const CREAM = 0xfff0dc;
const DARK = 0x2b2117;
const BOB_SPEED = 3;
const BOB_HEIGHT = 0.06;

export class Player {
  readonly object = new THREE.Group();
  private readonly body: THREE.Group;

  constructor() {
    this.body = this.buildFox();
    this.object.add(this.body);
    this.object.position.y = 0.05;
  }

  update(elapsed: number): void {
    this.body.position.y = Math.sin(elapsed * BOB_SPEED) * BOB_HEIGHT;
  }

  lookAt(target: THREE.Vector3): void {
    const angle = Math.atan2(target.x - this.object.position.x, target.z - this.object.position.z);
    this.object.rotation.y = angle;
  }

  private buildFox(): THREE.Group {
    const fox = new THREE.Group();
    const fur = new THREE.MeshStandardMaterial({ color: FUR, flatShading: true });
    const cream = new THREE.MeshStandardMaterial({ color: CREAM, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: DARK, flatShading: true });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 1.1), fur);
    body.position.y = 0.55;
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), cream);
    chest.position.set(0, 0.45, 0.45);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.6), fur);
    head.position.set(0, 1.05, 0.55);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.3), cream);
    snout.position.set(0, 0.95, 0.95);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.1), dark);
    nose.position.set(0, 1.0, 1.1);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.9, 6), fur);
    tail.rotation.x = Math.PI / 2.4;
    tail.position.set(0, 0.75, -0.85);
    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 6), cream);
    tailTip.rotation.x = Math.PI / 2.4;
    tailTip.position.set(0, 0.93, -1.25);

    const parts: THREE.Mesh[] = [body, chest, head, snout, nose, tail, tailTip];
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.35, 4), fur);
      ear.position.set(side * 0.2, 1.45, 0.5);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), dark);
      eye.position.set(side * 0.17, 1.12, 0.86);
      for (const front of [-0.35, 0.35]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.18), dark);
        leg.position.set(side * 0.22, 0.2, front);
        parts.push(leg);
      }
      parts.push(ear, eye);
    }
    parts.forEach((part) => {
      part.castShadow = true;
      fox.add(part);
    });
    return fox;
  }
}
