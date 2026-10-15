import { el } from './dom';

export const ENTER_LABEL = '⏎';
export const ESCAPE_LABEL = 'Esc';

const HINT_CLASS = 'kbd kbd-hint';
const PRIMARY_CLASS = 'kbd-on-primary';

export function shortcutHint(label: string): HTMLElement {
  return el('kbd', { class: HINT_CLASS, text: label });
}

export function primaryHint(): HTMLElement {
  return el('kbd', { class: `${HINT_CLASS} ${PRIMARY_CLASS}`, text: ENTER_LABEL });
}
