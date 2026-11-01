// Click-to-spend circles. One implementation for class resources and item charges.
import type { ComponentChildren } from 'preact';

export function PipStrip({ cur, max, cls, onSet }: { cur: number; max: number; cls?: string; onSet: (v: number) => void }) {
  const pips = [];
  for (let i = 0; i < max; i++) {
    const avail = i < cur;
    pips.push(
      <button
        class={'pip ' + (cls || '') + (avail ? '' : ' out')}
        title={avail ? 'Available — click to spend' : 'Spent — click to restore'}
        aria-label={avail ? 'Available — click to spend' : 'Spent — click to restore'}
        onClick={() => onSet(avail ? i : i + 1)}
      />,
    );
  }
  return <div class="pips">{pips}</div>;
}

/** A resource row: name + sub-line, pips, and the count. */
export function Pip(props: {
  name: ComponentChildren; sub?: ComponentChildren; cur: number; max: number; cls?: string; help?: string; onSet: (v: number) => void;
}) {
  return (
    <div class="res">
      <div class="rn" data-help={props.help}>
        {props.name}
        {props.help && <> <span class="qm">?</span></>}
        {props.sub && <small>{props.sub}</small>}
      </div>
      <PipStrip cur={props.cur} max={props.max} cls={props.cls} onSet={props.onSet} />
      <div class="cnt">
        {props.cur}/{props.max}
      </div>
    </div>
  );
}
