import { FINGER_COLORS, baseKey, fingerFor, needsRightAlt } from '../course/fingers';
import { i18n } from '../i18n/i18n';
import { el } from './dom';

const ROWS = ['qwertyuiop', 'asdfghjkl;', 'zxcvbnm,.'];
const SPACE = ' ';
const ALT_KEY = 'alt';

export class KeyboardHint {
  readonly element: HTMLElement;
  private readonly keys = new Map<string, HTMLElement>();
  private readonly hint = el('div', { class: 'key-hint' });
  private highlighted: HTMLElement[] = [];

  constructor() {
    this.element = el('div', { class: 'keyboard' }, this.hint, ...ROWS.map((row) => this.row(row)));
    this.element.append(this.bottomRow());
  }

  show(char: string | undefined): void {
    this.highlighted.forEach((key) => key.classList.remove('is-next'));
    this.highlighted = [];
    if (!char) return this.setHint('');
    const key = this.keys.get(baseKey(char));
    if (!key) return this.setHint('');
    this.highlight(key);
    if (needsRightAlt(char)) this.highlight(this.keys.get(ALT_KEY));
    this.setHint(this.describe(char));
  }

  private describe(char: string): string {
    const t = i18n.t;
    const finger = fingerFor(char);
    const fingerName = finger ? t.fingers[finger] : '';
    const prefix = needsRightAlt(char) ? `${t.rightAlt} + ` : '';
    return `${t.nextKey}: ${prefix}${char.toUpperCase()} · ${fingerName}`;
  }

  private highlight(key: HTMLElement | undefined): void {
    if (!key) return;
    key.classList.add('is-next');
    this.highlighted.push(key);
  }

  private setHint(text: string): void {
    this.hint.textContent = text;
  }

  private row(chars: string): HTMLElement {
    return el('div', { class: 'key-row' }, ...[...chars].map((char) => this.key(char)));
  }

  private bottomRow(): HTMLElement {
    const space = this.key(SPACE, 'key key-space');
    const alt = this.key(ALT_KEY, 'key key-alt', 'Alt');
    return el('div', { class: 'key-row' }, space, alt);
  }

  private key(id: string, className = 'key', label = id.toUpperCase()): HTMLElement {
    const finger = fingerFor(id);
    const color = finger ? FINGER_COLORS[finger] : FINGER_COLORS.thumb;
    const key = el('div', { class: className, text: label, style: `--finger: ${color}` });
    this.keys.set(id, key);
    return key;
  }
}
