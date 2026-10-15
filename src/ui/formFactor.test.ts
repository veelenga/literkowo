import { afterEach, describe, expect, it, vi } from 'vitest';
import { removeStorage } from '../storage';
import {
  ON_SCREEN_KEYBOARD_KEY,
  PHONE_LAYOUT_QUERY,
  readOnScreenKeyboard,
  saveOnScreenKeyboard,
  usesBuiltInKeyboard,
  type OnScreenKeyboardChoice,
} from './formFactor';

const COARSE_POINTER_QUERY = '(pointer: coarse)';

interface Device {
  readonly phone: boolean;
  readonly touch: boolean;
}

const TOUCH_PHONE: Device = { phone: true, touch: true };
const MOUSE_PHONE: Device = { phone: true, touch: false };
const TABLET: Device = { phone: false, touch: true };

function useDevice({ phone, touch }: Device): void {
  const matches = new Map([
    [PHONE_LAYOUT_QUERY, phone],
    [COARSE_POINTER_QUERY, touch],
  ]);
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: matches.get(query) ?? false }));
}

function builtInWith(choice: OnScreenKeyboardChoice, device: Device): boolean {
  saveOnScreenKeyboard(choice);
  useDevice(device);
  return usesBuiltInKeyboard();
}

describe('on screen keyboard preference', () => {
  afterEach(() => {
    removeStorage(ON_SCREEN_KEYBOARD_KEY);
    vi.unstubAllGlobals();
  });

  it('is automatic until a choice is saved', () => {
    expect(readOnScreenKeyboard()).toBe('auto');
    saveOnScreenKeyboard('never');
    expect(readOnScreenKeyboard()).toBe('never');
  });

  it('automatically uses the built in keyboard on touch phones only', () => {
    expect(builtInWith('auto', TOUCH_PHONE)).toBe(true);
    expect(builtInWith('auto', MOUSE_PHONE)).toBe(false);
    expect(builtInWith('auto', TABLET)).toBe(false);
  });

  it('always uses it on a phone sized screen, even without touch', () => {
    expect(builtInWith('always', MOUSE_PHONE)).toBe(true);
    expect(builtInWith('always', TABLET)).toBe(false);
  });

  it('never uses it when turned off', () => {
    expect(builtInWith('never', TOUCH_PHONE)).toBe(false);
  });
});
