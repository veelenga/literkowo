import { hasCoarsePointer } from '../game/deviceProbe';

export const PHONE_LAYOUT_QUERY = '(max-width: 600px), (max-height: 480px)';

export function isPhoneLayout(): boolean {
  return window.matchMedia(PHONE_LAYOUT_QUERY).matches;
}

export function usesBuiltInKeyboard(): boolean {
  return hasCoarsePointer() && isPhoneLayout();
}
