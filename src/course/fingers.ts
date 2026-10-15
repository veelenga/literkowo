export const FINGERS = [
  'leftPinky',
  'leftRing',
  'leftMiddle',
  'leftIndex',
  'rightIndex',
  'rightMiddle',
  'rightRing',
  'rightPinky',
  'thumb',
] as const;

export type Finger = (typeof FINGERS)[number];

const FINGER_KEYS: Record<Finger, string> = {
  leftPinky: 'qaz1`',
  leftRing: 'wsx2',
  leftMiddle: 'edc3',
  leftIndex: 'rfvtgb45',
  rightIndex: 'yhnujm67',
  rightMiddle: 'ik,8',
  rightRing: 'ol.9',
  rightPinky: "p;/0-=[]'",
  thumb: ' ',
};

export const POLISH_BASE_KEY: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'x',
  ż: 'z',
};

export const FINGER_COLORS: Record<Finger, string> = {
  leftPinky: '#f472b6',
  leftRing: '#fb923c',
  leftMiddle: '#facc15',
  leftIndex: '#4ade80',
  rightIndex: '#2dd4bf',
  rightMiddle: '#60a5fa',
  rightRing: '#a78bfa',
  rightPinky: '#f472b6',
  thumb: '#94a3b8',
};

export function baseKey(char: string): string {
  const lower = char.toLowerCase();
  return POLISH_BASE_KEY[lower] ?? lower;
}

export function needsRightAlt(char: string): boolean {
  return char.toLowerCase() in POLISH_BASE_KEY;
}

export function fingerFor(char: string): Finger | undefined {
  const key = baseKey(char);
  return FINGERS.find((finger) => FINGER_KEYS[finger].includes(key));
}
