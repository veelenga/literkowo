import type { OnScreenKeyboardChoice } from '../../ui/formFactor';
import type { ReducedMotionChoice } from '../../ui/motionPreference';
import type { UiLanguage } from '../translations';

interface ChoiceTexts<T extends string> {
  title: string;
  hint: string;
  options: Record<T, string>;
}

interface SettingsTexts {
  open: string;
  title: string;
  back: string;
  effects: string;
  music: string;
  language: string;
  languages: Record<UiLanguage, string>;
  keyboard: ChoiceTexts<OnScreenKeyboardChoice>;
  motion: ChoiceTexts<ReducedMotionChoice>;
}

const LANGUAGE_NAMES: Record<UiLanguage, string> = { pl: 'Polski', uk: 'Українська' };

const pl: SettingsTexts = {
  open: 'Ustawienia',
  title: 'Ustawienia',
  back: 'Wróć',
  effects: 'Efekty dźwiękowe',
  music: 'Muzyka',
  language: 'Język gry',
  languages: LANGUAGE_NAMES,
  keyboard: {
    title: 'Klawiatura na ekranie',
    hint: 'Na telefonie. Zadziała od następnego poziomu',
    options: { auto: 'Auto', always: 'Zawsze', never: 'Nigdy' },
  },
  motion: {
    title: 'Mniej animacji',
    hint: 'Auto słucha ustawień urządzenia',
    options: { auto: 'Auto', always: 'Zawsze' },
  },
};

const uk: SettingsTexts = {
  open: 'Налаштування',
  title: 'Налаштування',
  back: 'Назад',
  effects: 'Звукові ефекти',
  music: 'Музика',
  language: 'Мова гри',
  languages: LANGUAGE_NAMES,
  keyboard: {
    title: 'Клавіатура на екрані',
    hint: 'На телефоні. Діятиме з наступного рівня',
    options: { auto: 'Авто', always: 'Завжди', never: 'Ніколи' },
  },
  motion: {
    title: 'Менше анімації',
    hint: 'Авто враховує налаштування пристрою',
    options: { auto: 'Авто', always: 'Завжди' },
  },
};

export const settings = { pl, uk };
