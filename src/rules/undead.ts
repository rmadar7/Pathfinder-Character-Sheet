// Undead control. Two SEPARATE pools: Animate Dead's own "undead you control" limit, and the
// Command Undead feat's cap. d20pfsrd's animate dead entry: "Undead you control through the
// Command Undead feat do not count toward this limit." VERIFY.md → "Animate Dead",
// "Command Undead feat HD cap", "Undead Master".

import type { Character } from '../model/types';

export interface UndeadCaps {
  /** Effective caster level for animating: wizard level + 4 (Undead Master) + tier (mythic). */
  animCL: number;
  /** Total Animate Dead HD you can hold. House ruling 9: 4 × animCL. Strict reading: 4 × level. */
  strictCap: number;
  /** HD raised by one casting: 2 × animCL. */
  perCast: number;
  /** Command Undead feat cap: level + 4 + tier. */
  cmdCap: number;
}

// CHARACTER-SPECIFIC: assumes Undead Master and Undead Master (Mythic), which Kaldaran has.
export function undeadCaps(L: number, T: number, strict: boolean): UndeadCaps {
  const animCL = L + 4 + T;
  return { animCL, strictCap: strict ? 4 * L : 4 * animCL, perCast: 2 * animCL, cmdCap: L + 4 + T };
}

export const capsOf = (ch: Character): UndeadCaps => undeadCaps(ch.lvl, ch.tier | 0, !!ch.strictUndead);

export function poolHD(ch: Character, pool: 'anim' | 'cmd'): number {
  return (ch.undead || []).filter((u) => (u.pool || 'anim') === pool).reduce((a, u) => a + (+u.hd || 0), 0);
}
