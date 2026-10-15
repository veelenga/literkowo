import { RIGHT_ALT_KEY } from './rightAltLatch';

export const SPACE_KEY = ' ';

export interface KeyRow {
  readonly keys: readonly string[];
  readonly offset: number;
}

export interface KeyboardLayout {
  readonly name: KeyboardLayoutName;
  readonly rows: readonly KeyRow[];
  readonly capitals: boolean;
}

export type KeyboardLayoutName = 'full' | 'compact';

const TOP_ROW = [...'qwertyuiop'];
const HOME_ROW = [...'asdfghjkl;'];
const BOTTOM_ROW = [...'zxcvbnm,.'];

export const KEY_ROWS: readonly KeyRow[] = [
  { keys: TOP_ROW, offset: 0 },
  { keys: HOME_ROW, offset: 0.3 },
  { keys: BOTTOM_ROW, offset: 0.8 },
];

export const KEYBOARD_LAYOUTS: Record<KeyboardLayoutName, KeyboardLayout> = {
  full: {
    name: 'full',
    capitals: true,
    rows: [...KEY_ROWS, { keys: [SPACE_KEY, RIGHT_ALT_KEY], offset: 2.7 }],
  },
  compact: {
    name: 'compact',
    capitals: false,
    rows: [
      { keys: TOP_ROW, offset: 0 },
      { keys: HOME_ROW, offset: 0 },
      { keys: [...BOTTOM_ROW, RIGHT_ALT_KEY], offset: 0 },
    ],
  },
};
