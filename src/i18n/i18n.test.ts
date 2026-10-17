import { afterEach, describe, expect, it } from 'vitest';
import { removeStorage, writeStorage } from '../storage';
import { readUiLanguage, UI_LANGUAGE_KEY } from './i18n';
import { DEFAULT_UI_LANGUAGE, UI_LANGUAGES } from './languages';

const UNKNOWN_LANGUAGE = 'xx';

describe('interface language choice', () => {
  afterEach(() => removeStorage(UI_LANGUAGE_KEY));

  it('uses the default language when nothing is saved', () => {
    expect(readUiLanguage()).toBe(DEFAULT_UI_LANGUAGE);
  });

  it('falls back to the default language when the saved one is not offered', () => {
    writeStorage(UI_LANGUAGE_KEY, UNKNOWN_LANGUAGE);
    expect(readUiLanguage()).toBe(DEFAULT_UI_LANGUAGE);
  });

  it.each(UI_LANGUAGES)('restores the saved language %s', (language) => {
    writeStorage(UI_LANGUAGE_KEY, language);
    expect(readUiLanguage()).toBe(language);
  });
});
