// The compendium: every spell, feat, class, race, item and class ability, imported ahead of time
// from the Foundry VTT Pathfinder 1e packs by scripts/import-compendium.mjs (PLAN.md §3). The
// shapes here are OUR format; nothing reads Foundry's directly.

export type Kind = 'spell' | 'feat' | 'class' | 'race' | 'ability' | 'mythic' | 'buff' | 'item';

/** A machine-readable change, as imported: formula, target, bonus type (Foundry's keys). */
export interface RawChange { f: string; t: string; y?: string }

export interface Entry {
  id: string;
  n: string;
  k: Kind;
  /** Source books: Paizo product id and pages. */
  src?: { b: string; p?: string }[];
  sum?: string;
  /** Plain text, paragraphs separated by blank lines. Never HTML. */
  d?: string;
  /** Upstream has only the short unidentified-item text for this entry. */
  thin?: boolean;
  fx?: RawChange[];
  // spells
  lv?: number; sc?: string; sub?: string; desc?: string;
  cls?: Record<string, number>; dom?: Record<string, number>; blood?: Record<string, number>;
  ct?: string; cp?: string; rg?: string; ar?: string; du?: string; sv?: string; sr?: string;
  // feats
  ft?: string; tags?: string[]; pre?: string;
  // classes
  bab?: string; hd?: number; saves?: Record<string, string>; skills?: string[];
  cast?: { type?: string; ability?: string; prog?: string; kind?: string };
  // races
  size?: string; speed?: number; types?: string[]; subtypes?: string[]; langs?: string[];
  // items
  cat?: string; ty?: string; slot?: string; gp?: number; lb?: number; cl?: number; aura?: string;
}

export interface Book { n: string; a: string | null; t: string | null }

export interface CompendiumIndex {
  system: string;
  edition: string;
  upstream: string;
  commit: string;
  files: Record<string, number>;
  books: Record<string, Book>;
}

/** Which file holds which kinds. */
export const FILES = ['spells', 'feats', 'classes', 'races', 'items', 'abilities', 'buffs'] as const;
export type FileName = (typeof FILES)[number];

export const KIND_LABEL: Record<Kind, string> = {
  spell: 'Spell', feat: 'Feat', class: 'Class', race: 'Race', ability: 'Class ability', mythic: 'Mythic path', buff: 'Buff', item: 'Item',
};
