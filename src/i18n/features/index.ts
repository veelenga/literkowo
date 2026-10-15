import type { UiLanguage } from '../translations';
import { bossPhases } from './bossPhases';
import { fever } from './fever';
import { mergeEnemies } from './mergeEnemies';
import { powerWords } from './powerWords';

export function featureTexts(language: UiLanguage) {
  return {
    fever: fever[language],
    powerWords: powerWords[language],
    mergeEnemies: mergeEnemies[language],
    bossPhases: bossPhases[language],
  };
}
