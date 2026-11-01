// A list of "Name — note" strings (feats, traits, rulings, open questions) with add/remove.
import { useState } from 'preact/hooks';

/** Feat/trait names that have a plain-language help entry. */
const HELP_KEYS: Record<string, string> = {
  'Spell Focus (Necromancy)': 'spellFocus', 'Undead Master': 'undeadMaster', 'Undead Master (Mythic)': 'undeadMasterM',
  'Scribe Scroll': 'scribeScroll', 'Command Undead': 'commandUndead', 'Magical Lineage (Animate Dead)': 'magicalLineage',
  Reactionary: 'reactionary', Lifebound: 'lifebound', 'Samsaran Magic': 'samsaranMagic', 'Mystic Past Life': 'mysticPastLife',
};

export function ListEditor({ items, onChange, placeholder, addClass, bare }: {
  items: string[]; onChange: (next: string[]) => void; placeholder: string; addClass?: string; bare?: boolean;
}) {
  const [v, setV] = useState('');
  const add = () => {
    const t = v.trim();
    if (!t) return;
    onChange([...items, t]);
    setV('');
  };
  return (
    <>
      <ul class="pl">
        {items.map((x, i) => {
          if (bare) return <li><div class="b">{x}</div><button class="x" title="Remove" onClick={() => onChange(items.filter((_, k) => k !== i))}>×</button></li>;
          const [a, ...b] = x.split('—');
          const hk = HELP_KEYS[a.trim()];
          return (
            <li>
              <div class="b" data-help={hk}>
                <b>{a.trim()}</b>{hk && <> <span class="qm">?</span></>}{b.length > 0 && <small> — {b.join('—').trim()}</small>}
              </div>
              <button class="x" title="Remove" onClick={() => onChange(items.filter((_, k) => k !== i))}>×</button>
            </li>
          );
        })}
      </ul>
      <div class="addrow">
        <input placeholder={placeholder} value={v} onInput={(e) => setV((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button class={addClass} onClick={add}>Add</button>
      </div>
    </>
  );
}
