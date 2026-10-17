import { el } from './dom';

export const ENTER_LABEL = '⏎';
export const ESCAPE_LABEL = 'Esc';
export const PRIMARY_BUTTON_CLASS = 'button button-primary button-large';

const HINT_CLASS = 'kbd kbd-hint';
const PRIMARY_CLASS = 'kbd-on-primary';

export function shortcutHint(label: string): HTMLElement {
  return el('kbd', { class: HINT_CLASS, text: label });
}

export function primaryHint(): HTMLElement {
  return el('kbd', { class: `${HINT_CLASS} ${PRIMARY_CLASS}`, text: ENTER_LABEL });
}

export function primaryButton(
  label: string,
  onClick: () => void,
  extraClass?: string,
): HTMLElement {
  const className = extraClass ? `${PRIMARY_BUTTON_CLASS} ${extraClass}` : PRIMARY_BUTTON_CLASS;
  return el('button', { class: className, onClick }, label, primaryHint());
}
