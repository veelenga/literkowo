import { CharacterStage, createCharacterRenderer, IdleCharacter } from './characterStage';

const MODEL_LOAD_ERROR = 'Could not load the character preview, keeping the portrait';
const CANVAS_CLASS = 'avatar-live';
const MAX_PIXEL_RATIO = 2;
const TURN_SPEED = 0.5;
const MAX_STEP_SECONDS = 0.1;
const MS_PER_SECOND = 1000;

interface ShownCharacter {
  readonly name: string;
  readonly idle: IdleCharacter;
}

export class LiveCharacterView {
  private readonly renderer = createCharacterRenderer();
  private readonly stage = new CharacterStage();
  private readonly resizer = new ResizeObserver((entries) =>
    entries.forEach((entry) => this.resize(entry.contentRect)),
  );
  private shown: ShownCharacter | undefined;
  private retired: IdleCharacter | undefined;
  private wanted: string | undefined;
  private onFirstFrame: (() => void) | undefined;
  private lastFrameTime: number | undefined;
  private hasSize = false;
  private disposed = false;

  constructor() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.domElement.classList.add(CANVAS_CLASS);
  }

  show(host: HTMLElement, character: string, onFirstFrame: () => void): void {
    this.hide();
    host.append(this.renderer.domElement);
    this.resizer.observe(host);
    this.onFirstFrame = onFirstFrame;
    this.stage.turntable.rotation.y = 0;
    this.renderer.setAnimationLoop((time) => this.tick(time));
    if (this.wanted === character) return;
    this.wanted = character;
    void this.load(character);
  }

  hide(): void {
    this.renderer.setAnimationLoop(null);
    this.resizer.disconnect();
    this.renderer.domElement.remove();
    this.hasSize = false;
    this.lastFrameTime = undefined;
    this.onFirstFrame = undefined;
  }

  dispose(): void {
    this.hide();
    this.disposed = true;
    this.retired?.dispose();
    this.shown?.idle.dispose();
    this.stage.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private async load(character: string): Promise<void> {
    try {
      const idle = await IdleCharacter.load(character);
      if (this.disposed || this.wanted !== character) return idle.dispose();
      this.swapTo({ name: character, idle });
    } catch (error) {
      console.error(MODEL_LOAD_ERROR, error);
    }
  }

  private swapTo(next: ShownCharacter): void {
    this.retired?.dispose();
    this.retired = this.shown?.idle;
    this.shown = next;
    this.stage.show(next.idle);
  }

  private tick(time: number): void {
    const seconds = this.elapsedSince(time);
    if (!this.isReady()) return;
    this.shown?.idle.advance(seconds);
    this.stage.turntable.rotation.y += TURN_SPEED * seconds;
    this.renderer.render(this.stage.scene, this.stage.camera);
    this.retireOldModel();
    this.announceFirstFrame();
  }

  private elapsedSince(time: number): number {
    const elapsed = (time - (this.lastFrameTime ?? time)) / MS_PER_SECOND;
    this.lastFrameTime = time;
    return Math.min(MAX_STEP_SECONDS, elapsed);
  }

  private isReady(): boolean {
    return this.hasSize && this.shown !== undefined && this.shown.name === this.wanted;
  }

  private retireOldModel(): void {
    this.retired?.dispose();
    this.retired = undefined;
  }

  private announceFirstFrame(): void {
    this.onFirstFrame?.();
    this.onFirstFrame = undefined;
  }

  private resize({ width, height }: DOMRectReadOnly): void {
    this.hasSize = width > 0 && height > 0;
    if (!this.hasSize) return;
    this.renderer.setSize(width, height, false);
    this.stage.setAspect(width / height);
  }
}
