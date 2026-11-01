// The effects engine: one list holds everything that changes a number. Mythic abilities,
// worn gear and conditions are DERIVED here at resolve time (ARCHITECTURE R6); only spells
// and hand-made effects the player switched on are stored in ch.effects.

import type { Ability, Character, Effect } from '../model/types';
import { MYTHIC_ABILITIES } from '../data/mythic';
import { CONDITIONS } from '../data/effects';
import { resolveFrom, type Ctx, type Res, type ResolveOpts } from './stacking';

export const ctxOf = (ch: Character): Ctx => ({ L: ch.lvl, T: ch.tier | 0 });

/** Stable id for a mythic ability's derived effect. */
export const mythicEffectId = (name: string): string => 'sys-my-' + name.toLowerCase().replace(/\W+/g, '-');

/** Bonuses from worn gear become effects, so taking the ring off turns them off. */
export function gearEffects(ch: Character): Effect[] {
  return (ch.gear || [])
    .filter((g) => g.slot === 'worn' && g.fx && g.fx.length)
    .map((g) => ({
      id: 'gear-' + g.id, name: g.n, kind: 'item', src: 'worn',
      on: true, dur: null, left: null, locked: true,
      mods: structuredClone(g.fx!),
    }));
}

export function sysEffects(ch: Character): Effect[] {
  const T = ch.tier | 0;
  const out: Effect[] = [];
  const my = ch.mythic;
  if (T > 0) {
    // Amazing Initiative (tier 2): bonus on initiative equal to tier. VERIFY.md.
    if (T >= 2)
      out.push({
        id: 'sys-amazing-init', name: 'Amazing Initiative', kind: 'mythic',
        src: `mythic tier ${T}`, on: true, dur: null, left: null, locked: true,
        mods: [{ stat: 'init', type: 'untyped', calc: 'tier' }],
      });
    for (const a of my?.abilities || []) {
      const def = MYTHIC_ABILITIES[a.name];
      if (def && def.mods && def.mods.length)
        out.push({
          id: mythicEffectId(a.name), name: a.name, kind: 'mythic',
          src: `${my.path || 'Arch-Mage'} path ability · tier ${a.tier}`,
          on: a.on !== false, dur: null, left: null, locked: true,
          mods: structuredClone(def.mods),
        });
    }
  }
  out.push(...gearEffects(ch));
  for (const c of ch.conditions || []) {
    const def = CONDITIONS[c];
    if (def)
      out.push({
        id: 'sys-cond-' + c, name: def.t, kind: 'condition', src: 'condition',
        on: true, dur: null, left: null, locked: true, mods: structuredClone(def.mods || []),
      });
  }
  return out;
}

export const allEffects = (ch: Character): Effect[] => [...sysEffects(ch), ...(ch.effects || [])];
export const activeEffects = (ch: Character): Effect[] => allEffects(ch).filter((e) => e.on !== false);

/** Resolve one stat for this character, with its receipt. */
export const resolve = (ch: Character, stat: string | string[], opts?: ResolveOpts): Res =>
  resolveFrom(activeEffects(ch), stat, ctxOf(ch), opts);

const ABKEYS: Record<Ability, string> = { Str: 'str', Dex: 'dex', Con: 'con', Int: 'int', Wis: 'wis', Cha: 'cha' };

/** Ability SCORES after effects (Enlarge Person, fatigue, a belt). Everything downstream
 *  reads the adjusted score, so a change cascades into every number that depends on it. */
export function abilityScores(ch: Character): Record<Ability, number> {
  const out = {} as Record<Ability, number>;
  for (const k of Object.keys(ch.ab) as Ability[]) out[k] = ch.ab[k] + resolve(ch, ABKEYS[k]).total;
  return out;
}
