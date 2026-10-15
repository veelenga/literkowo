import * as THREE from 'three';
import { AmbientParticles, type AmbientSpec } from './AmbientParticles';
import { disposeObject } from './disposal';
import { MaterialKit } from './environment/materials';
import { Rng } from './environment/random';
import { createSkyDome } from './environment/SkyDome';
import { Terrain } from './environment/Terrain';
import type { Animated } from './environment/types';
import type { LightSpec, Theme } from './themes';

const SUN_DISTANCE = 60;
const SHADOW_TARGET = new THREE.Vector3(0, 0, -4);
const SHADOW_MAP_SIZE = 2048;
const SHADOW_FOCUS_HEIGHT = 7;
const SHADOW_FOCUS_GROUND: ReadonlyArray<readonly [x: number, z: number]> = [
  [-14, 10],
  [14, 10],
  [-30, -24],
  [30, -24],
];
const SHADOW_FOCUS = [0, SHADOW_FOCUS_HEIGHT].flatMap((y) =>
  SHADOW_FOCUS_GROUND.map(([x, z]) => new THREE.Vector3(x, y, z)),
);
const SHADOW_MARGIN = 1;
const SHADOW_NEAR = 1;
const SHADOW_FAR = 140;
const SHADOW_BIAS = -0.0004;
const SHADOW_NORMAL_BIAS = 0.04;

export class World {
  private readonly root = new THREE.Group();
  private readonly animated: Animated[] = [];
  private readonly materials: MaterialKit;

  constructor(scene: THREE.Scene, theme: Theme) {
    this.materials = new MaterialKit(theme.clouds);
    const sunDirection = new THREE.Vector3(...theme.light.sun.direction).normalize();
    scene.background = new THREE.Color(theme.fog.color);
    scene.fog = new THREE.Fog(theme.fog.color, theme.fog.near, theme.fog.far);
    scene.add(this.root);
    this.root.add(createSkyDome(theme.sky, sunDirection));
    this.addLights(theme.light, sunDirection);
    const rng = new Rng(theme.seed);
    this.addLandscape(theme, rng, sunDirection);
    theme.ambient.forEach((spec) => this.addAmbient(spec, rng.fork()));
  }

  update(delta: number, elapsed: number): void {
    this.materials.update(elapsed);
    this.animated.forEach((item) => item.update(delta, elapsed));
  }

  dispose(): void {
    this.root.removeFromParent();
    disposeObject(this.root);
    this.materials.dispose();
    this.animated.length = 0;
  }

  private addLandscape(theme: Theme, rng: Rng, sunDirection: THREE.Vector3): void {
    const landscape = theme.landscape(rng.fork());
    const terrain = new Terrain(landscape.terrain, this.materials);
    this.root.add(terrain.mesh);
    landscape.decorate({
      rng: rng.fork(),
      terrain,
      materials: this.materials,
      sunDirection,
      add: (object) => this.root.add(object),
      animate: (item) => this.animated.push(item),
    });
  }

  private addLights(light: LightSpec, sunDirection: THREE.Vector3): void {
    const { hemisphere, sun } = light;
    this.root.add(
      new THREE.HemisphereLight(hemisphere.sky, hemisphere.ground, hemisphere.intensity),
    );
    const directional = new THREE.DirectionalLight(sun.color, sun.intensity);
    directional.position.copy(sunDirection).multiplyScalar(SUN_DISTANCE).add(SHADOW_TARGET);
    directional.target.position.copy(SHADOW_TARGET);
    directional.castShadow = true;
    configureSunShadow(directional);
    this.root.add(directional, directional.target);
  }

  private addAmbient(spec: AmbientSpec, rng: Rng): void {
    const particles = new AmbientParticles(spec, rng);
    this.root.add(particles.points);
    this.animated.push(particles);
  }
}

function configureSunShadow(light: THREE.DirectionalLight): void {
  const { shadow } = light;
  shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  shadow.camera.near = SHADOW_NEAR;
  shadow.camera.far = SHADOW_FAR;
  shadow.bias = SHADOW_BIAS;
  shadow.normalBias = SHADOW_NORMAL_BIAS;
  fitShadowCamera(shadow.camera, light.position);
}

function fitShadowCamera(camera: THREE.OrthographicCamera, from: THREE.Vector3): void {
  camera.position.copy(from);
  camera.lookAt(SHADOW_TARGET);
  camera.updateMatrixWorld();
  const bounds = new THREE.Box3();
  const point = new THREE.Vector3();
  SHADOW_FOCUS.forEach((corner) =>
    bounds.expandByPoint(point.copy(corner).applyMatrix4(camera.matrixWorldInverse)),
  );
  bounds.expandByScalar(SHADOW_MARGIN);
  camera.left = bounds.min.x;
  camera.right = bounds.max.x;
  camera.bottom = bounds.min.y;
  camera.top = bounds.max.y;
  camera.updateProjectionMatrix();
}
