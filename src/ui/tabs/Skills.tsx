// SKILLS + LANGUAGES. Every total shows its parts.
import { useState } from 'preact/hooks';
import { sgn } from '../../rules/core';
import { mods } from '../../rules/derive';
import { resolve } from '../../rules/effects';
import { languageMax, rankBudget, ranksPerLevel, ranksSpent, RACIAL_LANGS, SK, skillLine } from '../../rules/skills';
import { Rollable } from '../components/Receipt';
import { update, useCh } from '../store';

const ELEMENTAL = ['Ignan', 'Terran', 'Auran', 'Aquan'];

export function Skills() {
  const ch = useCh();
  const m = mods(ch), L = ch.lvl;
  const [lang, setLang] = useState('');
  const budget = rankBudget(ch, m.Int), used = ranksSpent(ch);
  const all = resolve(ch, 'skills');
  const lmax = languageMax(ch, m.Int);
  const ling = ch.skills['Linguistics']?.r || 0;

  const head = (
    <tr><th>Skill</th><th>Ab</th><th style="width:52px;text-align:right">Rank</th><th style="width:52px;text-align:right">Misc</th><th style="text-align:right">Total</th></tr>
  );
  const row = (name: string) => {
    const s = skillLine(ch, name, m, all)!;
    const parts = [`${sgn(m[s.ab])} ${s.ab}`];
    if (s.ranks) parts.push(`+${s.ranks} rank${s.ranks > 1 ? 's' : ''}`);
    if (s.cls) parts.push('+3 class');
    if (s.misc) parts.push(`${sgn(s.misc)} misc`);
    for (const r of s.fx.applied) parts.push(`${sgn(r.v)} ${r.name}`);
    return (
      <tr>
        <td>{name}<div class="tiny" style="font-size:9px">{parts.join(' ')}{s.cls > 0 && <> <span class="cls3">◆</span></>}</div></td>
        <td class="tiny">{s.ab}</td>
        <td class="n">
          <input type="number" class="w3" value={s.ranks} min={0} max={L} onChange={(e) => {
            const want = Math.max(0, parseInt((e.target as HTMLInputElement).value) || 0);
            const capped = Math.min(want, L);
            // Max ranks in one skill is your character level.
            update((d) => void (d.skills[name] = { ...(d.skills[name] || { r: 0, m: 0 }), r: capped }),
              want > capped ? `max ranks in one skill is your level (${L}) — capped it` : undefined);
            if (want > capped) (e.target as HTMLInputElement).value = String(capped);
          }} />
        </td>
        <td class="n"><input type="number" class="w3" value={s.misc} onChange={(e) => update((d) => void (d.skills[name] = { ...(d.skills[name] || { r: 0, m: 0 }), m: parseInt((e.target as HTMLInputElement).value) || 0 }))} /></td>
        <td class="n"><b><Rollable v={s.total} label={name} /></b></td>
      </tr>
    );
  };
  const h = Math.ceil(SK.length / 2);
  const missingElemental = ELEMENTAL.filter((l) => !ch.langs.includes(l));

  return (
    <>
      <div class="card">
        <h3>Skills<span class="nt" data-help="classskill">what is a class skill? <span class="qm">?</span></span></h3>
        <div class={'budget' + (used > budget ? ' over' : '')} data-help="skillranks">
          {used} of {budget} ranks spent — wizard gets 2/level + Int mod ({m.Int}) = {ranksPerLevel(m.Int)} per level × {L} levels
          {used > budget ? ' — OVER BUDGET' : used < budget ? ` · ${budget - used} left` : ''}
        </div>
        <div class="g2">
          <table><tbody>{head}{SK.slice(0, h).map(([n]) => row(n))}</tbody></table>
          <table><tbody>{head}{SK.slice(h).map(([n]) => row(n))}</tbody></table>
        </div>
      </div>
      <div class="card">
        <h3>Languages<span class="nt">{ch.langs.length} of {lmax} — {RACIAL_LANGS} racial + {m.Int} Int + {ling} Linguistics ranks</span></h3>
        <div>
          {ch.langs.map((l, i) => (
            <span class="chip">{l}<button class="x" title="Remove" onClick={() => update((d) => void d.langs.splice(i, 1))}>×</button></span>
          ))}
        </div>
        <div class="addrow">
          <input placeholder="Add a language…" value={lang} onInput={(e) => setLang((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && lang.trim()) { update((d) => void d.langs.push(lang.trim())); setLang(''); } }} />
          <button onClick={() => { if (lang.trim()) { update((d) => void d.langs.push(lang.trim())); setLang(''); } }}>Add</button>
        </div>
        {/* CHARACTER-SPECIFIC. v36 printed "No elemental tongues" unconditionally; Ignan has
            since been learned, so the line now lists only what's actually missing. */}
        {ch.identity.homeland === 'City of Four Elements' && missingElemental.length > 0 && missingElemental.length < 4 && (
          <div class="flag">Elemental tongues still missing: {missingElemental.join(', ')}.</div>
        )}
      </div>
    </>
  );
}
