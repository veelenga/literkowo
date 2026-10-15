import * as THREE from 'three';

const PARTICLES_PER_BURST = 26;
const LIFETIME = 0.9;
const GRAVITY = -9;
const SPEED = 6;

interface Burst {
  points: THREE.Points;
  velocities: THREE.Vector3[];
  age: number;
}

export class Particles {
  private readonly bursts: Burst[] = [];

  constructor(private readonly scene: THREE.Scene) {}

  burst(position: THREE.Vector3, color: THREE.Color): void {
    const positions = new Float32Array(PARTICLES_PER_BURST * 3);
    const velocities: THREE.Vector3[] = [];
    for (let i = 0; i < PARTICLES_PER_BURST; i += 1) {
      positions.set([position.x, position.y, position.z], i * 3);
      velocities.push(
        new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5)
          .normalize()
          .multiplyScalar(SPEED * (0.5 + Math.random() * 0.5)),
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color, size: 0.22, transparent: true });
    const points = new THREE.Points(geometry, material);
    this.scene.add(points);
    this.bursts.push({ points, velocities, age: 0 });
  }

  update(delta: number): void {
    for (const burst of [...this.bursts]) {
      burst.age += delta;
      if (burst.age > LIFETIME) {
        this.remove(burst);
        continue;
      }
      this.step(burst, delta);
    }
  }

  private step(burst: Burst, delta: number): void {
    const attribute = burst.points.geometry.attributes.position as THREE.BufferAttribute;
    burst.velocities.forEach((velocity, i) => {
      velocity.y += GRAVITY * delta;
      attribute.setXYZ(
        i,
        attribute.getX(i) + velocity.x * delta,
        attribute.getY(i) + velocity.y * delta,
        attribute.getZ(i) + velocity.z * delta,
      );
    });
    attribute.needsUpdate = true;
    (burst.points.material as THREE.PointsMaterial).opacity = 1 - burst.age / LIFETIME;
  }

  private remove(burst: Burst): void {
    this.scene.remove(burst.points);
    burst.points.geometry.dispose();
    (burst.points.material as THREE.Material).dispose();
    this.bursts.splice(this.bursts.indexOf(burst), 1);
  }
}
