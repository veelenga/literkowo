import { baseKey, fingerFor, needsRightAlt } from '../course/fingers';
import { i18n } from '../i18n/i18n';
import { el, fingerColor, type Child } from './dom';

interface KeyRow {
  keys: string;
  offset: number;
}

const ROWS: KeyRow[] = [
  { keys: 'qwertyuiop', offset: 0 },
  { keys: 'asdfghjkl;', offset: 0.3 },
  { keys: 'zxcvbnm,.', offset: 0.8 },
];
const SPACE_ROW_OFFSET = 2.7;
const HOME_BUMP_KEYS = new Set(['f', 'j']);
const SPACE = ' ';
const ALT_KEY = 'alt';
const ALT_LABEL = 'Alt';

export class KeyboardHint {
  readonly element: HTMLElement;
  private readonly keys = new Map<string, HTMLElement>();
  private readonly hintAlt = el('span', { class: 'key-hint-alt' });
  private readonly hintKey = el('span', { class: 'key-hint-cap' });
  private readonly hintFinger = el('span', { class: 'key-hint-finger' });
  private readonly hint = el(
    'div',
    { class: 'key-hint is-empty' },
    el('span', { class: 'key-hint-label', text: i18n.t.nextKey }),
    this.hintAlt,
    this.hintKey,
    this.hintFinger,
  );
  private highlighted: HTMLElement[] = [];
  private current: string | undefined;

  constructor() {
    this.element = el(
      'div',
      { class: 'keyboard' },
      this.hint,
      ...ROWS.map((row) => this.row(row)),
      this.bottomRow(),
    );
  }

  show(char: string | undefined): void {
    if (char === this.current) return;
    this.current = char;
    this.highlighted.forEach((key) => key.classList.remove('is-next'));
    this.highlighted = [];
    const key = char ? this.keys.get(baseKey(char)) : undefined;
    if (!char || !key) return this.setHint(undefined);
    this.highlight(key);
    if (needsRightAlt(char)) this.highlight(this.keys.get(ALT_KEY));
    this.setHint(char);
  }

  private setHint(char: string | undefined): void {
    this.hint.classList.toggle('is-empty', !char);
    if (!char) return;
    const t = i18n.t;
    const finger = fingerFor(char);
    this.hint.style.setProperty('--finger', fingerColor(finger));
    this.hintAlt.hidden = !needsRightAlt(char);
    this.hintAlt.textContent = `${t.rightAlt} +`;
    this.hintKey.textContent = char.toUpperCase();
    this.hintFinger.textContent = finger ? t.fingers[finger] : '';
  }

  private highlight(key: HTMLElement | undefined): void {
    if (!key) return;
    key.classList.add('is-next');
    this.highlighted.push(key);
  }

  private row({ keys, offset }: KeyRow): HTMLElement {
    return el(
      'div',
      { class: 'key-row', style: `--offset: ${offset}` },
      ...[...keys].map((char) => this.key(char, 'key', char.toUpperCase())),
    );
  }

  private bottomRow(): HTMLElement {
    const space = this.key(SPACE, 'key key-space', '');
    const alt = this.key(
      ALT_KEY,
      'key key-alt',
      el('small', { text: i18n.t.rightShort }),
      el('span', { text: ALT_LABEL }),
    );
    alt.title = i18n.t.rightAlt;
    return el('div', { class: 'key-row', style: `--offset: ${SPACE_ROW_OFFSET}` }, space, alt);
  }

  private key(id: string, className: string, ...label: Child[]): HTMLElement {
    const classes = HOME_BUMP_KEYS.has(id) ? `${className} has-bump` : className;
    const key = el(
      'div',
      { class: classes, style: `--finger: ${fingerColor(fingerFor(id))}` },
      ...label,
    );
    this.keys.set(id, key);
    return key;
  }
}
