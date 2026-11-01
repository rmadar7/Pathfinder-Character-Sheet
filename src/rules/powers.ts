// Daily resources and class/school powers. VERIFY.md lists each.
// CHARACTER-SPECIFIC: Necromancy school powers and the Samsaran spell-likes.

/** Power over Undead channel uses and Grave Touch/Bolster uses: 3 + Int modifier per day. */
export const schoolPowerUses = (intMod: number): number => 3 + intMod;

/** Command Undead feat, granted by the Necromancy school's Power over Undead. The feat's own
 *  page keys the DC to cleric level; Power over Undead replaces that for a wizard:
 *  "The DC to save against these feats is equal to 10 + 1/2 your wizard level + your
 *  Charisma modifier."
 *  — d20pfsrd, Wizard → Arcane Schools → Necromancy → Power over Undead (Su).
 *  Charisma, not Intelligence: v36 had this right. Pass the WIZARD level. */
export const commandUndeadDC = (wizardLevel: number, chaMod: number): number =>
  10 + Math.floor(wizardLevel / 2) + chaMod;

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

/** What is disrupting the casting. Each has its own DC on the Concentration table. */
export type ConcCause =
  | 'injured' | 'continuous' | 'defensive' | 'grappled' | 'entangled'
  | 'vigorous' | 'violent' | 'extreme' | 'windRain' | 'windHail';

/** Plain-language labels, in table order. `x` names the number the formula needs, if any. */
export const CONC_CAUSES: { k: ConcCause; t: string; x?: string }[] = [
  { k: 'injured', t: 'Hit while casting', x: 'damage taken' },
  { k: 'continuous', t: 'Ongoing damage (acid, bleed…)', x: 'damage this round' },
  { k: 'defensive', t: 'Casting defensively' },
  { k: 'grappled', t: 'Grappled or pinned', x: "grappler's CMB" },
  { k: 'entangled', t: 'Entangled' },
  { k: 'vigorous', t: 'Vigorous motion (moving mount, rough wagon)' },
  { k: 'violent', t: 'Violent motion (galloping horse, stormy deck)' },
  { k: 'extreme', t: 'Extremely violent motion (earthquake)' },
  { k: 'windRain', t: 'Strong wind with rain or sleet' },
  { k: 'windHail', t: 'Wind with hail and debris' },
];

/** Concentration DC, one row per cause. d20pfsrd, Magic → Concentration, table:
 *    "Cast defensively — 15 + double spell level"
 *    "Injured while casting — 10 + damage dealt + spell level"
 *    "Continuous damage while casting — 10 + 1/2 damage dealt + spell level"
 *    "Grappled or pinned while casting — 10 + grappler's CMB + spell level"
 *    "Vigorous motion while casting — 10 + spell level"
 *    "[Violent] motion while casting — 15 + spell level"
 *    "Extremely violent motion while casting — 20 + spell level"
 *    "Wind with rain or sleet while casting — 5 + spell level"
 *    "Wind with hail and debris while casting — 10 + spell level"
 *    "Entangled while casting — 15 + spell level"
 *  v36 used a flat "15 + spell level" whenever no damage was taken and called it the
 *  grappled DC; that is only right for entangled and violent motion. DECISIONS.md.
 *  `x` is the damage (injured/continuous) or the grappler's CMB (grappled). */
export function concentrationDC(cause: ConcCause, spellLevel: number, x = 0): number {
  const n = Math.max(0, x);
  switch (cause) {
    case 'injured': return 10 + n + spellLevel;
    case 'continuous': return 10 + Math.floor(n / 2) + spellLevel;
    case 'defensive': return 15 + 2 * spellLevel;
    case 'grappled': return 10 + x + spellLevel; // a CMB can be negative
    case 'entangled': return 15 + spellLevel;
    case 'vigorous': return 10 + spellLevel;
    case 'violent': return 15 + spellLevel;
    case 'extreme': return 20 + spellLevel;
    case 'windRain': return 5 + spellLevel;
    case 'windHail': return 10 + spellLevel;
  }
}

/** Recuperation (mythic tier 3). d20pfsrd, Mythic Heroes → Recuperation (Ex):
 *  "At 3rd tier, you are restored to full hit points after 8 hours of rest so long as you
 *  aren't dead." and "by expending one use of mythic power and resting for 1 hour, you regain
 *  a number of hit points equal to half your full hit points (up to a maximum of your full
 *  hit points) and regain the use of any class features that are limited to a certain number
 *  of uses per day (such as barbarian rage, bardic performance, spells per day, and so on)."
 *  "This rest doesn't refresh uses of mythic power or any mythic abilities that are limited
 *  to a number of times per day." */
export const hasRecuperation = (tier: number): boolean => tier >= 3;
/** HP regained by the 1-hour, 1-mythic-power rest: half of full HP (rounded down). */
export const recuperationHourHeal = (hpmax: number): number => Math.floor(hpmax / 2);
export const RECUPERATION_COST = 1;
