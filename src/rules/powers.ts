// Daily resources and class/school powers. VERIFY.md lists each.
// CHARACTER-SPECIFIC: Necromancy school powers and the Samsaran spell-likes.

/** Power over Undead channel uses and Grave Touch/Bolster uses: 3 + Int modifier per day. */
export const schoolPowerUses = (intMod: number): number => 3 + intMod;

/** Command Undead feat: Will save DC, as v36 computes it (10 + ½ level + Cha).
 *  VERIFY.md → "Command Undead save DC for a wizard" — may be Int for Power over Undead. */
export const commandUndeadDC = (L: number, chaMod: number): number => 10 + Math.floor(L / 2) + chaMod;

/** Grave Touch: shaken for ½ wizard level rounds, minimum 1. */
export const graveTouchRounds = (L: number): number => Math.max(1, Math.floor(L / 2));

/** Bolster (Undead subschool): +1 profane, +1 more per 5 levels. */
export const bolsterBonus = (L: number): number => 1 + Math.floor(L / 5);

/** HOUSE RULING 5: a night's rest is 8 hours and heals 2 × character level.
 *  RAW: 8 hours heals 1 × level; 2 × needs a full day and night of complete bed rest. */
export const restHeal = (L: number): number => 2 * L;
export const restHealRAW = (L: number): number => L;

/** Samsaran Magic spell-likes, 1/day each. Keys match ch.used. */
export const SAMSARAN_SLAS: [string, string, string][] = [
  ['cl', 'Comprehend Languages', 'comprehend'],
  ['dw', 'Deathwatch', 'deathwatch'],
  ['st', 'Stabilize', 'stabilize'],
];

/** Concentration DC after taking damage while casting: 10 + damage + spell level.
 *  With no damage, v36 uses 15 + spell level. VERIFY.md → "Concentration DC when not damaged". */
export const concentrationDC = (damage: number, spellLevel: number): number =>
  damage > 0 ? 10 + damage + spellLevel : 15 + spellLevel;
