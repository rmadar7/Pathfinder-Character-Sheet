// The character document. This is the only thing that changes during play;
// everything else on the sheet is computed from it.

export type Ability = 'Str' | 'Dex' | 'Con' | 'Int' | 'Wis' | 'Cha';
export const ABILITIES: Ability[] = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha'];

/** "+5 armor bonus to AC" is `{stat:'ac', type:'armor', v:5}`.
 *  `calc` names a formula (see EFFCALC) for values that scale with tier or level. */
export interface Mod {
  stat: string;
  type?: string;
  v?: number;
  calc?: string;
  /** Situational: applies only "vs fear", "while raging"… Shown beside the total, never in it. */
  when?: string;
}

export interface Duration {
  u: 'rd' | 'min' | 'hr';
  n: number | 'level';
}

export interface Effect {
  id: string;
  name: string;
  src?: string;
  kind?: string;
  on?: boolean;
  dur?: Duration | null;
  /** Rounds remaining; null = no time limit. */
  left?: number | null;
  mods: Mod[];
  /** System effects (mythic, worn gear, conditions) are derived, never stored. */
  locked?: boolean;
}

export interface BookSpell {
  n: string;
  lv: number;
  sc: string;
  d?: string;
  /** DM ruling applies to this spell. */
  gm?: number | boolean;
  src?: string;
  ct?: string;
  cp?: string;
  rg?: string;
  tg?: string;
  du?: string;
  sv?: string;
  sr?: string;
  /** No source book found for this spell; description written by hand. */
  unsourced?: boolean;
  /** The spell's own d20pfsrd page. */
  url?: string;
}

export interface Uses {
  cur: number;
  max: number;
  regain: number;
}

export type GearSlot = 'worn' | 'carried' | 'stowed';

export interface GearItem {
  id: string;
  n: string;
  desc?: string;
  got?: string;
  wt?: number;
  qty?: number;
  slot?: GearSlot;
  cls?: string;
  help?: string;
  uses?: Uses | null;
  cat?: string;
  fx?: Mod[];
}

export interface Undead {
  n: string;
  hd: number;
  /** 'anim' = raised by Animate Dead; 'cmd' = enslaved by the Command Undead feat. */
  pool?: 'anim' | 'cmd';
}

export interface Attack {
  n: string;
  hit: number;
  dmg: string;
  crit?: string;
}

export interface Brug {
  name: string;
  hp: number;
  hpmax: number;
  ac: number;
  touch: number;
  ff: number;
  fort: number;
  ref: number;
  will: number;
  speed: number;
  size: string;
  ab: Record<Ability, number>;
  attacks: Attack[];
  note: string;
}

export interface Mythic {
  path: string;
  arcana: string;
  trials: string[];
  abilities: { tier: number; name: string; on?: boolean }[];
  feats: { tier: number; name: string }[];
  abilityScores: { tier: number; abil: Ability; v: number }[];
  bonusHpPerTier: number;
}

export interface Used {
  mythic: number;
  grave: number;
  cmd: number;
  cl: number;
  dw: number;
  st: number;
  bond: number;
  [k: string]: number;
}

export interface Craft {
  mats: number;
  hours: number;
  pick: string;
  cl: number | null;
  log: { ok: boolean; txt: string }[];
}

export interface HpLog {
  t: number;
  from: number;
  to: number;
  note: string;
}

export interface ChangeLogEntry {
  at: number;
  schema: number;
  what: string;
}

/** Spell-level-keyed arrays, '1'..'9'. */
export type ByLevel<T> = Record<string, T[]>;

export interface Character {
  schema: number;
  id: string;
  lvl: number;
  tier: number;
  ab: Record<Ability, number>;
  hp: number;
  hpmax: number;
  sv: { fort: number; ref: number; will: number };
  initMisc: number;
  effects: Effect[];
  conditions: string[];
  mythic: Mythic;
  book: BookSpell[];
  prep: ByLevel<string>;
  cast: ByLevel<boolean>;
  prepMeta: ByLevel<string[]>;
  lastPrep: ByLevel<string> | null;
  used: Used;
  gear: GearItem[];
  gp: number;
  sp: number;
  cp: number;
  undead: Undead[];
  round: number;
  strictUndead: boolean;
  hplog: HpLog[];
  theme: 'parchment' | 'dark';
  /** CHARACTER-SPECIFIC: Kaldaran's ogre companion. Absent for other characters. */
  brug?: Brug;
  rulings: { umFeatCountsAsSpell?: boolean; [k: string]: unknown };
  subschool: string;
  specialist: string;
  feats: string[];
  /** Traits, e.g. "Magical Lineage (Animate Dead)". */
  traits: string[];
  house: string[];
  open: string[];
  notes: string;
  identity: Record<string, string>;
  bio: string;
  langs: string[];
  skills: Record<string, { r: number; m: number }>;
  craft: Craft;
  savedAt?: number;
  /** Every change a migration made to the player's data, so none is silent. */
  changelog: ChangeLogEntry[];
}
