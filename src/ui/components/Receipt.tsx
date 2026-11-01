// Receipts: the arithmetic behind a number, including what got SUPPRESSED and why
// (ARCHITECTURE U3). Port of v36's receipt()/suppressedHTML()/receiptText()/mrow().

import type { ComponentChildren } from 'preact';
import { sgn } from '../../rules/core';
import type { Res } from '../../rules/stacking';

/** One line per contribution, then the suppressed ones struck through. `parts` are the fixed
 *  parts (base 10, Dex…) as JSX; effect rows come from the receipt. */
export function Receipt({ parts, res, hideSuppressed }: { parts: ComponentChildren[]; res: Res; hideSuppressed?: boolean }) {
  const rows: ComponentChildren[] = parts.filter((p) => p !== '' && p != null && p !== false);
  for (const r of res.applied)
    rows.push(
      <>
        {sgn(r.v)} {r.type !== 'untyped' && <b>{r.type} </b>}
        {r.name}
        {r.src && <span class="src"> {r.src}</span>}
      </>,
    );
  return (
    <>
      {rows.map((r, i) => (
        <>
          {i > 0 && <br />}
          {r}
        </>
      ))}
      {!hideSuppressed && <Suppressed res={res} />}
    </>
  );
}

export function Suppressed({ res }: { res: Res }) {
  return (
    <>
      {res.suppressed.map((r) => (
        <>
          <br />
          <span class="supp">
            ✗ {sgn(r.v)} {r.type} · {r.name} — SUPPRESSED. Two {r.type} bonuses don't stack; {r.beatenBy.name}'s {sgn(r.beatenBy.v)} is higher.
          </span>
        </>
      ))}
    </>
  );
}

/** The same receipt flattened to text, for a data-calc tip. */
export function receiptText(parts: string[], res: Res, opts: { hideSuppressed?: boolean } = {}): string {
  const rows = parts.filter(Boolean);
  for (const r of res.applied) rows.push(`${sgn(r.v)} ${r.type === 'untyped' ? '' : r.type + ' '}${r.name}`);
  let t = rows.join(' ');
  if (!opts.hideSuppressed)
    for (const r of res.suppressed)
      t += ` · SUPPRESSED ${sgn(r.v)} ${r.type} ${r.name} — ${r.beatenBy.name} ${sgn(r.beatenBy.v)} is higher and ${r.type} bonuses don't stack`;
  return t;
}

/** A math row: label, value, and the sentence explaining it. */
export function MathRow({ label, total, help, children }: { label: string; total: ComponentChildren; help?: string; children: ComponentChildren }) {
  return (
    <div class="mr">
      <div class="top">
        <span class="lbl" data-help={help}>
          {label}
          {help && <> <span class="qm">?</span></>}
        </span>
        <span class="tt">{total}</span>
      </div>
      <div class="why">{children}</div>
    </div>
  );
}

/** A number you can click to roll a d20 with it. */
export function Rollable({ v, label, children }: { v: number; label: string; children?: ComponentChildren }) {
  return (
    <span data-roll={String(v)} data-roll-label={label} class="roll" tabIndex={0} role="button">
      {children ?? sgn(v)}
    </span>
  );
}
