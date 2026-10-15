import { el } from './dom';
import './closeButton.css';

const CLOSE_MARK = '✕';

export function closeButton(label: string, onClose: () => void): HTMLButtonElement {
  return el(
    'button',
    { class: 'close-button', type: 'button', title: label, 'aria-label': label, onClick: onClose },
    el('span', { class: 'close-button-mark', 'aria-hidden': 'true', text: CLOSE_MARK }),
  );
}
