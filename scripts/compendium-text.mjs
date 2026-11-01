// Text helpers for the compendium import, kept apart so tests can import them without
// running the import.

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', times: '×', frac12: '½', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', minus: '−' };
/** Foundry HTML → plain text. Enrichers become their label: @UUID[…]{fireball} → fireball. */
export function toText(html) {
  if (!html) return '';
  let s = String(html)
    .replace(/@(?:UUID|Compendium|Item|Actor|JournalEntry|Browse)\[[^\]]*\]\{([^}]*)\}/g, '$1')
    .replace(/@(?:UUID|Compendium|Item|Actor|JournalEntry|Browse)\[[^\]]*\]/g, '')
    .replace(/\[\[\/?(?:r|roll|gmr|br)\s+([^\]]+?)(?:\s*#[^\]]*)?\]\](?:\{([^}]*)\})?/g, (_, f, l) => l || f)
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*(p|div|h\d|table|ul|ol)(\s[^>]*)?>/gi, '\n\n')
    .replace(/<\s*\/(p|div|h\d|tr|table|ul|ol)\s*>/gi, '\n\n')
    .replace(/<\s*li[^>]*>/gi, '\n• ')
    .replace(/<\s*\/t[dh]\s*>/gi, ' · ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) =>
      e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e.toLowerCase()] ?? m);
  return s.replace(/ · \n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
}

/** Foundry stores durations as a unit plus a formula ("@cl" hours). Write them the way the
 *  rulebook does: "1 hour/level", "10 min./level", "1 round per 2 levels". */
const UNIT = { round: ['round', 'rounds'], minute: ['minute', 'minutes'], hour: ['hour', 'hours'], day: ['day', 'days'], turn: ['turn', 'turns'], week: ['week', 'weeks'], month: ['month', 'months'], year: ['year', 'years'] };
export function fmtDuration(du) {
  if (!du) return undefined;
  const v = du.value == null ? '' : String(du.value).trim();
  const u = UNIT[du.units];
  let s;
  if (du.units === 'inst') s = v && !/^\d+$/.test(v) ? v : 'instantaneous';
  else if (du.units === 'perm') s = v && !/^\d+$/.test(v) ? v : 'permanent';
  else if (!u) s = v || (du.units === 'spec' || du.units === 'seeText' ? 'see text' : undefined);
  else {
    let m;
    if (v === '@cl') s = `1 ${u[0]}/level`;
    else if ((m = v.match(/^(\d+)\s*\*\s*@cl$/))) s = `${m[1]} ${u[1]}/level`;
    else if ((m = v.match(/^floor\(@cl\s*\/\s*(\d+)\)$/))) s = `1 ${u[0]} per ${m[1]} levels`;
    else if (/^\d+$/.test(v)) s = `${v} ${+v === 1 ? u[0] : u[1]}`;
    else s = v ? `${v.replace(/@cl/g, 'caster level')} ${u[1]}` : u[1];
  }
  if (s && du.dismiss && !/\(D\)/.test(s)) s += ' (D)';
  if (s && du.concentration && !/concentration/i.test(s)) s = 'concentration, up to ' + s;
  return s;
}
