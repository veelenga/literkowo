import { i18n } from '../i18n/i18n';
import { el } from './dom';
import { usesBuiltInKeyboard } from './formFactor';
import { KEYBOARD_OPEN_ATTRIBUTE } from './keyboardFit';
import { TypedText } from './typedText';
import './touchTyping.css';

const PHYSICAL_KEYBOARD_ATTRIBUTE = 'data-physical-keyboard';

export class TouchTyping {
  private readonly typed = new TypedText();
  private readonly root = document.documentElement;
  private readonly input = el('input', {
    class: 'touch-input',
    type: 'text',
    inputmode: 'text',
    autocomplete: 'off',
    autocapitalize: 'off',
    autocorrect: 'off',
    spellcheck: 'false',
    enterkeyhint: 'done',
    'aria-label': i18n.t.features.touch.typingField,
    'data-1p-ignore': 'true',
  });
  private readonly pill = el('button', {
    class: 'type-pill',
    type: 'button',
    text: i18n.t.features.touch.tapToType,
  });

  constructor(
    private readonly stage: HTMLElement,
    private readonly onChar: (char: string) => void,
    private readonly builtInKeyboard: () => boolean = usesBuiltInKeyboard,
  ) {
    stage.append(this.input, this.pill);
    stage.addEventListener('click', this.onStageTap);
    this.input.addEventListener('input', this.onInput);
    this.input.addEventListener('compositionend', this.clear);
    window.addEventListener('keydown', this.noticePhysicalKeyboard, true);
  }

  private readonly focus = (): void => {
    if (document.activeElement === this.input && this.keyboardOpen) return;
    this.input.blur();
    this.input.focus({ preventScroll: true });
  };

  readonly toggleNativeKeyboard = (): void => {
    if (this.keyboardOpen) this.input.blur();
    else this.focus();
  };

  refocus(): void {
    if (!this.builtInKeyboard()) this.focus();
  }

  dispose(): void {
    this.stage.removeEventListener('click', this.onStageTap);
    window.removeEventListener('keydown', this.noticePhysicalKeyboard, true);
    this.input.blur();
  }

  private readonly onStageTap = (): void => {
    if (!this.builtInKeyboard()) this.focus();
  };

  private get keyboardOpen(): boolean {
    return this.root.hasAttribute(KEYBOARD_OPEN_ATTRIBUTE);
  }

  private readonly onInput = (event: Event): void => {
    const composing = event instanceof InputEvent && event.isComposing;
    const chars = this.typed.read(this.input.value, composing);
    if (!composing) this.clear();
    chars.forEach((char) => this.onChar(char));
  };

  private readonly clear = (): void => {
    this.input.value = '';
    this.typed.reset();
  };

  private readonly noticePhysicalKeyboard = (event: KeyboardEvent): void => {
    if (this.keyboardOpen || event.key.length !== 1) return;
    this.root.setAttribute(PHYSICAL_KEYBOARD_ATTRIBUTE, '');
  };
}
