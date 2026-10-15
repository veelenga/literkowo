import * as THREE from 'three';
import type { HatSpec, PetSpec } from '../../course/shop';
import { CHARACTER_HEIGHT, mountOnHead } from '../../game/characterModel';
import { buildHat } from '../../game/cosmetics/hats';
import { buildPet, type PetModel } from '../../game/cosmetics/pets';
import { disposeObject } from '../../game/disposal';
import { CharacterStage, createCharacterRenderer, IdleCharacter } from './characterStage';

export interface Outfit {
  readonly character: string;
  readonly hat?: HatSpec;
  readonly pet?: PetSpec;
}

export interface OutfitViewOptions {
  readonly animate: boolean;
}

interface Dressed<Spec, Model> {
  readonly spec: Spec;
  readonly model: Model;
}

const MODEL_LOAD_ERROR = 'Could not load the outfit preview, keeping the portrait';
const CANVAS_CLASS = 'avatar-live';
const MAX_PIXEL_RATIO = 2;
const MAX_STEP_SECONDS = 0.1;
const MS_PER_SECOND = 1000;
const FRAMING = { framedHeight: CHARACTER_HEIGHT * 1.55, focusHeight: CHARACTER_HEIGHT * 0.62 };
const PET_SPOT = new THREE.Vector3(0.95, 1.2, 0.25);
const PET_BOB = { speed: 2.3, height: 0.1 };
const SWAY = { speed: 0.45, angle: 0.4 };
const STILL_POSE_TIME = 0.4;

export class OutfitView {
  private readonly renderer = createCharacterRenderer();
  private readonly stage = new CharacterStage(FRAMING);
  private readonly petSpot = new THREE.Group();
  private readonly resizer = new ResizeObserver((entries) =>
    entries.forEach((entry) => this.resize(entry.contentRect)),
  );
  private character: Dressed<string, IdleCharacter> | undefined;
  private hat: Dressed<HatSpec, THREE.Object3D> | undefined;
  private pet: Dressed<PetSpec, PetModel> | undefined;
  private wanted: Outfit | undefined;
  private loading: string | undefined;
  private onFirstFrame: (() => void) | undefined;
  private lastFrameTime: number | undefined;
  private elapsed = STILL_POSE_TIME;
  private pendingFrame = 0;
  private hasSize = false;
  private disposed = false;

  constructor(private readonly options: OutfitViewOptions) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.domElement.classList.add(CANVAS_CLASS);
    this.petSpot.position.copy(PET_SPOT);
    this.stage.turntable.add(this.petSpot);
  }

  show(host: HTMLElement, outfit: Outfit, onFirstFrame: () => void): void {
    this.attachTo(host);
    this.onFirstFrame = onFirstFrame;
    this.wanted = outfit;
    this.dressPet(outfit.pet);
    if (this.character?.spec === outfit.character) this.dressHat(outfit.hat);
    else if (this.loading !== outfit.character) void this.load(outfit.character);
    this.play();
  }

  dispose(): void {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    cancelAnimationFrame(this.pendingFrame);
    this.resizer.disconnect();
    this.renderer.domElement.remove();
    this.character?.model.dispose();
    this.removePet();
    this.stage.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private attachTo(host: HTMLElement): void {
    if (this.renderer.domElement.parentElement === host) return;
    this.resizer.disconnect();
    host.append(this.renderer.domElement);
    this.resizer.observe(host);
  }

  private async load(name: string): Promise<void> {
    this.loading = name;
    try {
      const idle = await IdleCharacter.load(name);
      if (this.disposed || !this.isWanted(name)) return idle.dispose();
      this.swapCharacter({ spec: name, model: idle });
    } catch (error) {
      console.error(MODEL_LOAD_ERROR, error);
    } finally {
      if (this.loading === name) this.loading = undefined;
    }
  }

  private swapCharacter(next: Dressed<string, IdleCharacter>): void {
    this.character?.model.dispose();
    this.hat = undefined;
    this.character = next;
    this.stage.turntable.add(next.model.model);
    this.dressHat(this.wanted?.hat);
    this.play();
  }

  private dressHat(spec: HatSpec | undefined): void {
    if (!this.character || this.hat?.spec === spec) return;
    this.removeHat();
    if (!spec) return;
    const model = buildHat(spec);
    mountOnHead(this.character.model.model, model);
    this.hat = { spec, model };
  }

  private removeHat(): void {
    if (!this.hat) return;
    this.hat.model.removeFromParent();
    disposeObject(this.hat.model);
    this.hat = undefined;
  }

  private dressPet(spec: PetSpec | undefined): void {
    if (this.pet?.spec === spec) return;
    this.removePet();
    if (!spec) return;
    const model = buildPet(spec);
    this.petSpot.add(model.object);
    this.pet = { spec, model };
  }

  private removePet(): void {
    if (!this.pet) return;
    this.pet.model.object.removeFromParent();
    disposeObject(this.pet.model.object);
    this.pet = undefined;
  }

  private play(): void {
    if (this.options.animate) this.renderer.setAnimationLoop((time) => this.tick(time));
    else this.requestStill();
  }

  private requestStill(): void {
    if (this.pendingFrame) return;
    this.pendingFrame = requestAnimationFrame(() => {
      this.pendingFrame = 0;
      this.pose(0);
    });
  }

  private tick(time: number): void {
    const seconds = Math.min(
      MAX_STEP_SECONDS,
      (time - (this.lastFrameTime ?? time)) / MS_PER_SECOND,
    );
    this.lastFrameTime = time;
    this.pose(seconds);
  }

  private pose(seconds: number): void {
    if (!this.hasSize || !this.character || !this.isWanted(this.character.spec)) return;
    this.elapsed += seconds;
    this.character.model.advance(seconds);
    this.pet?.model.animate(this.elapsed);
    this.petSpot.position.y = PET_SPOT.y + Math.sin(this.elapsed * PET_BOB.speed) * PET_BOB.height;
    this.stage.turntable.rotation.y = this.options.animate
      ? Math.sin(this.elapsed * SWAY.speed) * SWAY.angle
      : 0;
    this.renderer.render(this.stage.scene, this.stage.camera);
    this.onFirstFrame?.();
    this.onFirstFrame = undefined;
  }

  private isWanted(character: string): boolean {
    return this.wanted?.character === character;
  }

  private resize({ width, height }: DOMRectReadOnly): void {
    this.hasSize = width > 0 && height > 0;
    if (!this.hasSize) return;
    this.renderer.setSize(width, height, false);
    this.stage.setAspect(width / height);
    if (!this.options.animate) this.requestStill();
  }
}
