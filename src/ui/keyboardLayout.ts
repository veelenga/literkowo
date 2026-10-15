export interface KeyRow {
  keys: string;
  offset: number;
}

export const KEY_ROWS: readonly KeyRow[] = [
  { keys: 'qwertyuiop', offset: 0 },
  { keys: 'asdfghjkl;', offset: 0.3 },
  { keys: 'zxcvbnm,.', offset: 0.8 },
];
