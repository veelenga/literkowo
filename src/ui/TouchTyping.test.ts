import { afterEach, describe, expect, it, vi } from 'vitest';
import { KEYBOARD_OPEN_ATTRIBUTE } from './keyboardFit';
import { TouchTyping } from './TouchTyping';

const PHYSICAL_KEYBOARD_ATTRIBUTE = 'data-physical-keyboard';
const created: TouchTyping[] = [];

function setup({ builtInKeyboard = false } = {}) {
  const stage = document.createElement('div');
  document.body.append(stage);
  const onChar = vi.fn();
  const touch = new TouchTyping(stage, onChar, () => builtInKeyboard);
  created.push(touch);
  const input = stage.querySelector('input');
  if (!input) throw new Error('Missing touch input');
  return { stage, onChar, touch, input };
}

function type(input: HTMLInputElement, value: string, isComposing = false): void {
  input.value = value;
  input.dispatchEvent(new InputEvent('input', { isComposing }));
}

describe('TouchTyping', () => {
  afterEach(() => {
    created.splice(0).forEach((touch) => touch.dispose());
    document.body.replaceChildren();
    document.documentElement.removeAttribute(PHYSICAL_KEYBOARD_ATTRIBUTE);
    document.documentElement.removeAttribute(KEYBOARD_OPEN_ATTRIBUTE);
  });

  it('keeps the native keyboard quiet about corrections', () => {
    const { input } = setup();
    expect(input.getAttribute('inputmode')).toBe('text');
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.getAttribute('autocapitalize')).toBe('off');
    expect(input.getAttribute('autocorrect')).toBe('off');
    expect(input.getAttribute('spellcheck')).toBe('false');
    expect(input.getAttribute('enterkeyhint')).toBe('done');
    expect(input.closest('form')).toBeNull();
  });

  it('types each inserted character and clears the field', () => {
    const { input, onChar } = setup();
    type(input, 'f');
    type(input, 'j');
    expect(onChar.mock.calls).toEqual([['f'], ['j']]);
    expect(input.value).toBe('');
  });

  it('types only new characters while the native keyboard composes', () => {
    const { input, onChar } = setup();
    type(input, 'd', true);
    type(input, 'dk', true);
    expect(onChar.mock.calls).toEqual([['d'], ['k']]);
    input.dispatchEvent(new CompositionEvent('compositionend'));
    expect(input.value).toBe('');
  });

  it('ignores backspace', () => {
    const { input, onChar } = setup();
    type(input, 'ab', true);
    onChar.mockClear();
    type(input, 'a', true);
    expect(onChar).not.toHaveBeenCalled();
  });

  it('focuses the field when the stage is tapped', () => {
    const { stage, input } = setup();
    stage.click();
    expect(document.activeElement).toBe(input);
  });

  it('leaves the native keyboard closed on a stage tap while the built in keyboard is on', () => {
    const { stage, input } = setup({ builtInKeyboard: true });
    stage.click();
    expect(document.activeElement).not.toBe(input);
  });

  it('opens and closes the native keyboard on request', () => {
    const { touch, input } = setup({ builtInKeyboard: true });
    touch.toggleNativeKeyboard();
    expect(document.activeElement).toBe(input);
    document.documentElement.setAttribute(KEYBOARD_OPEN_ATTRIBUTE, '');
    touch.toggleNativeKeyboard();
    expect(document.activeElement).not.toBe(input);
  });

  it('focuses the field again on resume only without the built in keyboard', () => {
    const tablet = setup();
    tablet.touch.refocus();
    expect(document.activeElement).toBe(tablet.input);
    const phone = setup({ builtInKeyboard: true });
    phone.touch.refocus();
    expect(document.activeElement).not.toBe(phone.input);
  });

  it('notices a physical keyboard while the native keyboard is closed', () => {
    setup();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
    expect(document.documentElement.hasAttribute(PHYSICAL_KEYBOARD_ATTRIBUTE)).toBe(true);
  });

  it('does not mistake the native keyboard for a physical one', () => {
    setup();
    document.documentElement.setAttribute(KEYBOARD_OPEN_ATTRIBUTE, '');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Unidentified' }));
    expect(document.documentElement.hasAttribute(PHYSICAL_KEYBOARD_ATTRIBUTE)).toBe(false);
  });

  it('stops listening after dispose', () => {
    const { touch } = setup();
    touch.dispose();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
    expect(document.documentElement.hasAttribute(PHYSICAL_KEYBOARD_ATTRIBUTE)).toBe(false);
  });
});
