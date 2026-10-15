import type { UiLanguage } from '../translations';
import { fever } from './fever';

export function featureTexts(language: UiLanguage) {
  return {
    fever: fever[language],
  };
}
