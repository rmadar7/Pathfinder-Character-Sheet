// Dice. roll() is the only randomness in the app (rules stay pure — ARCHITECTURE R1).
import { useEffect, useState } from 'preact/hooks';

interface Last {
  total: number;
  label: string;
  math: string;
  nat: number | null;
}

let last: Last | null = null;
let hist: string[] = [];
let open = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

/** Roll n dice of `die` (default 1d20) plus mod. Shows the result in the dice panel. */
export function roll(label: string, mod = 0, opts: { die?: number; n?: number } = {}): number {
  const die = opts.die || 20, n = opts.n || 1;
  const parts: number[] = [];
  let raw = 0;
  for (let i = 0; i < n; i++) {
    const r = 1 + Math.floor(Math.random() * die);
    raw += r;
    parts.push(r);
  }
  const total = raw + (mod || 0);
  const nat = die === 20 && n === 1 ? parts[0] : null;
  last = {
    total,
    label: label + (nat === 20 ? ' — NATURAL 20' : nat === 1 ? ' — natural 1' : ''),
    math: `${n}d${die} [${parts.join(', ')}]` + (mod ? ` ${mod >= 0 ? '+' : ''}${mod} = ${total}` : ''),
    nat,
  };
  hist = [`${label}: ${total}`, ...hist].slice(0, 6);
  open = true;
  emit();
  return total;
}

const DICE = [4, 6, 8, 10, 12, 20, 100];

export function Dice() {
  const [, force] = useState(0);
  const [dn, setDn] = useState(1);
  const [dm, setDm] = useState(0);
  useEffect(() => {
    const f = () => force((x) => x + 1);
    subs.add(f);
    return () => void subs.delete(f);
  }, []);
  return (
    <div class="dice">
      <div class={'dlog' + (open ? ' on' : '')}>
        {last ? (
          <>
            <div class={'dres' + (last.nat === 20 ? ' crit' : last.nat === 1 ? ' fum' : '')}>{last.total}</div>
            <div class="dwhat">{last.label}</div>
            <div class="dmath">{last.math}</div>
          </>
        ) : (
          <div class="dhint">Click any underlined number to roll it</div>
        )}
        <div class="dpad">
          <div class="dsteps">
            <span class="dlbl">how many</span>
            <button class="dstep" onClick={() => setDn(Math.max(1, dn - 1))}>−</button>
            <span class="dval">{dn}</span>
            <button class="dstep" onClick={() => setDn(Math.min(20, dn + 1))}>+</button>
            <span class="dlbl" style="margin-left:auto">add</span>
            <button class="dstep" onClick={() => setDm(Math.max(-20, dm - 1))}>−</button>
            <span class="dval">{(dm > 0 ? '+' : '') + dm}</span>
            <button class="dstep" onClick={() => setDm(Math.min(20, dm + 1))}>+</button>
          </div>
          <div class="dgrid">
            {DICE.map((d) => {
              const label = (dn > 1 ? dn : '') + 'd' + d + (dm ? (dm > 0 ? '+' : '') + dm : '');
              return (
                <button class="die" title={'Roll ' + label} onClick={() => roll(label, dm, { die: d, n: dn })}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div class="dhist">
          {hist.slice(1).map((h) => (
            <div>{h}</div>
          ))}
        </div>
      </div>
      <button class="dbtn" onClick={() => { open = !open; emit(); }}>
        🎲 Dice
      </button>
    </div>
  );
}
