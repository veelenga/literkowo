import '../../../ui/powerWords.css';
import { i18n } from '../../../i18n/i18n';
import type { PowerWord } from './choice';
import { POWER_SPECS, powerAccent } from './powers';

const LABEL_CLASS = 'is-power-word';
const ACCENT_VARIABLE = '--power-accent';

export function decoratePowerLabel(label: HTMLElement, { power, isReal }: PowerWord): HTMLElement {
  label.classList.add(LABEL_CLASS);
  label.dataset.power = power;
  label.title = i18n.t.features.powerWords.powers[power];
  label.style.setProperty(ACCENT_VARIABLE, powerAccent(power));
  if (!isReal) label.dataset.powerIcon = POWER_SPECS[power].icon;
  return label;
}

export function bannerFor({ power, word, isReal }: PowerWord): string {
  return isReal ? word : `${POWER_SPECS[power].icon} ${word}`;
}
