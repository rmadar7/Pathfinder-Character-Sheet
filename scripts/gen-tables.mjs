// One-off: copy v36's reference tables into TypeScript verbatim, so the port
// carries the exact wording and numbers rather than a retyped copy.
import { readFileSync, writeFileSync } from 'node:fs';
const L = readFileSync('legacy/Kaldaran_Sheet.html', 'utf8').split('\n');
const take = (a, b) => L.slice(a - 1, b).join('\n');
const header = (what) => `// GENERATED from legacy/Kaldaran_Sheet.html (v36) by scripts/gen-tables.mjs, then kept by hand.
// ${what}
// Verification status: docs/VERIFY.md. Text is v36's, not yet re-checked against d20pfsrd.
`;

let mythic = take(1469, 1480) + '\n\n' + take(1485, 1503) + '\n\n' + take(1506, 1511) + '\n\n' + take(1515, 1555);
mythic = mythic
  .replace('const MYTHIC_TIERS = {', 'export const MYTHIC_TIERS: Record<number, { base: string[]; feat: boolean; abil: boolean }> = {')
  .replace('const MYTHIC_BASE = {', 'export const MYTHIC_BASE: Record<string, TextEntry> = {')
  .replace('const ARCHMAGE_ARCANA = {', 'export const ARCHMAGE_ARCANA: Record<string, TextEntry> = {')
  .replace('const MYTHIC_ABILITIES = {', 'export const MYTHIC_ABILITIES: Record<string, AbilityEntry> = {')
  .replace(/S\.ab\.Con/g, 'c.Con')
  .replace(/m:c=>/g, 'm:(c: MythCtx)=>');
writeFileSync('src/data/mythic.ts', header('Mythic tier table, universal abilities, Arch-Mage arcana and path abilities.') +
`import type { Mod } from '../model/types';
import { surgeDie } from '../rules/mythic-math';

/** Context for the "what this means for you" line under each ability. */
export interface MythCtx { L: number; T: number; Con: number }
export interface TextEntry { b: string; m?: (c: MythCtx) => string }
export interface AbilityEntry extends TextEntry { tier: number; mods?: Mod[] }

` + mythic + '\n');

let fx = take(1560, 1589) + '\n\n' + take(1595, 1629);
fx = fx
  .replace('const CONDITIONS = {', 'export const CONDITIONS: Record<string, { t: string; b: string; mods: Mod[] }> = {')
  .replace('const QUICK_EFFECTS = [', 'export const QUICK_EFFECTS: { name: string; src: string; dur: Duration | null; mods: Mod[] }[] = [');
writeFileSync('src/data/effects.ts', header('Conditions and one-click effects (spells and items).') +
`import type { Duration, Mod } from '../model/types';

` + fx + '\n');

let mm = take(2252, 2281).replace('const METAMAGIC = {',
  'export const METAMAGIC: Record<string, { adj: number; d: string; pre?: string; heighten?: boolean; varies?: boolean }> = {');
writeFileSync('src/data/metamagic.ts', header('Metamagic feats. Each level adjustment was read off the feat\'s own page in v36.') + '\n' + mm + '\n');

let gear = take(3542, 3548) + '\n' + take(3580, 3588);
gear = gear.replace('const GEARWT = [', 'export const GEARWT: [RegExp, number][] = [')
  .replace('const GEARCATS = [', 'export const GEARCATS: [string, string, string][] = [')
  .replace('const CATGUESS = [', 'export const CATGUESS: [RegExp, string][] = [');
writeFileSync('src/data/gear.ts', header('Core Rulebook item weights used to fill blanks, and inventory groups.') + '\n' + gear + '\n');
console.log('ok');
