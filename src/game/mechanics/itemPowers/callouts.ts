import { percentOf, type ItemPower, type PowerKind } from '../../../course/powers';
import { format } from '../../../i18n/format';
import { i18n } from '../../../i18n/i18n';

export function powerCallout(kind: PowerKind): string {
  return i18n.t.features.shop.powers.callouts[kind];
}

export function boostCallout(power: ItemPower): string {
  return format(powerCallout(power.kind), { percent: percentOf(power) });
}
