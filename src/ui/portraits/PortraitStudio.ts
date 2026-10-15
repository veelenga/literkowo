import type { PortraitRenderer } from '../CharacterPortraits';
import { CharacterStage, createCharacterRenderer, IdleCharacter } from './characterStage';

const PORTRAIT_SIZE = 512;
const PORTRAIT_PIXEL_RATIO = 1;
const PNG_TYPE = 'image/png';
const STUDIO_CLOSED_ERROR = 'The portrait studio is closed';
const ENCODE_ERROR = 'Could not encode the character portrait';

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

function canvasToDataUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error(ENCODE_ERROR));
      readAsDataUrl(blob).then(resolve, reject);
    }, PNG_TYPE);
  });
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () =>
      typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error(ENCODE_ERROR)),
    );
    reader.addEventListener('error', () => reject(reader.error ?? new Error(ENCODE_ERROR)));
    reader.readAsDataURL(blob);
  });
}
