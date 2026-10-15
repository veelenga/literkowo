import type { PortraitRenderer } from '../CharacterPortraits';
import { canvasToDataUrl } from './canvasImage';
import { CharacterStage, createCharacterRenderer, IdleCharacter } from './characterStage';

const PORTRAIT_SIZE = 512;
const PORTRAIT_PIXEL_RATIO = 1;
const STUDIO_CLOSED_ERROR = 'The portrait studio is closed';

export class PortraitStudio implements PortraitRenderer {
  private readonly renderer = createCharacterRenderer({ preserveDrawingBuffer: true });
  private readonly stage = new CharacterStage();
  private posed: IdleCharacter | undefined;
  private closed = false;

  constructor() {
    this.renderer.setPixelRatio(PORTRAIT_PIXEL_RATIO);
    this.renderer.setSize(PORTRAIT_SIZE, PORTRAIT_SIZE, false);
  }

  async render(character: string): Promise<string> {
    const next = await IdleCharacter.load(character);
    if (this.closed) {
      next.dispose();
      throw new Error(STUDIO_CLOSED_ERROR);
    }
    return this.capture(next);
  }

  dispose(): void {
    this.closed = true;
    this.posed?.dispose();
    this.stage.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private capture(next: IdleCharacter): Promise<string> {
    const previous = this.posed;
    this.posed = next;
    this.stage.show(next);
    this.renderer.render(this.stage.scene, this.stage.camera);
    previous?.dispose();
    return canvasToDataUrl(this.renderer.domElement);
  }
}
