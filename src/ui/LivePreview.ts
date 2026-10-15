import { hatSpec, petSpec } from '../course/shop';
import { hasCoarsePointer } from '../game/deviceProbe';
import type { Equipped } from '../profiles/Profile';
import { prefersReducedMotion } from './dom';
import type { Outfit } from './portraits/outfitStage';
import type { OutfitView } from './portraits/OutfitView';

const LIVE_CLASS = 'is-live';
const PREVIEW_UNAVAILABLE = 'Live character preview is unavailable, keeping the portrait';
const NOTHING_EQUIPPED: Equipped = {};

export function outfitOf(character: string, equipped = NOTHING_EQUIPPED): Outfit {
  return { character, pet: petSpec(equipped.pet), hat: hatSpec(equipped.hat) };
}

class LivePreview {
  private view: Promise<OutfitView | undefined> | undefined;
  private host: HTMLElement | undefined;
  private request = 0;

  show(host: HTMLElement, outfit: Outfit): void {
    this.hide();
    const request = this.request;
    this.host = host;
    void this.loadView().then((view) => {
      if (request !== this.request) return;
      view?.show(host, outfit, () => host.classList.add(LIVE_CLASS));
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

  private loadView(): Promise<OutfitView | undefined> {
    const animate = !prefersReducedMotion() && !hasCoarsePointer();
    this.view ??= import('./portraits/OutfitView')
      .then(({ OutfitView }) => new OutfitView({ animate }))
      .catch((error: unknown) => {
        console.warn(PREVIEW_UNAVAILABLE, error);
        return undefined;
      });
    return this.view;
  }
}

export const livePreview = new LivePreview();
