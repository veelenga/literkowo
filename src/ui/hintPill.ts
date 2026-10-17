import { el } from './dom';
import './hintPill.css';

export const HINT_PILL_LEAVE_MS = 300;
const CLOSE_MARK = '✕';
const LEAVING_CLASS = 'is-leaving';

export interface HintPillOptions {
  readonly text: string;
  readonly closeLabel: string;
  readonly className: string;
  readonly lifetimeMs: number;
  readonly onHide?: () => void;
}

export interface HintPill {
  readonly element: HTMLElement;
  readonly hide: () => void;
}

export function hintPill(options: HintPillOptions): HintPill {
  const { text, closeLabel, className, lifetimeMs, onHide } = options;
  const element = el(
    'button',
    { class: `hint-pill ${className}`, type: 'button', title: closeLabel, onClick: () => hide() },
    el('span', { text }),
    el('span', { class: 'hint-pill-close', 'aria-hidden': 'true', text: CLOSE_MARK }),
  );
  let timer = window.setTimeout(leave, lifetimeMs);

  function leave(): void {
    element.classList.add(LEAVING_CLASS);
    timer = window.setTimeout(hide, HINT_PILL_LEAVE_MS);
  }

  function hide(): void {
    window.clearTimeout(timer);
    element.remove();
    onHide?.();
  }

  return { element, hide };
}
