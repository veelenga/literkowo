import * as THREE from 'three';
import { noiseTexture } from './noiseTexture';
import { NOISE_GLSL } from './shaders';
import type { Animated } from './types';

export interface WaterSpec {
  level: number;
  shallow: number;
  deep: number;
  rim: number;
  foam: number;
  glint: number;
  depthRange: number;
  amplitude: number;
  lightDirection: THREE.Vector3;
  region: { minX: number; maxX: number; minZ: number; maxZ: number };
  cell: number;
  detailed: boolean;
}

export type DepthSampler = (x: number, z: number) => number;

const DEPTH_SAMPLE_OFFSETS = [-0.6, 0, 0.6];
const GLINT_DIRECTION = new THREE.Vector3(-0.15, 0.85, -0.5).normalize();

const VERTEX = `
#include <common>
#include <fog_pars_vertex>
uniform float uTime;
uniform float uAmplitude;
attribute float aDepth;
varying float vDepth;
varying vec3 vWorld;

void main() {
  vec3 p = position;
  float wave = sin(p.x * 0.45 + uTime * 1.1) * 0.55
    + sin(p.z * 0.62 - uTime * 0.9) * 0.45
    + sin((p.x + p.z) * 0.95 + uTime * 1.7) * 0.25;
  p.y += wave * uAmplitude * smoothstep(-0.1, 0.8, aDepth);
  vDepth = aDepth;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAGMENT = `
#include <common>
#include <fog_pars_fragment>
uniform float uTime;
uniform float uDepthRange;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uRim;
uniform vec3 uFoam;
uniform vec3 uGlint;
uniform vec3 uGlintDirection;
uniform vec3 uLightDirection;
varying float vDepth;
varying vec3 vWorld;
${NOISE_GLSL}

void main() {
  vec3 normal = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (normal.y < 0.0) normal = -normal;
  vec3 view = normalize(cameraPosition - vWorld);
  vec3 color = mix(uShallow, uDeep, smoothstep(0.0, uDepthRange, vDepth));
  color *= 0.72 + 0.4 * max(dot(normal, uLightDirection), 0.0);
  float fresnel = pow(1.0 - max(dot(normal, view), 0.0), 4.0);
  color = mix(color, uRim, clamp(fresnel * 1.2, 0.0, 0.35));
  float lap = 0.16 + 0.07 * sin(uTime * 1.6 + vWorld.x * 0.7 + vWorld.z * 0.5);
  float edge = 1.0 - smoothstep(0.0, lap, vDepth);
#ifdef WATER_DETAIL
  vec3 halfway = normalize(uGlintDirection + view);
  float glint = pow(max(dot(normal, halfway), 0.0), 220.0);
  color += uGlint * glint * 4.0;
  float froth = kitNoise(vWorld.xz * 2.4 + vec2(uTime * 0.35, -uTime * 0.25));
  float foam = edge * step(0.3, froth + edge * 0.45);
#else
  float foam = step(0.55, edge);
#endif
  color = mix(color, uFoam, foam * 0.9);
  gl_FragColor = vec4(color, 1.0);
  #include <fog_fragment>
}
`;

export class Water implements Animated {
  readonly mesh: THREE.Mesh;
  private readonly time = { value: 0 };

  constructor(spec: WaterSpec, depthAt: DepthSampler) {
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      defines: spec.detailed ? { WATER_DETAIL: '' } : {},
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uDepthRange: { value: spec.depthRange },
          uAmplitude: { value: spec.amplitude },
          uShallow: { value: new THREE.Color(spec.shallow) },
          uDeep: { value: new THREE.Color(spec.deep) },
          uRim: { value: new THREE.Color(spec.rim) },
          uFoam: { value: new THREE.Color(spec.foam) },
          uGlint: { value: new THREE.Color(spec.glint) },
          uGlintDirection: { value: GLINT_DIRECTION },
          uLightDirection: { value: spec.lightDirection.clone().normalize() },
        },
      ]),
    });
    material.uniforms.uTime = this.time;
    material.uniforms.uKitNoise = { value: noiseTexture() };
    this.mesh = new THREE.Mesh(this.buildGeometry(spec, depthAt), material);
    this.mesh.position.y = spec.level;
  }

  update(_delta: number, elapsed: number): void {
    this.time.value = elapsed;
  }

  private buildGeometry(spec: WaterSpec, depthAt: DepthSampler): THREE.BufferGeometry {
    const { region } = spec;
    const width = region.maxX - region.minX;
    const depth = region.maxZ - region.minZ;
    const geometry = new THREE.PlaneGeometry(
      width,
      depth,
      Math.ceil(width / spec.cell),
      Math.ceil(depth / spec.cell),
    );
    geometry.rotateX(-Math.PI / 2);
    geometry.translate((region.minX + region.maxX) / 2, 0, (region.minZ + region.maxZ) / 2);
    const position = geometry.getAttribute('position');
    const depths = new Float32Array(position.count);
    for (let i = 0; i < position.count; i += 1) {
      depths[i] = this.smoothDepth(depthAt, position.getX(i), position.getZ(i));
    }
    geometry.setAttribute('aDepth', new THREE.BufferAttribute(depths, 1));
    return geometry;
  }

  private smoothDepth(depthAt: DepthSampler, x: number, z: number): number {
    let sum = 0;
    for (const dx of DEPTH_SAMPLE_OFFSETS) {
      for (const dz of DEPTH_SAMPLE_OFFSETS) sum += depthAt(x + dx, z + dz);
    }
    return sum / DEPTH_SAMPLE_OFFSETS.length ** 2;
  }
}
