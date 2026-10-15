import { hasCoarsePointer } from '../game/deviceProbe';
import { readChoice, writeStorage } from '../storage';

export const PHONE_LAYOUT_QUERY = '(max-width: 600px), (max-height: 480px)';
export const ON_SCREEN_KEYBOARD_KEY = 'literkowo.onScreenKeyboard';
export const ON_SCREEN_KEYBOARD_CHOICES = ['auto', 'always', 'never'] as const;
export type OnScreenKeyboardChoice = (typeof ON_SCREEN_KEYBOARD_CHOICES)[number];

const DEFAULT_ON_SCREEN_KEYBOARD: OnScreenKeyboardChoice = 'auto';

export function isPhoneLayout(): boolean {
  return window.matchMedia(PHONE_LAYOUT_QUERY).matches;
}

export function readOnScreenKeyboard(): OnScreenKeyboardChoice {
  return readChoice(ON_SCREEN_KEYBOARD_KEY, ON_SCREEN_KEYBOARD_CHOICES, DEFAULT_ON_SCREEN_KEYBOARD);
}

export function saveOnScreenKeyboard(choice: OnScreenKeyboardChoice): void {
  writeStorage(ON_SCREEN_KEYBOARD_KEY, choice);
}

export function usesBuiltInKeyboard(): boolean {
  const choice = readOnScreenKeyboard();
  if (choice === 'never' || !isPhoneLayout()) return false;
  return choice === 'always' || hasCoarsePointer();
}
