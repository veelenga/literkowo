import * as THREE from 'three';
import { noiseTexture } from './noiseTexture';
import { NOISE_GLSL } from './shaders';

export interface CloudShadowSpec {
  strength: number;
  scale: number;
  speed: number;
}

export interface SurfaceOptions {
  sway?: number;
  roughness?: number;
  metalness?: number;
  doubleSided?: boolean;
}

export interface GlowOptions {
  intensity: number;
  pulse?: number;
  speed?: number;
}

type Uniform<T> = { value: T };

const DEFAULT_ROUGHNESS = 0.82;
const GLOSSY_LIMIT = 0.5;
const CLOUD_DIRECTION = new THREE.Vector2(0.85, 0.4).normalize();
const CLOUD_COVER = [0.5, 0.7] as const;

const SURFACE_VERTEX_PARS = `
#include <common>
uniform float uTime;
uniform float uSway;
varying vec3 vKitWorld;
`;

const SURFACE_SWAY = `
#include <begin_vertex>
vec4 kitAnchor = vec4(0.0, 0.0, 0.0, 1.0);
#ifdef USE_INSTANCING
kitAnchor = instanceMatrix * kitAnchor;
#endif
kitAnchor = modelMatrix * kitAnchor;
float kitWave = sin(uTime * 1.7 + kitAnchor.x * 0.37 + kitAnchor.z * 0.21) * 0.7
  + sin(uTime * 2.9 + kitAnchor.z * 0.53) * 0.3;
transformed.xz += vec2(kitWave, kitWave * 0.5) * uSway * max(position.y, 0.0);
`;

const SURFACE_WORLD = `
#include <project_vertex>
vec4 kitWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
kitWorld = instanceMatrix * kitWorld;
#endif
vKitWorld = (modelMatrix * kitWorld).xyz;
`;

const SURFACE_FRAGMENT_PARS = `
#include <common>
uniform float uTime;
uniform float uCloudStrength;
uniform float uCloudScale;
uniform vec2 uCloudWind;
varying vec3 vKitWorld;
${NOISE_GLSL}
`;

const SURFACE_CLOUDS = `
#include <lights_fragment_end>
if (uCloudStrength > 0.0) {
  float kitCover = kitFbm(vKitWorld.xz * uCloudScale + uCloudWind * uTime);
  float kitShade = 1.0 - uCloudStrength * smoothstep(${CLOUD_COVER[0]}, ${CLOUD_COVER[1]}, kitCover);
  reflectedLight.directDiffuse *= kitShade;
  reflectedLight.directSpecular *= kitShade;
}
`;

const GLOW_VERTEX_PARS = `
#include <common>
varying float vKitPhase;
`;

const GLOW_PHASE = `
#include <begin_vertex>
vKitPhase = 0.0;
#ifdef USE_INSTANCING
vKitPhase = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;
#endif
`;

const GLOW_FRAGMENT_PARS = `
#include <common>
uniform float uTime;
uniform float uPulse;
uniform float uPulseSpeed;
varying float vKitPhase;
`;

const GLOW_PULSE = `
#include <color_fragment>
float kitBeat = sin(uTime * uPulseSpeed + vKitPhase) * 0.65
  + sin(uTime * uPulseSpeed * 2.3 + vKitPhase * 1.3) * 0.35;
diffuseColor.rgb *= 1.0 + uPulse * kitBeat;
`;

export class MaterialKit {
  readonly time: Uniform<number> = { value: 0 };
  private readonly cloudStrength: Uniform<number>;
  private readonly cloudScale: Uniform<number>;
  private readonly cloudWind: Uniform<THREE.Vector2>;
  private readonly cache = new Map<string, THREE.Material>();

  constructor(clouds?: CloudShadowSpec) {
    this.cloudStrength = { value: clouds?.strength ?? 0 };
    this.cloudScale = { value: clouds?.scale ?? 1 };
    this.cloudWind = {
      value: CLOUD_DIRECTION.clone().multiplyScalar((clouds?.speed ?? 0) * (clouds?.scale ?? 1)),
    };
  }

  surface(options: SurfaceOptions = {}): THREE.MeshLambertMaterial | THREE.MeshStandardMaterial {
    const key = `surface:${options.sway}:${options.roughness}:${options.metalness}:${options.doubleSided}`;
    return this.cached(key, () => this.createSurface(options));
  }

  glow(options: GlowOptions): THREE.MeshBasicMaterial {
    const key = `glow:${options.intensity}:${options.pulse}:${options.speed}`;
    return this.cached(key, () => this.createGlow(options));
  }

  update(elapsed: number): void {
    this.time.value = elapsed;
  }

  private cached<T extends THREE.Material>(key: string, create: () => T): T {
    const existing = this.cache.get(key);
    if (existing) return existing as T;
    const material = create();
    this.cache.set(key, material);
    return material;
  }

  private createSurface(
    options: SurfaceOptions,
  ): THREE.MeshLambertMaterial | THREE.MeshStandardMaterial {
    const roughness = options.roughness ?? DEFAULT_ROUGHNESS;
    const base = {
      vertexColors: true,
      flatShading: true,
      side: options.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    };
    const material =
      roughness < GLOSSY_LIMIT
        ? new THREE.MeshStandardMaterial({ ...base, roughness, metalness: options.metalness ?? 0 })
        : new THREE.MeshLambertMaterial(base);
    const sway = { value: options.sway ?? 0 };
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, {
        uTime: this.time,
        uSway: sway,
        uCloudStrength: this.cloudStrength,
        uCloudScale: this.cloudScale,
        uCloudWind: this.cloudWind,
        uKitNoise: { value: noiseTexture() },
      });
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', SURFACE_VERTEX_PARS)
        .replace('#include <begin_vertex>', SURFACE_SWAY)
        .replace('#include <project_vertex>', SURFACE_WORLD);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', SURFACE_FRAGMENT_PARS)
        .replace('#include <lights_fragment_end>', SURFACE_CLOUDS);
    };
    material.customProgramCacheKey = () => `kit-surface-${material.type}`;
    return material;
  }

  private createGlow(options: GlowOptions): THREE.MeshBasicMaterial {
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      color: new THREE.Color().setScalar(options.intensity),
    });
    const pulse = { value: options.pulse ?? 0 };
    const speed = { value: options.speed ?? 1 };
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, { uTime: this.time, uPulse: pulse, uPulseSpeed: speed });
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', GLOW_VERTEX_PARS)
        .replace('#include <begin_vertex>', GLOW_PHASE);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', GLOW_FRAGMENT_PARS)
        .replace('#include <color_fragment>', GLOW_PULSE);
    };
    material.customProgramCacheKey = () => 'kit-glow';
    return material;
  }
}
