import type { UiLanguage } from '../translations';
import { bossPhases } from './bossPhases';
import { fever } from './fever';
import { mergeEnemies } from './mergeEnemies';

export function featureTexts(language: UiLanguage) {
  return {
    fever: fever[language],
    mergeEnemies: mergeEnemies[language],
    bossPhases: bossPhases[language],
  };
}
