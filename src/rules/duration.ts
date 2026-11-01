// Durations: stored as rounds (what the round counter ticks), printed in the unit a person
// would say out loud. Mage Armor is 4 HOURS; an old sheet tracked it as 4 rounds.
import type { Duration } from '../model/types';

/** Read a printed duration ("1 hour/level", "4 rounds"). null = instantaneous/permanent
 *  (not tracked); undefined = couldn't tell (concentration, "see text"). */
export function parseDuration(du: string | undefined, L: number): Duration | null | undefined {
  if (!du) return undefined;
  const d = ('' + du).toLowerCase();
  if (d.includes('instantaneous') || d.includes('permanent')) return null;
  let m: RegExpMatchArray | null;
  if ((m = d.match(/(\d+)\s*rounds?\s*\/\s*level/))) return { u: 'rd', n: +m[1] * L };
  if ((m = d.match(/(\d+)\s*min\.?\s*\/\s*level/))) return { u: 'min', n: +m[1] * L };
  if ((m = d.match(/(\d+)\s*hours?\s*\/\s*level/))) return { u: 'hr', n: +m[1] * L };
  if ((m = d.match(/(\d+)\s*rounds?/))) return { u: 'rd', n: +m[1] };
  if ((m = d.match(/(\d+)\s*min/))) return { u: 'min', n: +m[1] };
  if ((m = d.match(/(\d+)\s*hours?/))) return { u: 'hr', n: +m[1] };
  if (/hour\/level/.test(d)) return { u: 'hr', n: L };
  return undefined;
}

/** One round is 6 seconds: 10 rounds a minute, 600 an hour. */
export function durToRounds(dur: Duration | null | undefined, L: number): number | null {
  if (!dur) return null;
  const n = dur.n === 'level' ? L : +dur.n || 0;
  if (!n) return null;
  if (dur.u === 'rd') return n;
  if (dur.u === 'min') return n * 10;
  if (dur.u === 'hr') return n * 600;
  return null;
}

export function fmtDur(rds: number | null | undefined): string {
  if (rds === null || rds === undefined) return 'ongoing';
  if (rds <= 0) return 'expired';
  if (rds >= 600) {
    const h = rds / 600;
    return Math.round(h * 10) / 10 + (h === 1 ? ' hr' : ' hrs');
  }
  if (rds >= 60) return Math.round(rds / 10) + ' min';
  return rds + ' rd' + (rds === 1 ? '' : 's');
}
