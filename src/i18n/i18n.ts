import { readStorage, writeStorage } from '../storage';
import { translations, type Translation, type UiLanguage } from './translations';

const STORAGE_KEY = 'literkowo.uiLanguage';
const DEFAULT_LANGUAGE: UiLanguage = 'pl';

class I18n {
  private language: UiLanguage = this.load();

  get current(): UiLanguage {
    return this.language;
  }

  get t(): Translation {
    return translations[this.language];
  }

  set(language: UiLanguage): void {
    this.language = language;
    writeStorage(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }

  private load(): UiLanguage {
    return readStorage(STORAGE_KEY) === 'uk' ? 'uk' : DEFAULT_LANGUAGE;
  }
}

export const i18n = new I18n();
