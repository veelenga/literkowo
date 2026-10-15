import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import {
  CHARACTER_HEIGHT,
  characterModelUrl,
  createContactShadow,
  findClip,
  fitToCharacterHeight,
  IDLE_CLIP,
  prepareMeshes,
} from './characterModel';
import { disposeObject } from './disposal';

const MODEL_LOAD_ERROR = 'Could not load the character model, keeping the placeholder';

const PUNCH_CLIP = 'attack-melee-right';
const REFUSE_CLIP = 'emote-no';
const BLEND_DURATION = 0.12;
const TURN_SHARPNESS = 8;
const FULL_TURN = Math.PI * 2;

const PLACEHOLDER_COLOR = 0x8fb8de;
const PLACEHOLDER_RADIUS = 0.3;
const PLACEHOLDER_LENGTH = CHARACTER_HEIGHT - PLACEHOLDER_RADIUS * 2;
const PLACEHOLDER_CAP_SEGMENTS = 4;
const PLACEHOLDER_RADIAL_SEGMENTS = 8;

type GestureClip = typeof PUNCH_CLIP | typeof REFUSE_CLIP;
type ActionPair = [THREE.AnimationAction, THREE.AnimationAction];

export class Player {
  readonly object = new THREE.Group();
  private readonly placeholder = createPlaceholder();
  private animator: CharacterAnimator | null = null;
  private now = 0;
  private targetYaw = 0;
  private disposed = false;

  constructor(character: string) {
    this.object.add(this.placeholder, createContactShadow());
    this.loadModel(characterModelUrl(character));
  }

  update(delta: number, elapsed: number): void {
    this.now = elapsed;
    this.turnTowardTarget(delta);
    this.animator?.update(delta, elapsed);
  }

  jump(): void {
    this.animator?.play(PUNCH_CLIP, this.now);
  }

  hurt(): void {
    this.animator?.play(REFUSE_CLIP, this.now);
  }

  lookAt(target: THREE.Vector3): void {
    const { position } = this.object;
    this.targetYaw = Math.atan2(target.x - position.x, target.z - position.z);
  }

  dispose(): void {
    this.disposed = true;
    this.animator?.stop();
    this.animator = null;
    disposeObject(this.object);
  }

  private loadModel(url: string): void {
    new GLTFLoader().load(
      url,
      (gltf) => this.attachModel(gltf),
      undefined,
      (error) => console.error(MODEL_LOAD_ERROR, error),
    );
  }

  private attachModel(gltf: GLTF): void {
    const model = gltf.scene;
    if (this.disposed) return disposeObject(model);
    fitToCharacterHeight(model);
    prepareMeshes(model);
    this.animator = new CharacterAnimator(model, gltf.animations);
    this.removePlaceholder();
    this.object.add(model);
  }

  private removePlaceholder(): void {
    this.object.remove(this.placeholder);
    this.placeholder.geometry.dispose();
    this.placeholder.material.dispose();
  }

  private turnTowardTarget(delta: number): void {
    const step = 1 - Math.exp(-TURN_SHARPNESS * delta);
    const { rotation } = this.object;
    rotation.y += shortestAngleBetween(rotation.y, this.targetYaw) * step;
  }
}

class CharacterAnimator {
  private readonly mixer: THREE.AnimationMixer;
  private readonly idle: THREE.AnimationAction;
  private readonly gestures: Record<GestureClip, ActionPair>;
  private readonly weights = new Map<THREE.AnimationAction, number>();
  private gesture: THREE.AnimationAction | null = null;
  private gestureEndsAt = 0;

  constructor(model: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(model);
    this.idle = this.mixer.clipAction(findClip(clips, IDLE_CLIP));
    this.weights.set(this.idle, 1);
    this.idle.play();
    this.gestures = {
      [PUNCH_CLIP]: this.createGesturePair(findClip(clips, PUNCH_CLIP)),
      [REFUSE_CLIP]: this.createGesturePair(findClip(clips, REFUSE_CLIP)),
    };
  }

  play(name: GestureClip, now: number): void {
    const action = this.leastVisibleOf(this.gestures[name]);
    action.reset().play();
    this.gesture = action;
    this.gestureEndsAt = now + action.getClip().duration;
  }

  update(delta: number, now: number): void {
    if (this.gesture && now >= this.gestureEndsAt) this.gesture = null;
    this.blendWeights(delta);
    this.mixer.update(delta);
  }

  stop(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.mixer.getRoot());
  }

  private createGesturePair(clip: THREE.AnimationClip): ActionPair {
    return [this.createGesture(clip), this.createGesture(clip.clone())];
  }

  private createGesture(clip: THREE.AnimationClip): THREE.AnimationAction {
    const action = this.mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    this.weights.set(action, 0);
    return action;
  }

  private leastVisibleOf([first, second]: ActionPair): THREE.AnimationAction {
    return this.weightOf(first) <= this.weightOf(second) ? first : second;
  }

  private weightOf(action: THREE.AnimationAction): number {
    return this.weights.get(action) ?? 0;
  }

  private blendWeights(delta: number): void {
    const step = delta / BLEND_DURATION;
    const leading = this.gesture ?? this.idle;
    let total = 0;
    for (const [action, weight] of this.weights) {
      const next = moveToward(weight, action === leading ? 1 : 0, step);
      this.weights.set(action, next);
      total += next;
    }
    for (const [action, weight] of this.weights) action.setEffectiveWeight(weight / total);
  }
}

function moveToward(current: number, target: number, step: number): number {
  return current < target ? Math.min(target, current + step) : Math.max(target, current - step);
}

function shortestAngleBetween(from: number, to: number): number {
  return THREE.MathUtils.euclideanModulo(to - from + Math.PI, FULL_TURN) - Math.PI;
}

function createPlaceholder(): THREE.Mesh<THREE.CapsuleGeometry, THREE.MeshStandardMaterial> {
  const geometry = new THREE.CapsuleGeometry(
    PLACEHOLDER_RADIUS,
    PLACEHOLDER_LENGTH,
    PLACEHOLDER_CAP_SEGMENTS,
    PLACEHOLDER_RADIAL_SEGMENTS,
  );
  const material = new THREE.MeshStandardMaterial({ color: PLACEHOLDER_COLOR });
  const placeholder = new THREE.Mesh(geometry, material);
  placeholder.position.y = CHARACTER_HEIGHT / 2;
  placeholder.castShadow = true;
  return placeholder;
}
