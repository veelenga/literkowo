import { readChoice, writeStorage } from '../storage';
import { DEFAULT_UI_LANGUAGE, UI_LANGUAGES, type UiLanguage } from './languages';
import { translations, type Translation } from './translations';

export const UI_LANGUAGE_KEY = 'literkowo.uiLanguage';

export function readUiLanguage(): UiLanguage {
  return readChoice(UI_LANGUAGE_KEY, UI_LANGUAGES, DEFAULT_UI_LANGUAGE);
}

class I18n {
  private language: UiLanguage = readUiLanguage();

  get current(): UiLanguage {
    return this.language;
  }

  get t(): Translation {
    return translations[this.language];
  }

  set(language: UiLanguage): void {
    this.language = language;
    writeStorage(UI_LANGUAGE_KEY, language);
    document.documentElement.lang = language;
  }
}

export const i18n = new I18n();
