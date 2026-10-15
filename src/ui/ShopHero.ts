import { hatSpec, petSpec } from '../course/shop';
import { hasCoarsePointer } from '../game/deviceProbe';
import { i18n } from '../i18n/i18n';
import type { Profile } from '../profiles/Profile';
import { characterAvatar } from './CharacterAvatar';
import { el, prefersReducedMotion } from './dom';
import type { OutfitView } from './portraits/OutfitView';

const LIVE_CLASS = 'is-live';
const PREVIEW_UNAVAILABLE = 'Outfit preview is unavailable, keeping the portrait';

export class ShopHero {
  readonly element: HTMLElement;
  private readonly stage = el('div', { class: 'shop-hero-stage' });
  private readonly view = loadView();
  private host: HTMLElement | undefined;
  private skin: string | undefined;
  private disposed = false;

  constructor() {
    this.element = el(
      'aside',
      { class: 'panel shop-hero' },
      el('h2', { class: 'shop-hero-title', text: i18n.t.features.shop.hero }),
      this.stage,
    );
  }

  show({ avatar, equipped }: Profile): void {
    const host = this.hostFor(avatar);
    const outfit = { character: avatar, pet: petSpec(equipped.pet), hat: hatSpec(equipped.hat) };
    void this.view.then((view) => {
      if (!this.disposed) view?.show(host, outfit, () => host.classList.add(LIVE_CLASS));
    });
  }

  dispose(): void {
    this.disposed = true;
    void this.view.then((view) => view?.dispose());
  }

  private hostFor(skin: string): HTMLElement {
    if (this.host && this.skin === skin) return this.host;
    this.skin = skin;
    this.host = characterAvatar(skin);
    this.stage.replaceChildren(this.host);
    return this.host;
  }
}

function loadView(): Promise<OutfitView | undefined> {
  const animate = !prefersReducedMotion() && !hasCoarsePointer();
  return import('./portraits/OutfitView')
    .then(({ OutfitView }) => new OutfitView({ animate }))
    .catch((error: unknown) => {
      console.warn(PREVIEW_UNAVAILABLE, error);
      return undefined;
    });
}
