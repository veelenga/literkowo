import * as THREE from 'three';
import { CHARACTER_HEIGHT } from '../../game/characterModel';
import type { PortraitRenderer } from '../CharacterPortraits';
import { canvasToDataUrl } from './canvasImage';
import { createCharacterRenderer, IdleCharacter, PORTRAIT_FRAMING } from './characterStage';
import {
  OutfitStage,
  STILL_POSE_TIME,
  wearHat,
  type Outfit,
  type OutfitLayout,
} from './outfitStage';

const STILL_SIZE = 256;
const HAT_HEADROOM_SHARE = 0.3;
const HAT_HEADROOM = Math.round(STILL_SIZE * HAT_HEADROOM_SHARE);
const STILL_PIXEL_RATIO = 1;
const STUDIO_CLOSED_ERROR = 'The outfit studio is closed';

const HIP_HEIGHT = CHARACTER_HEIGHT * 0.4;

const MARKER_LAYOUT: OutfitLayout = {
  framing: PORTRAIT_FRAMING,
  heroSpot: new THREE.Vector3(),
  petSpot: new THREE.Vector3(0.6, HIP_HEIGHT, 0.05),
  petScale: 1.1,
};

export class OutfitStudio implements PortraitRenderer<Outfit> {
  private readonly renderer = createCharacterRenderer({ preserveDrawingBuffer: true });
  private readonly stage = new OutfitStage(MARKER_LAYOUT);
  private closed = false;

  constructor() {
    this.renderer.setPixelRatio(STILL_PIXEL_RATIO);
    this.renderer.setSize(STILL_SIZE, STILL_SIZE + HAT_HEADROOM, false);
    this.stage.camera.setViewOffset(
      STILL_SIZE,
      STILL_SIZE,
      0,
      -HAT_HEADROOM,
      STILL_SIZE,
      STILL_SIZE + HAT_HEADROOM,
    );
  }
  async render(outfit: Outfit): Promise<string> {
    const character = await IdleCharacter.load(outfit.character);
    if (this.closed) {
      character.dispose();
      throw new Error(STUDIO_CLOSED_ERROR);
    }
    this.capture(character, outfit);
    return canvasToDataUrl(this.renderer.domElement);
  }

  dispose(): void {
    this.closed = true;
    this.stage.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private capture(character: IdleCharacter, { hat, pet }: Outfit): void {
    this.stage.show(character);
    if (hat) wearHat(character, hat);
    const petModel = pet && this.stage.addPet(pet);
    this.stage.pose(STILL_POSE_TIME, petModel, false);
    this.renderer.render(this.stage.scene, this.stage.camera);
    if (petModel) this.stage.removePet(petModel);
    character.dispose();
  }
}
