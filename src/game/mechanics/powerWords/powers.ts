import * as THREE from 'three';
import type { WordLanguage } from '../../../profiles/Profile';
import type { PhaseKind } from '../../LevelPlan';

export const POWERS = ['freeze', 'storm', 'quake', 'shield'] as const;
export type Power = (typeof POWERS)[number];

export interface PowerSpec {
  readonly icon: string;
  readonly color: number;
  readonly words: Readonly<Record<WordLanguage, readonly string[]>>;
}

export const POWER_SPECS: Record<Power, PowerSpec> = {
  freeze: {
    icon: '❄️',
    color: 0x8fdcff,
    words: { pl: ['lód', 'mróz', 'zima', 'szron'], en: ['ice', 'frost', 'snow'] },
  },
  storm: {
    icon: '⚡',
    color: 0xc9a6ff,
    words: { pl: ['burza', 'grom', 'piorun', 'błysk'], en: ['storm', 'bolt', 'spark'] },
  },
  quake: {
    icon: '💥',
    color: 0xffa95e,
    words: {
      pl: ['wstrząs', 'tąpnięcie', 'trzęsienie', 'huk'],
      en: ['quake', 'rumble', 'shake'],
    },
  },
  shield: {
    icon: '🛡️',
    color: 0x7cf5a8,
    words: { pl: ['tarcza', 'osłona', 'mur', 'zbroja'], en: ['shield', 'wall', 'guard'] },
  },
};

const BOSS_POWERS: readonly Power[] = POWERS.filter((power) => power !== 'storm');

export function powersFor(phase: PhaseKind): readonly Power[] {
  return phase === 'boss' ? BOSS_POWERS : POWERS;
}

export function powerColor(power: Power): THREE.Color {
  return new THREE.Color(POWER_SPECS[power].color);
}

export function powerAccent(power: Power): string {
  return `#${powerColor(power).getHexString()}`;
}
