import * as THREE from 'three';
import { withLuminance } from '../../../effects/luminance';

const RADIUS = 1.45;
const CENTER_HEIGHT = 1;
const SHELL_SEGMENTS = { width: 32, height: 16 };
const WIRE_DETAIL = 1;
const WIRE_SCALE = 1.03;
const SHELL_OPACITY = 0.16;
const WIRE_OPACITY = 0.5;
const WIRE_LUMINANCE = 1.6;
const SPIN = 0.5;
const PULSE = { speed: 3, amount: 0.04 };
const PRESENCE_RATE = 9;
const HIDDEN_PRESENCE = 0.01;

export class ShieldBubble {
  readonly group = new THREE.Group();
  private readonly wire: THREE.Mesh;
  private raised = false;
  private presence = 0;
  private time = 0;

  constructor(color: THREE.Color) {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS, SHELL_SEGMENTS.width, SHELL_SEGMENTS.height),
      glowMaterial(color, SHELL_OPACITY, false),
    );
    this.wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(RADIUS * WIRE_SCALE, WIRE_DETAIL),
      glowMaterial(withLuminance(color.clone(), WIRE_LUMINANCE), WIRE_OPACITY, true),
    );
    this.group.add(shell, this.wire);
    this.group.visible = false;
  }

  get isRaised(): boolean {
    return this.raised;
  }

  raise(): void {
    this.raised = true;
  }

  lower(): void {
    this.raised = false;
  }

  update(delta: number, anchor: THREE.Vector3): void {
    this.time += delta;
    this.presence = THREE.MathUtils.damp(this.presence, this.raised ? 1 : 0, PRESENCE_RATE, delta);
    this.group.visible = this.presence > HIDDEN_PRESENCE;
    if (!this.group.visible) return;
    this.group.position.set(anchor.x, anchor.y + CENTER_HEIGHT, anchor.z);
    const pulse = 1 + Math.sin(this.time * PULSE.speed) * PULSE.amount;
    this.group.scale.setScalar(this.presence * pulse);
    this.wire.rotation.y += SPIN * delta;
  }
}

function glowMaterial(color: THREE.Color, opacity: number, wireframe: boolean): THREE.Material {
  return new THREE.MeshBasicMaterial({
    color,
    opacity,
    wireframe,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}
