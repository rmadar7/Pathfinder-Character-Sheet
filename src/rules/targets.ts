// What a bonus can apply to, in the words the player sees, grouped the way the sheet is.
// Every key here is read by derive.ts / skills.ts / spells.ts, so a bonus picked from this
// list always moves a number. (v36 offered "Speed", which nothing read: a bonus to it did
// nothing, silently. Add a key here only together with the code that applies it.)

import { SK } from './skills';
import { STACKING_TYPES } from './stacking';

export interface TargetGroup { g: string; items: [string, string][] }

export const TARGET_GROUPS: TargetGroup[] = [
  { g: 'Defence', items: [['ac', 'Armor Class'], ['cmd', 'CMD (resisting grapples, trips…)']] },
  { g: 'Saving throws', items: [['saves', 'All saving throws'], ['fort', 'Fortitude'], ['ref', 'Reflex'], ['will', 'Will']] },
  { g: 'Attacks', items: [['atk', 'All attack rolls'], ['melee', 'Melee attacks'], ['ranged', 'Ranged and ray attacks'], ['cmb', 'CMB (grapple, trip…)']] },
  { g: 'Spellcasting', items: [['cl', 'Caster level'], ['conc', 'Concentration'], ['dc', 'Save DC of all your spells']] },
  { g: 'Skills', items: [['skills', 'All skills'], ...SK.map(([n]): [string, string] => ['skill:' + n, n])] },
  { g: 'Ability scores', items: [['str', 'Strength'], ['dex', 'Dexterity'], ['con', 'Constitution'], ['int', 'Intelligence'], ['wis', 'Wisdom'], ['cha', 'Charisma']] },
  { g: 'Other', items: [['init', 'Initiative']] },
];

const LABEL: Record<string, string> = Object.fromEntries(TARGET_GROUPS.flatMap((g) => g.items));

export const targetLabel = (stat: string): string =>
  LABEL[stat] || (stat.startsWith('skill:') ? stat.slice(6) : stat);

/** Plain-language stacking rule for a bonus type, shown as the player picks it. */
export function typeHint(type: string): string {
  if (type === 'untyped') return 'No type named. Untyped bonuses add up with everything. If the DM named a type ("a luck bonus"), pick that instead.';
  if (STACKING_TYPES.has(type)) return `${type[0].toUpperCase() + type.slice(1)} bonuses add up with each other.`;
  return `Two ${type} bonuses to the same thing don't add up; only the bigger one counts, and the sheet shows the other struck through.`;
}
