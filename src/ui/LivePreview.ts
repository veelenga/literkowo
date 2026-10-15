import { prefersReducedMotion } from './dom';

const LIVE_CLASS = 'is-live';
const PREVIEW_UNAVAILABLE = 'Live character preview is unavailable, keeping the portrait';

interface LiveView {
  dispose(): void;
}

class LivePreview {
  private view: LiveView | undefined;
  private host: HTMLElement | undefined;
  private request = 0;

  show(host: HTMLElement, character: string): void {
    this.stop();
    if (prefersReducedMotion()) return;
    const request = this.request;
    this.host = host;
    import('./portraits/LiveCharacterView')
      .then(({ LiveCharacterView }) => {
        if (request !== this.request) return;
        this.view = new LiveCharacterView(host, character, () => host.classList.add(LIVE_CLASS));
      })
      .catch((error: unknown) => console.warn(PREVIEW_UNAVAILABLE, error));
  }

  stop(): void {
    this.request += 1;
    this.view?.dispose();
    this.view = undefined;
    this.host?.classList.remove(LIVE_CLASS);
    this.host = undefined;
  }
}

export const livePreview = new LivePreview();
