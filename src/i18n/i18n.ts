import { translations, type Translation, type UiLanguage } from './translations';

const STORAGE_KEY = 'literkowo.uiLanguage';
const DEFAULT_LANGUAGE: UiLanguage = 'pl';

class I18n {
  private language: UiLanguage = this.load();
  private listeners = new Set<() => void>();

  get current(): UiLanguage {
    return this.language;
  }

  get t(): Translation {
    return translations[this.language];
  }

  set(language: UiLanguage): void {
    this.language = language;
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    this.listeners.forEach((listener) => listener());
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private load(): UiLanguage {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'uk' ? 'uk' : DEFAULT_LANGUAGE;
  }
}

export const i18n = new I18n();
