// GENERATED from legacy/Kaldaran_Sheet.html (v36) by scripts/gen-tables.mjs, then kept by hand.
// Core Rulebook item weights used to fill blanks, and inventory groups.
// Verification status: docs/VERIFY.md. Text is v36's, not yet re-checked against d20pfsrd.

export const GEARWT: [RegExp, number][] = [
  [/quarterstaff/i,4],[/\brobe\b/i,1],[/backpack/i,2],[/component pouch/i,2],
  [/bedroll/i,5],[/belt pouch/i,0.5],[/flint and steel/i,0],[/ink/i,0],
  [/iron pot|mess kit|soap/i,6],[/torch/i,1],[/ration/i,1],[/waterskin/i,4],
  [/saddle/i,33],[/\bring\b/i,0],[/amulet/i,0],[/wand/i,0],[/potion/i,0.5],
  [/scroll/i,0],[/\brod\b/i,5],[/\bstaff\b/i,5]
];
export const GEARCATS: [string, string, string][] = [
  ['magic',    'Magic & consumables', 'rings, wands, potions, scrolls'],
  ['survival', 'Camp & survival',     'food, water, light, shelter'],
  ['gear',     'Everything else',     '']
];
export const CATGUESS: [RegExp, string][] = [
  [/ration|trail food|\bfood\b|waterskin|water\b|\bdrink|ale|wine|bedroll|tent|blanket|torch|candle|lantern|flint|soap|mess kit|iron pot|cooking|rope|fishing|whetstone|sunrod/i, 'survival'],
  [/ring|wand|potion|scroll|amulet|cloak|bracers|rod\b|staff of|elixir|oil of|talisman/i, 'magic']
];
