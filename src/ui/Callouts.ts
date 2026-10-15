import type { CalloutKind } from '../game/combo';
import { i18n } from '../i18n/i18n';
import { el } from './dom';

const CALLOUT_LIFETIME_MS = 900;
const FEVER_BANNER_LIFETIME_MS = 1400;

export class Callouts {
  readonly element = el('div', { class: 'callouts' });

  show(kind: CalloutKind): void {
    this.pop(i18n.t.callouts[kind], `callout callout-${kind}`, CALLOUT_LIFETIME_MS);
  }

  setFever(active: boolean): void {
    this.element.classList.toggle('is-fever', active);
    if (active) this.pop(i18n.t.fever, 'callout callout-fever', FEVER_BANNER_LIFETIME_MS);
  }

  private pop(text: string, className: string, lifetime: number): void {
    const item = el('div', { class: className, text });
    this.element.append(item);
    window.setTimeout(() => item.remove(), lifetime);
  }
}
