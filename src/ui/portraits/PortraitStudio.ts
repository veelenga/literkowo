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
  private closed = false;

  constructor() {
    this.renderer.setPixelRatio(PORTRAIT_PIXEL_RATIO);
    this.renderer.setSize(PORTRAIT_SIZE, PORTRAIT_SIZE, false);
  }

  async render(character: string): Promise<string> {
    const model = await IdleCharacter.load(character);
    try {
      if (this.closed) throw new Error(STUDIO_CLOSED_ERROR);
      return await this.capture(model);
    } finally {
      model.dispose();
    }
  }

  dispose(): void {
    this.closed = true;
    this.stage.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private capture(character: IdleCharacter): Promise<string> {
    this.stage.turntable.add(character.model);
    this.renderer.render(this.stage.scene, this.stage.camera);
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
