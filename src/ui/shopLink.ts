import { i18n } from '../i18n/i18n';
import { el } from './dom';
import './shopLink.css';
import { shopIcon } from './shopParts';

export function shopLink(onOpen: () => void, className = ''): HTMLButtonElement {
  const label = i18n.t.features.shop.open;
  return el(
    'button',
    {
      class: `button button-ghost shop-link ${className}`.trim(),
      type: 'button',
      title: label,
      'aria-label': label,
      onClick: onOpen,
    },
    shopIcon('bag', 'shop-link-icon'),
    el('span', { class: 'shop-link-label', text: label }),
  );
}
