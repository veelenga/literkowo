import { hasCoarsePointer } from '../game/deviceProbe';
import { prefersReducedMotion } from './dom';

const LIVE_CLASS = 'is-live';
const PREVIEW_UNAVAILABLE = 'Live character preview is unavailable, keeping the portrait';

interface LiveView {
  show(host: HTMLElement, character: string, onFirstFrame: () => void): void;
  hide(): void;
  dispose(): void;
}

class LivePreview {
  private view: Promise<LiveView | undefined> | undefined;
  private host: HTMLElement | undefined;
  private request = 0;

  show(host: HTMLElement, character: string): void {
    this.hide();
    if (prefersReducedMotion() || hasCoarsePointer()) return;
    const request = this.request;
    this.host = host;
    void this.loadView().then((view) => {
      if (request !== this.request) return;
      view?.show(host, character, () => host.classList.add(LIVE_CLASS));
    });
  }

  hide(): void {
    this.request += 1;
    this.host?.classList.remove(LIVE_CLASS);
    this.host = undefined;
    void this.view?.then((view) => view?.hide());
  }

  stop(): void {
    this.hide();
    void this.view?.then((view) => view?.dispose());
    this.view = undefined;
  }

  private loadView(): Promise<LiveView | undefined> {
    this.view ??= import('./portraits/LiveCharacterView')
      .then(({ LiveCharacterView }) => new LiveCharacterView())
      .catch((error: unknown) => {
        console.warn(PREVIEW_UNAVAILABLE, error);
        return undefined;
      });
    return this.view;
  }
}

export const livePreview = new LivePreview();
