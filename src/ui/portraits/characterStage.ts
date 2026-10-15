import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  CHARACTER_HEIGHT,
  characterModelUrl,
  createContactShadow,
  findClip,
  fitToCharacterHeight,
  IDLE_CLIP,
  prepareMeshes,
} from '../../game/characterModel';
import { disposeObject } from '../../game/disposal';

const FIELD_OF_VIEW = 24;
const NEAR_PLANE = 0.1;
const FAR_PLANE = 40;
const PORTRAIT_FRAMING: StageFraming = {
  framedHeight: CHARACTER_HEIGHT * 1.2,
  focusHeight: CHARACTER_HEIGHT * 0.48,
};
const VIEW_AZIMUTH = THREE.MathUtils.degToRad(32);
const VIEW_ELEVATION = THREE.MathUtils.degToRad(12);

const KEY_LIGHT = { color: 0xffd7a3, intensity: 2.6, position: [2.2, 3.6, 3.4] } as const;
const FILL_LIGHT = { color: 0xb4caff, intensity: 0.9, position: [-3.2, 1.4, 1.6] } as const;
const SKY_LIGHT = { sky: 0xfff4e2, ground: 0x4a4f7a, intensity: 1.3 } as const;
const SHADOW_OPACITY = 0.3;

const EXPOSURE = 1.05;
const TRANSPARENT = 0x000000;
const IDLE_POSE_TIME = 0.35;

export interface StageFraming {
  framedHeight: number;
  focusHeight: number;
}

export interface RendererOptions {
  preserveDrawingBuffer?: boolean;
}

export function createCharacterRenderer(options: RendererOptions = {}): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, ...options });
  renderer.setClearColor(TRANSPARENT, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = EXPOSURE;
  return renderer;
}

export class CharacterStage {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly turntable = new THREE.Group();

  constructor(framing: StageFraming = PORTRAIT_FRAMING) {
    this.camera = createCamera(framing);
    this.scene.add(this.turntable, createContactShadow(SHADOW_OPACITY), ...createLights());
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  show(character: IdleCharacter): void {
    this.turntable.clear();
    this.turntable.add(character.model);
  }

  dispose(): void {
    disposeObject(this.scene);
  }
}

export class IdleCharacter {
  private constructor(
    readonly model: THREE.Object3D,
    private readonly mixer: THREE.AnimationMixer,
  ) {}

  static async load(character: string): Promise<IdleCharacter> {
    const { scene, animations } = await new GLTFLoader().loadAsync(characterModelUrl(character));
    const idle = findClip(animations, IDLE_CLIP);
    fitToCharacterHeight(scene);
    prepareMeshes(scene);
    const mixer = new THREE.AnimationMixer(scene);
    mixer.clipAction(idle).play();
    mixer.setTime(IDLE_POSE_TIME);
    return new IdleCharacter(scene, mixer);
  }

  advance(seconds: number): void {
    this.mixer.update(seconds);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    this.model.removeFromParent();
    disposeObject(this.model);
  }
}

function createCamera({ framedHeight, focusHeight }: StageFraming): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, 1, NEAR_PLANE, FAR_PLANE);
  const focus = new THREE.Vector3(0, focusHeight, 0);
  const halfView = THREE.MathUtils.degToRad(FIELD_OF_VIEW / 2);
  const distance = framedHeight / 2 / Math.tan(halfView);
  const polar = Math.PI / 2 - VIEW_ELEVATION;
  camera.position.setFromSphericalCoords(distance, polar, VIEW_AZIMUTH).add(focus);
  camera.lookAt(focus);
  return camera;
}

export function createLights(): THREE.Light[] {
  const key = new THREE.DirectionalLight(KEY_LIGHT.color, KEY_LIGHT.intensity);
  key.position.set(...KEY_LIGHT.position);
  const fill = new THREE.DirectionalLight(FILL_LIGHT.color, FILL_LIGHT.intensity);
  fill.position.set(...FILL_LIGHT.position);
  const sky = new THREE.HemisphereLight(SKY_LIGHT.sky, SKY_LIGHT.ground, SKY_LIGHT.intensity);
  return [key, fill, sky];
}
