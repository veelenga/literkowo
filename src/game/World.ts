import * as THREE from 'three';
import { AmbientParticles, type AmbientSpec } from './AmbientParticles';
import { MaterialKit } from './environment/materials';
import { Rng } from './environment/random';
import { createSkyDome } from './environment/SkyDome';
import { Terrain } from './environment/Terrain';
import type { Animated } from './environment/types';
import type { LightSpec, Theme } from './themes';

const SUN_DISTANCE = 60;
const SHADOW_TARGET = new THREE.Vector3(0, 0, -4);
const SHADOW_EXTENT = 30;
const SHADOW_MAP_SIZE = 2048;
const SHADOW_NEAR = 1;
const SHADOW_FAR = 140;
const SHADOW_BIAS = -0.0004;
const SHADOW_NORMAL_BIAS = 0.04;

export class World {
  private readonly animated: Animated[] = [];
  private readonly materials: MaterialKit;

  constructor(
    private readonly scene: THREE.Scene,
    theme: Theme,
  ) {
    this.materials = new MaterialKit(theme.clouds);
    const sunDirection = new THREE.Vector3(...theme.light.sun.direction).normalize();
    scene.background = new THREE.Color(theme.fog.color);
    scene.fog = new THREE.Fog(theme.fog.color, theme.fog.near, theme.fog.far);
    scene.add(createSkyDome(theme.sky, sunDirection));
    this.addLights(theme.light, sunDirection);
    const rng = new Rng(theme.seed);
    const landscape = theme.landscape(rng.fork());
    const terrain = new Terrain(landscape.terrain, this.materials);
    scene.add(terrain.mesh);
    landscape.decorate({
      rng: rng.fork(),
      terrain,
      materials: this.materials,
      sunDirection,
      add: (object) => scene.add(object),
      animate: (item) => this.animated.push(item),
    });
    theme.ambient.forEach((spec) => this.addAmbient(spec, rng.fork()));
  }

  update(delta: number, elapsed: number): void {
    this.materials.update(elapsed);
    this.animated.forEach((item) => item.update(delta, elapsed));
  }

  private addLights(light: LightSpec, sunDirection: THREE.Vector3): void {
    const { hemisphere, sun } = light;
    this.scene.add(
      new THREE.HemisphereLight(hemisphere.sky, hemisphere.ground, hemisphere.intensity),
    );
    const directional = new THREE.DirectionalLight(sun.color, sun.intensity);
    directional.position.copy(sunDirection).multiplyScalar(SUN_DISTANCE).add(SHADOW_TARGET);
    directional.target.position.copy(SHADOW_TARGET);
    directional.castShadow = true;
    const { shadow } = directional;
    shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    shadow.camera.left = -SHADOW_EXTENT;
    shadow.camera.right = SHADOW_EXTENT;
    shadow.camera.top = SHADOW_EXTENT;
    shadow.camera.bottom = -SHADOW_EXTENT;
    shadow.camera.near = SHADOW_NEAR;
    shadow.camera.far = SHADOW_FAR;
    shadow.bias = SHADOW_BIAS;
    shadow.normalBias = SHADOW_NORMAL_BIAS;
    this.scene.add(directional, directional.target);
  }

  private addAmbient(spec: AmbientSpec, rng: Rng): void {
    const particles = new AmbientParticles(spec, rng);
    this.scene.add(particles.points);
    this.animated.push(particles);
  }
}
