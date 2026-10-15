import type { AnnounceStyle } from '../game/mechanics/Mechanic';
import { el } from './dom';
import './callouts.css';

const ACCENT_VARIABLE = '--callout-accent';
const FEVER_CLASS = 'is-fever';

const STYLE_CLASSES: Record<AnnounceStyle, string> = {
  callout: 'callout',
  banner: 'callout callout-banner',
  warning: 'callout callout-warning',
};

const LIFETIMES_MS: Record<AnnounceStyle, number> = {
  callout: 900,
  banner: 1400,
  warning: 1800,
};

export class Callouts {
  readonly element = el('div', { class: 'callouts' });

  show(text: string, style: AnnounceStyle, accent?: string): void {
    const item = el('div', { class: STYLE_CLASSES[style], text });
    if (accent) item.style.setProperty(ACCENT_VARIABLE, accent);
    this.element.append(item);
    window.setTimeout(() => item.remove(), LIFETIMES_MS[style]);
  }

  setFever(active: boolean): void {
    this.element.classList.toggle(FEVER_CLASS, active);
  }
}
