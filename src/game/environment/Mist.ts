import * as THREE from 'three';
import { noiseTexture } from './noiseTexture';
import { NOISE_GLSL } from './shaders';
import type { Animated } from './types';

export interface MistSpec {
  color: number;
  opacity: number;
  height: number;
  clearRadius: number;
  scale: number;
  speed: number;
}

const MIST_OUTER_RADIUS = 34;
const MIST_SEGMENTS = 48;
const CLEAR_FADE = 6;

const VERTEX = `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAGMENT = `
uniform float uTime;
uniform float uOpacity;
uniform float uScale;
uniform float uSpeed;
uniform float uClear;
uniform vec3 uColor;
varying vec3 vWorld;
${NOISE_GLSL}
void main() {
  vec2 drift = vec2(uTime * uSpeed, uTime * uSpeed * 0.4);
  float density = kitFbm(vWorld.xz * uScale + drift);
  float clear = smoothstep(uClear, uClear + ${CLEAR_FADE.toFixed(1)}, length(vWorld.xz));
  float alpha = smoothstep(0.35, 0.75, density) * clear * uOpacity;
  gl_FragColor = vec4(uColor, alpha);
}
`;

export class Mist implements Animated {
  readonly mesh: THREE.Mesh;
  private readonly time = { value: 0 };

  constructor(spec: MistSpec) {
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: this.time,
        uOpacity: { value: spec.opacity },
        uScale: { value: spec.scale },
        uSpeed: { value: spec.speed },
        uClear: { value: spec.clearRadius },
        uColor: { value: new THREE.Color(spec.color) },
        uKitNoise: { value: noiseTexture() },
      },
    });
    const geometry = new THREE.RingGeometry(spec.clearRadius, MIST_OUTER_RADIUS, MIST_SEGMENTS, 1);
    geometry.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.y = spec.height;
    this.mesh.renderOrder = 1;
  }

  update(_delta: number, elapsed: number): void {
    this.time.value = elapsed;
  }
}
