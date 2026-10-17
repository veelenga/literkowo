import { i18n } from '../i18n/i18n';
import { el } from './dom';
import { hintPill, type HintPill } from './hintPill';
import './notice.css';

export const NOTICE_LIFETIME_MS = 8000;
const NOTICE_PILL_CLASS = 'notice-pill';

export class Notice {
  readonly element = el('div', { class: 'notice', role: 'status' });
  private current: HintPill | undefined;

  show(text: string): void {
    this.current?.hide();
    this.current = hintPill({
      text,
      closeLabel: i18n.t.features.notice.close,
      className: NOTICE_PILL_CLASS,
      lifetimeMs: NOTICE_LIFETIME_MS,
    });
    this.element.append(this.current.element);
  }
}
