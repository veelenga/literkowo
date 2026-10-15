import * as THREE from 'three';
import { merge } from './geometry';
import type { Spot } from './scatter';
import type { Animated } from './types';

export interface ShaftSpec {
  color: number;
  opacity: number;
  length: number;
  radius: number;
  direction: THREE.Vector3;
}

const SHAFT_SEGMENTS = 8;
const UP = new THREE.Vector3(0, 1, 0);

const VERTEX = `
attribute float aPhase;
varying float vAlong;
varying float vPhase;
varying float vFacing;
void main() {
  vAlong = uv.y;
  vPhase = aPhase;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec3 normalWorld = normalize(mat3(modelMatrix) * normal);
  vFacing = abs(dot(normalWorld, normalize(cameraPosition - world.xyz)));
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAGMENT = `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;
varying float vAlong;
varying float vPhase;
varying float vFacing;
void main() {
  float body = smoothstep(0.0, 0.06, vAlong) * (1.0 - smoothstep(0.3, 0.9, vAlong));
  float pulse = 0.7 + 0.3 * sin(uTime * 0.45 + vPhase);
  float alpha = body * pow(vFacing, 2.0) * pulse * uOpacity;
  gl_FragColor = vec4(uColor * alpha, 1.0);
}
`;

export class LightShafts implements Animated {
  readonly mesh: THREE.Mesh;
  private readonly time = { value: 0 };

  constructor(spec: ShaftSpec, feet: Array<Spot & { y: number }>) {
    const tilt = new THREE.Quaternion().setFromUnitVectors(UP, spec.direction.clone().normalize());
    const parts = feet.map((foot, index) => {
      const shaft = new THREE.CylinderGeometry(
        spec.radius * 1.4,
        spec.radius,
        spec.length,
        SHAFT_SEGMENTS,
        1,
        true,
      );
      shaft.translate(0, spec.length / 2, 0);
      shaft.applyQuaternion(tilt);
      shaft.translate(foot.x, foot.y, foot.z);
      const phases = new Float32Array(shaft.getAttribute('position').count).fill(index * 1.7);
      shaft.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
      return shaft;
    });
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: this.time,
        uOpacity: { value: spec.opacity },
        uColor: { value: new THREE.Color(spec.color) },
      },
    });
    this.mesh = new THREE.Mesh(merge(parts), material);
    this.mesh.renderOrder = 2;
  }

  update(_delta: number, elapsed: number): void {
    this.time.value = elapsed;
  }
}
