import type { UiLanguage } from '../translations';
import { bossPhases } from './bossPhases';
import { enemyTypes } from './enemyTypes';
import { fever } from './fever';
import { mergeEnemies } from './mergeEnemies';
import { powerWords } from './powerWords';
import { progression } from './progression';
import { quality } from './quality';
import { touch } from './touch';

export function featureTexts(language: UiLanguage) {
  return {
    fever: fever[language],
    powerWords: powerWords[language],
    mergeEnemies: mergeEnemies[language],
    bossPhases: bossPhases[language],
    enemyTypes: enemyTypes[language],
    quality: quality[language],
    touch: touch[language],
    progression: progression[language],
  };
}
