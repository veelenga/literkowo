import * as THREE from 'three';

const CRYSTAL_COLORS = [0x9b5de5, 0xf15bb5, 0x00bbf9, 0x00f5d4];
const HOVER_HEIGHT = 1.1;
const BOB_SPEED = 2.5;
const BOB_HEIGHT = 0.15;
const SPIN_SPEED = 1.2;
const TARGET_EMISSIVE = 1.2;
const IDLE_EMISSIVE = 0.35;

export class Enemy {
  readonly object = new THREE.Group();
  typed = 0;
  private readonly crystal: THREE.Mesh<THREE.OctahedronGeometry, THREE.MeshStandardMaterial>;
  private readonly phase = Math.random() * Math.PI * 2;

  constructor(
    readonly word: string,
    readonly label: HTMLElement,
    private readonly speed: number,
  ) {
    const color = CRYSTAL_COLORS[Math.floor(Math.random() * CRYSTAL_COLORS.length)];
    this.crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: IDLE_EMISSIVE,
        flatShading: true,
      }),
    );
    this.crystal.castShadow = true;
    this.crystal.position.y = HOVER_HEIGHT;
    this.object.add(this.crystal);
    this.renderLabel();
  }

  get color(): THREE.Color {
    return this.crystal.material.color;
  }

  get isComplete(): boolean {
    return this.typed >= this.word.length;
  }

  get expectedChar(): string {
    return this.word[this.typed];
  }

  get distanceToCenter(): number {
    return Math.hypot(this.object.position.x, this.object.position.z);
  }

  update(delta: number, elapsed: number): void {
    const step = this.speed * delta;
    const direction = this.object.position.clone().setY(0).normalize();
    this.object.position.addScaledVector(direction, -step);
    this.crystal.position.y =
      HOVER_HEIGHT + Math.sin(elapsed * BOB_SPEED + this.phase) * BOB_HEIGHT;
    this.crystal.rotation.y += SPIN_SPEED * delta;
  }

  setTargeted(targeted: boolean): void {
    this.crystal.material.emissiveIntensity = targeted ? TARGET_EMISSIVE : IDLE_EMISSIVE;
    this.label.classList.toggle('is-target', targeted);
  }

  advance(): void {
    this.typed += 1;
    this.renderLabel();
  }

  flashMistake(): void {
    this.label.classList.remove('is-mistake');
    void this.label.offsetWidth;
    this.label.classList.add('is-mistake');
  }

  dispose(): void {
    this.label.remove();
    this.crystal.geometry.dispose();
    this.crystal.material.dispose();
  }

  private renderLabel(): void {
    const done = this.word.slice(0, this.typed);
    const rest = this.word.slice(this.typed);
    this.label.innerHTML = `<span class="done">${done}</span><span class="rest">${rest}</span>`;
  }
}
