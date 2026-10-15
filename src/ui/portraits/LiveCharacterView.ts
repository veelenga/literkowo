import { CharacterStage, createCharacterRenderer, IdleCharacter } from './characterStage';

const MODEL_LOAD_ERROR = 'Could not load the character preview, keeping the portrait';
const CANVAS_CLASS = 'avatar-live';
const MAX_PIXEL_RATIO = 2;
const TURN_SPEED = 0.5;
const MAX_STEP_SECONDS = 0.1;
const MS_PER_SECOND = 1000;

export class LiveCharacterView {
  private readonly renderer = createCharacterRenderer();
  private readonly stage = new CharacterStage();
  private readonly resizer = new ResizeObserver((entries) =>
    entries.forEach((entry) => this.resize(entry.contentRect)),
  );
  private character: IdleCharacter | undefined;
  private lastFrameTime: number | undefined;
  private hasSize = false;
  private hasShown = false;
  private disposed = false;

  constructor(
    host: HTMLElement,
    character: string,
    private readonly onShown: () => void,
  ) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.domElement.classList.add(CANVAS_CLASS);
    host.append(this.renderer.domElement);
    this.resizer.observe(host);
    void this.load(character);
  }

  dispose(): void {
    this.disposed = true;
    this.resizer.disconnect();
    this.renderer.setAnimationLoop(null);
    this.character?.dispose();
    this.stage.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  private async load(character: string): Promise<void> {
    try {
      const loaded = await IdleCharacter.load(character);
      if (this.disposed) return loaded.dispose();
      this.character = loaded;
      this.stage.turntable.add(loaded.model);
      this.renderer.setAnimationLoop((time) => this.frame(time));
    } catch (error) {
      console.error(MODEL_LOAD_ERROR, error);
    }
  }

  private frame(time: number): void {
    const seconds = Math.min(
      MAX_STEP_SECONDS,
      (time - (this.lastFrameTime ?? time)) / MS_PER_SECOND,
    );
    this.lastFrameTime = time;
    if (!this.hasSize) return;
    this.character?.advance(seconds);
    this.stage.turntable.rotation.y += TURN_SPEED * seconds;
    this.renderer.render(this.stage.scene, this.stage.camera);
    this.reveal();
  }

  private reveal(): void {
    if (this.hasShown) return;
    this.hasShown = true;
    this.onShown();
  }

  private resize({ width, height }: DOMRectReadOnly): void {
    this.hasSize = width > 0 && height > 0;
    if (!this.hasSize) return;
    this.renderer.setSize(width, height, false);
    this.stage.setAspect(width / height);
  }
}
