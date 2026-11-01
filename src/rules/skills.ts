// Skills. VERIFY.md → "Skill ranks", "Languages".
import type { Ability, Character } from '../model/types';
import { mods, type Mods } from './derive';
import { resolve } from './effects';
import type { Res } from './stacking';

/** [name, key ability, class skill for a wizard]. CHARACTER-SPECIFIC: wizard class skills. */
export const SK: [string, Ability, boolean][] = [
  ['Acrobatics', 'Dex', false], ['Appraise', 'Int', true], ['Bluff', 'Cha', false], ['Climb', 'Str', false],
  ['Craft (Jewelry)', 'Int', true], ['Diplomacy', 'Cha', false], ['Disable Device', 'Dex', false], ['Disguise', 'Cha', false],
  ['Escape Artist', 'Dex', false], ['Fly', 'Dex', true], ['Handle Animal', 'Cha', false], ['Heal', 'Wis', false],
  ['Intimidate', 'Cha', false], ['Know. Arcana', 'Int', true], ['Know. Dungeoneering', 'Int', true],
  ['Know. Engineering', 'Int', true], ['Know. Geography', 'Int', true], ['Know. History', 'Int', true],
  ['Know. Local', 'Int', true], ['Know. Nature', 'Int', true], ['Know. Nobility', 'Int', true], ['Know. Planes', 'Int', true],
  ['Know. Religion', 'Int', true], ['Linguistics', 'Int', true], ['Perception', 'Wis', false], ['Perform', 'Cha', false],
  ['Profession', 'Wis', true], ['Ride', 'Dex', false], ['Sense Motive', 'Wis', false], ['Sleight of Hand', 'Dex', false],
  ['Spellcraft', 'Int', true], ['Stealth', 'Dex', false], ['Survival', 'Wis', false], ['Swim', 'Str', false],
  ['Use Magic Device', 'Cha', false],
];

export interface SkillLine {
  name: string;
  ab: Ability;
  classSkill: boolean;
  ranks: number;
  misc: number;
  /** +3 when a class skill has at least one rank. */
  cls: number;
  fx: Res;
  total: number;
}

export function skillLine(ch: Character, name: string, m: Mods = mods(ch)): SkillLine | null {
  const def = SK.find((x) => x[0] === name);
  if (!def) return null;
  const s = ch.skills[name] || { r: 0, m: 0 };
  // One pool with the all-skills key, so two luck bonuses don't stack (stacking.ts).
  const fx = resolve(ch, ['skills', 'skill:' + name]);
  const cls = def[2] && s.r > 0 ? 3 : 0;
  return { name, ab: def[1], classSkill: def[2], ranks: s.r, misc: s.m, cls, fx, total: m[def[1]] + s.r + cls + s.m + fx.total };
}

export const skillTotal = (ch: Character, name: string): number => skillLine(ch, name)?.total ?? 0;

/** Wizard: 2 + Int modifier ranks per level. */
export const ranksPerLevel = (intMod: number): number => 2 + intMod;
export const rankBudget = (ch: Character, intMod = mods(ch).Int): number => ranksPerLevel(intMod) * ch.lvl;
export const ranksSpent = (ch: Character): number => Object.values(ch.skills).reduce((a, s) => a + (s.r || 0), 0);

/** Languages known = racial languages (2 for a Samsaran: Common, Samsaran) + Int modifier
 *  + Linguistics ranks. CHARACTER-SPECIFIC: the racial count. */
export const RACIAL_LANGS = 2;
export const languageMax = (ch: Character, intMod = mods(ch).Int): number =>
  RACIAL_LANGS + intMod + (ch.skills['Linguistics']?.r || 0);
