import type { UiLanguage } from '../translations';
import { bombers, speedSurge, twins } from './actionEvents';
import { bossPhases } from './bossPhases';
import { enemyTypes } from './enemyTypes';
import { fever } from './fever';
import { mastery } from './mastery';
import { mergeEnemies } from './mergeEnemies';
import { powerWords } from './powerWords';
import { progression } from './progression';
import { quality } from './quality';
import { touch } from './touch';
import { waveEvents } from './waveEvents';

export function featureTexts(language: UiLanguage) {
  return {
    fever: fever[language],
    powerWords: powerWords[language],
    mergeEnemies: mergeEnemies[language],
    bossPhases: bossPhases[language],
    enemyTypes: enemyTypes[language],
    speedSurge: speedSurge[language],
    bombers: bombers[language],
    twins: twins[language],
    quality: quality[language],
    touch: touch[language],
    progression: progression[language],
    mastery: mastery[language],
    waveEvents: waveEvents[language],
  };
}
