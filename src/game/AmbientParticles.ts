import * as THREE from 'three';
import type { Rng } from './environment/random';
import type { Region } from './environment/scatter';
import { glowSprite } from './environment/sprites';

export type AmbientMotion = 'drift' | 'fall' | 'rise' | 'blink' | 'twinkle';

export interface AmbientSpec {
  count: number;
  colors: number[];
  size: number;
  glow: number;
  motion: AmbientMotion;
  height: [min: number, max: number];
  opacity?: number;
  additive?: boolean;
  speed?: number;
  region?: Region;
}

export type SpawnSurface = (x: number, z: number) => number | undefined;

const DEFAULT_REGION: Region = { minX: -25, maxX: 25, minZ: -21, maxZ: 12 };
const MAX_SPAWN_TRIES = 30;
const HALF = 0.5;

const VERTEX = `
uniform float uTime;
uniform float uSize;
uniform float uScale;
uniform float uSpeed;
uniform vec2 uHeight;
attribute float aSeed;
attribute vec3 tint;
varying vec3 vTint;
varying float vAlpha;

void main() {
  vec3 p = position;
  float phase = aSeed * 6.2831;
  float alpha = 1.0;
  float span = uHeight.y - uHeight.x;
#if defined(MOTION_FALL)
  p.y = uHeight.x + mod(position.y - uHeight.x - uTime * uSpeed * (0.7 + 0.6 * aSeed), span);
  p.x += sin(uTime * 0.7 + phase + p.y * 0.5) * 0.7;
  p.z += cos(uTime * 0.5 + phase) * 0.4;
  alpha = smoothstep(uHeight.x, uHeight.x + 0.8, p.y);
#elif defined(MOTION_RISE)
  p.y = uHeight.x + mod(position.y - uHeight.x + uTime * uSpeed * (0.5 + 0.8 * aSeed), span);
  p.x += sin(uTime * 0.6 + phase + p.y) * 0.5;
  p.z += cos(uTime * 0.4 + phase * 1.3) * 0.5;
  alpha = smoothstep(uHeight.x, uHeight.x + 1.0, p.y) * (1.0 - smoothstep(uHeight.y - 1.5, uHeight.y, p.y));
#elif defined(MOTION_BLINK)
  p += vec3(
    sin(uTime * 0.37 * uSpeed + phase) * 2.0 + sin(uTime * 1.3 + phase * 2.0) * 0.3,
    sin(uTime * 0.71 * uSpeed + phase * 1.3) * 0.6,
    cos(uTime * 0.31 * uSpeed + phase * 1.9) * 2.0);
  alpha = smoothstep(0.25, 0.9, sin(uTime * (0.7 + aSeed) + phase) * 0.5 + 0.5);
#elif defined(MOTION_TWINKLE)
  float cycle = fract(uTime * uSpeed * (0.25 + 0.35 * aSeed) + aSeed * 7.0);
  alpha = smoothstep(0.0, 0.08, cycle) * (1.0 - smoothstep(0.08, 0.22, cycle));
#else
  p += vec3(
    sin(uTime * 0.31 * uSpeed + phase) * 1.5,
    sin(uTime * 0.53 * uSpeed + phase * 1.7) * 0.45,
    cos(uTime * 0.27 * uSpeed + phase * 1.3) * 1.5);
#endif
  vec4 view = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * uScale * (0.6 + 0.8 * aSeed) / -view.z;
  gl_Position = projectionMatrix * view;
  vTint = tint;
  vAlpha = alpha;
}
`;

const FRAGMENT = `
uniform sampler2D uMap;
uniform float uGlow;
uniform float uOpacity;
varying vec3 vTint;
varying float vAlpha;

void main() {
  float alpha = texture2D(uMap, gl_PointCoord).a * vAlpha * uOpacity;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(vTint * uGlow, alpha);
}
`;

export class AmbientParticles {
  readonly points: THREE.Points;
  private readonly time = { value: 0 };

  constructor(spec: AmbientSpec, rng: Rng, surface?: SpawnSurface) {
    const geometry = this.buildGeometry(spec, rng, surface);
    const scale = { value: 1 };
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      defines: { [`MOTION_${spec.motion.toUpperCase()}`]: '' },
      transparent: true,
      depthWrite: false,
      blending: spec.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        uTime: this.time,
        uScale: scale,
        uSize: { value: spec.size },
        uSpeed: { value: spec.speed ?? 1 },
        uHeight: { value: new THREE.Vector2(spec.height[0], spec.height[1]) },
        uGlow: { value: spec.glow },
        uOpacity: { value: spec.opacity ?? 1 },
        uMap: { value: glowSprite() },
      },
    });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    const buffer = new THREE.Vector2();
    this.points.onBeforeRender = (renderer) => {
      scale.value = renderer.getDrawingBufferSize(buffer).y * HALF;
    };
  }

  update(_delta: number, elapsed: number): void {
    this.time.value = elapsed;
  }

  private buildGeometry(spec: AmbientSpec, rng: Rng, surface?: SpawnSurface): THREE.BufferGeometry {
    const region = spec.region ?? DEFAULT_REGION;
    const positions: number[] = [];
    const seeds: number[] = [];
    const tints: number[] = [];
    const palette = spec.colors.map((hex) => new THREE.Color(hex));
    for (let i = 0; i < spec.count; i += 1) {
      const spot = this.spawn(spec, region, rng, surface);
      if (!spot) continue;
      positions.push(spot.x, spot.y, spot.z);
      seeds.push(rng.next());
      const tint = rng.pick(palette);
      tints.push(tint.r, tint.g, tint.b);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
    geometry.setAttribute('tint', new THREE.Float32BufferAttribute(tints, 3));
    return geometry;
  }

  private spawn(
    spec: AmbientSpec,
    region: Region,
    rng: Rng,
    surface?: SpawnSurface,
  ): THREE.Vector3 | undefined {
    for (let attempt = 0; attempt < MAX_SPAWN_TRIES; attempt += 1) {
      const x = rng.range(region.minX, region.maxX);
      const z = rng.range(region.minZ, region.maxZ);
      const ground = surface ? surface(x, z) : 0;
      if (ground === undefined) continue;
      return new THREE.Vector3(x, ground + rng.range(spec.height[0], spec.height[1]), z);
    }
    return undefined;
  }
}
