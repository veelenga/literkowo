import type { UiLanguage } from '../translations';
import { bossPhases } from './bossPhases';
import { fever } from './fever';

export function featureTexts(language: UiLanguage) {
  return {
    fever: fever[language],
    bossPhases: bossPhases[language],
  };
}
