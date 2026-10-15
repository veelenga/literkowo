import type { Power } from '../powers';
import { FreezeSpell } from './Freeze';
import { QuakeSpell } from './Quake';
import { ShieldSpell } from './Shield';
import type { Spell, SpellContext } from './Spell';
import { StormSpell } from './Storm';

export function createSpells(context: SpellContext): Record<Power, Spell> {
  return {
    freeze: new FreezeSpell(context),
    storm: new StormSpell(context),
    quake: new QuakeSpell(context),
    shield: new ShieldSpell(context),
  };
}
