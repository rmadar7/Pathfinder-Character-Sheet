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

/** Which bonus types can apply to which kind of number. d20pfsrd, Common Terms → Bonus, table
 *  of bonus types, "Can Affect" column:
 *    Alchemical — ability scores, saves        Armor / Deflection / Dodge / Natural armor /
 *    Circumstance — attacks, checks              Shield — AC
 *    Competence — attacks, checks, saves       Enhancement — ability scores, AC, attacks…
 *    Insight — AC, attacks, checks, saves      Luck — AC, attacks, checks, damage, saves
 *    Morale — attacks, checks, damage, saves, Str, Con, Dex
 *    Profane / Sacred — AC, checks, damage, DCs, saves
 *    Resistance — saves                        Size — ability scores, attacks, AC
 *    Inherent — ability scores (the cell is garbled on the page; its examples are a manual of
 *      bodily health and wish, both ability-score boosts)
 *    Racial, Trait — no restriction listed.    Untyped — no type, so no restriction.
 *  Skills, initiative and concentration are checks; CMB counts with attacks, CMD with AC.
 *  Caster level isn't in the table, so only the unrestricted types apply to it. */
type Kind = 'ac' | 'save' | 'attack' | 'check' | 'dc' | 'ability' | 'physical' | 'cl';
const CAN_AFFECT: Record<string, Kind[]> = {
  alchemical: ['ability', 'physical', 'save'],
  armor: ['ac'], deflection: ['ac'], dodge: ['ac'], natural: ['ac'], shield: ['ac'],
  circumstance: ['attack', 'check'],
  competence: ['attack', 'check', 'save'],
  enhancement: ['ability', 'physical', 'ac', 'attack'],
  insight: ['ac', 'attack', 'check', 'save'],
  luck: ['ac', 'attack', 'check', 'save'],
  morale: ['attack', 'check', 'save', 'physical'],
  profane: ['ac', 'check', 'dc', 'save'], sacred: ['ac', 'check', 'dc', 'save'],
  resistance: ['save'],
  size: ['ability', 'physical', 'attack', 'ac'],
  inherent: ['ability', 'physical'],
};
const UNRESTRICTED = new Set(['racial', 'trait', 'untyped']);

function kindOf(stat: string): Kind {
  if (stat === 'ac' || stat === 'cmd') return 'ac';
  if (['saves', 'fort', 'ref', 'will'].includes(stat)) return 'save';
  if (['atk', 'melee', 'ranged', 'cmb'].includes(stat)) return 'attack';
  if (stat === 'dc') return 'dc';
  if (stat === 'cl') return 'cl';
  if (['str', 'dex', 'con'].includes(stat)) return 'physical';
  if (['int', 'wis', 'cha'].includes(stat)) return 'ability';
  return 'check'; // skills, a named skill, initiative, concentration
}

/** Can a bonus of this type apply to this stat? */
export const typeFits = (type: string, stat: string): boolean =>
  UNRESTRICTED.has(type) || (CAN_AFFECT[type] || []).includes(kindOf(stat));

/** The bonus types offered for a stat, untyped first. */
export const typesFor = (stat: string, all: string[]): string[] =>
  ['untyped', ...all.filter((t) => t !== 'untyped' && typeFits(t, stat))];

/** Plain-language stacking rule for a bonus type, shown as the player picks it. */
export function typeHint(type: string): string {
  if (type === 'untyped') return 'Pick this if the DM didn\'t name a type: untyped bonuses add up with everything. If the DM said "a luck bonus" or "an enhancement bonus", pick that instead.';
  if (STACKING_TYPES.has(type)) return `${type[0].toUpperCase() + type.slice(1)} bonuses add up with each other.`;
  return `Two ${type} bonuses to the same thing don't add up; only the bigger one counts, and the sheet shows the other struck through.`;
}
