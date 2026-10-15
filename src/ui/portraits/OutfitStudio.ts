import type { PortraitRenderer } from '../CharacterPortraits';
import { canvasToDataUrl } from './canvasImage';
import { createCharacterRenderer, IdleCharacter } from './characterStage';
import { OutfitStage, STILL_POSE_TIME, wearHat, type Outfit } from './outfitStage';

const STILL_SIZE = 256;
const STILL_PIXEL_RATIO = 1;
const STUDIO_CLOSED_ERROR = 'The outfit studio is closed';

export class OutfitStudio implements PortraitRenderer<Outfit> {
  private readonly renderer = createCharacterRenderer({ preserveDrawingBuffer: true });
  private readonly stage = new OutfitStage();
  private closed = false;

  constructor() {
    this.renderer.setPixelRatio(STILL_PIXEL_RATIO);
    this.renderer.setSize(STILL_SIZE, STILL_SIZE, false);
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
