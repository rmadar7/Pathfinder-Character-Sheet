// MYTHIC — path, tier, power, abilities, arcana. Port of v36 renderMythic().
import { useState } from 'preact/hooks';
import { ARCHMAGE_ARCANA, MYTHIC_ABILITIES, MYTHIC_BASE, MYTHIC_TIERS, type MythCtx } from '../../data/mythic';
import { ABILITIES, type Ability } from '../../model/types';
import { mythicPower, surgeDie } from '../../rules/mythic-math';
import { roll } from '../components/Dice';
import { ModSummary } from '../components/EffectsManager';
import { Pip } from '../components/Pips';
import { update, useCh } from '../store';

const intOf = (e: Event) => parseInt((e.target as HTMLInputElement).value) || 0;

export function Mythic() {
  const ch = useCh();
  const T = ch.tier | 0, L = ch.lvl;
  const my = ch.mythic;
  const ctx: MythCtx = { L, T, Con: ch.ab.Con };
  const mpM = mythicPower(T);
  const per = my.bonusHpPerTier ?? 3;

  const nextPathTier = (() => { for (let t = 1; t <= Math.max(T, 1); t++) if (!my.abilities.find((a) => a.tier === t)) return t; return T + 1; })();
  const [pa, setPa] = useState({ name: Object.keys(MYTHIC_ABILITIES).sort()[0], tier: Math.min(nextPathTier, 10) });
  const [mf, setMf] = useState({ name: '', tier: [1, 3, 5, 7, 9].find((t) => t <= T && !my.feats.find((f) => f.tier === t)) || 1 });
  const [as, setAs] = useState<{ abil: Ability; tier: number }>({ abil: 'Int', tier: 2 });

  return (
    <>
      <div class="mythhero">
        {([
          ['Path', my.path || 'Arch-Mage', ''], ['Tier', T, T > 0 ? 'trials, not levels' : 'not yet mythic'],
          ['Mythic power', mpM + '/day', `3 + (2 × ${T})`], ['Surge', surgeDie(T), 'added after you roll'],
          ['Bonus HP', '+' + per * T, `${per} per tier`],
        ] as const).map(([l, v, w]) => <div class="c"><div class="l">{l}</div><div class="v">{v}</div><div class="w">{w}</div></div>)}
      </div>
      <div class="g2">
        <div>
          <div class="card">
            <h3>Mythic Power</h3>
            {T > 0 ? (
              <>
                <Pip name="Mythic Power" help="mythicPower" cls="y" cur={mpM - ch.used.mythic} max={mpM}
                  sub={<><span class="src">3 + (2 × tier {T}) = {mpM}/day</span> — spend on Wild Arcana, a Surge, or Amazing Initiative's extra action</>}
                  onSet={(v) => update((d) => void (d.used.mythic = mpM - v))} />
                <div style="margin-top:9px">
                  <button class="go" onClick={() => roll('Surge ' + surgeDie(T), 0, { die: +surgeDie(T).slice(3), n: 1 })}>Roll a Surge {surgeDie(T)}</button>
                  <span class="note2" style="margin-left:8px">You may Surge AFTER seeing your d20, before the DM says whether it landed.</span>
                </div>
              </>
            ) : <div class="empty2">Not mythic yet. Set a tier in the header.</div>}
          </div>

          <div class="card">
            <h3>Path abilities<span class="nt">one per tier</span></h3>
            {Array.from({ length: Math.max(T, 1) }, (_, k) => k + 1).map((t) => {
              const got = my.abilities.find((a) => a.tier === t);
              const def = got && MYTHIC_ABILITIES[got.name];
              return (
                <div class={'fx ' + (t <= T ? 'on mythic' : 'off')}>
                  <div class="fxh">
                    <div class="fxn">{got ? got.name : <span class="note2">not chosen</span>}<span class="fxsrc">tier {t}{t > T ? ' — not reached yet' : ''}</span></div>
                    {got && <button class="x" title="Remove" onClick={() => update((d) => void (d.mythic.abilities = d.mythic.abilities.filter((a) => a.tier !== t)))}>×</button>}
                  </div>
                  {def && <div class="fxm" style="font-family:var(--serif);font-size:13px;color:var(--dim)">{def.b}</div>}
                  {def?.m && <div class="fxm"><span class="src">{def.m(ctx)}</span></div>}
                  {def?.mods && <div class="fxm"><ModSummary ch={ch} mods={def.mods} /> — <b>live in your numbers now</b></div>}
                </div>
              );
            })}
            <div class="pick">
              <select value={pa.name} onChange={(e) => setPa({ ...pa, name: (e.target as HTMLSelectElement).value })}>
                {Object.keys(MYTHIC_ABILITIES).sort().map((n) => <option>{n}</option>)}
              </select>
              <input type="number" class="w3" value={pa.tier} min={1} max={10} title="which tier you took it at" onInput={(e) => setPa({ ...pa, tier: intOf(e) })} />
              <button class="go" onClick={() => update((d) => {
                const t = Math.max(1, Math.min(10, pa.tier || 1));
                d.mythic.abilities = [...d.mythic.abilities.filter((a) => a.tier !== t), { tier: t, name: pa.name }].sort((a, b) => a.tier - b.tier);
              })}>Take it</button>
            </div>
          </div>

          <div class="card">
            <h3>Mythic feats<span class="nt">tiers 1, 3, 5, 7, 9</span></h3>
            {[1, 3, 5, 7, 9].filter((t) => t <= Math.max(T, 1)).map((t) => {
              const got = my.feats.find((f) => f.tier === t);
              return (
                <div class={'fx ' + (t <= T ? 'on mythic' : 'off')}>
                  <div class="fxh">
                    <div class="fxn">{got ? got.name : <span class="note2">not chosen</span>}<span class="fxsrc">tier {t}{t > T ? ' — not reached yet' : ''}</span></div>
                    {got && <button class="x" title="Remove" onClick={() => update((d) => void (d.mythic.feats = d.mythic.feats.filter((f) => f.tier !== t)))}>×</button>}
                  </div>
                </div>
              );
            })}
            <div class="pick">
              <input placeholder="Mythic feat — e.g. Undead Master (Mythic)" value={mf.name} onInput={(e) => setMf({ ...mf, name: (e.target as HTMLInputElement).value })} />
              <input type="number" class="w3" value={mf.tier} min={1} max={9} onInput={(e) => setMf({ ...mf, tier: intOf(e) })} />
              <button class="go" onClick={() => {
                const n = mf.name.trim();
                if (!n) return;
                const t = Math.max(1, Math.min(9, mf.tier || 1));
                update((d) => void (d.mythic.feats = [...d.mythic.feats.filter((f) => f.tier !== t), { tier: t, name: n }].sort((a, b) => a.tier - b.tier)));
                setMf({ ...mf, name: '' });
              }}>Add</button>
            </div>
            <div class="note2" style="margin-top:8px">A mythic feat is the mythic version of a feat you already have.{my.feats[0] && <> Yours is <b>{my.feats[0].name}</b>.</>}</div>
          </div>

          <div class="card">
            <h3>Ability score increases<span class="nt">tiers 2, 4, 6, 8, 10</span></h3>
            {[2, 4, 6, 8, 10].filter((t) => t <= Math.max(T, 2)).map((t) => {
              const got = my.abilityScores.find((a) => a.tier === t);
              return (
                <div class={'fx ' + (t <= T ? 'on mythic' : 'off')}>
                  <div class="fxh">
                    <div class="fxn">{got ? `${got.abil} +${got.v || 2}` : <span class="note2">not assigned</span>}<span class="fxsrc">tier {t}{t > T ? ' — not reached yet' : ''}</span></div>
                    {got && <button class="x" title="Remove" onClick={() => update((d) => void (d.mythic.abilityScores = d.mythic.abilityScores.filter((a) => a.tier !== t)))}>×</button>}
                  </div>
                  {got && <div class="fxm">Already counted in your {got.abil} score of <b>{ch.ab[got.abil]}</b> above — this is the record of where it came from.</div>}
                </div>
              );
            })}
            <div class="pick">
              <select value={as.abil} onChange={(e) => setAs({ ...as, abil: (e.target as HTMLSelectElement).value as Ability })}>{ABILITIES.map((k) => <option>{k}</option>)}</select>
              <input type="number" class="w3" value={as.tier} min={2} max={10} step={2} onInput={(e) => setAs({ ...as, tier: intOf(e) })} />
              <button class="go" onClick={() => update((d) => {
                const t = Math.max(2, Math.min(10, as.tier || 2));
                d.mythic.abilityScores = [...d.mythic.abilityScores.filter((a) => a.tier !== t), { tier: t, abil: as.abil, v: 2 }].sort((a, b) => a.tier - b.tier);
              })}>Record</button>
            </div>
            <div class="note2" style="margin-top:8px">Recording it here does not change the score — type the new score into the box at the top of the sheet. This is the paper trail.</div>
          </div>
        </div>

        <div>
          <div class="card">
            <h3>Arch-Mage arcana<span class="nt">chosen once, permanent</span></h3>
            {Object.entries(ARCHMAGE_ARCANA).map(([k, a]) => {
              const chosen = my.arcana === k;
              return (
                <div class={'fx ' + (chosen ? 'on mythic' : 'off')}>
                  <div class="fxh">
                    <div class="fxn">{k}</div>
                    {chosen ? <span class="lockpill">yours</span>
                      : <button class="sm" onClick={() => confirm(`Your arcana is a permanent choice. Change it to ${k}?`) && update((d) => void (d.mythic.arcana = k))}>Choose</button>}
                  </div>
                  <div class="fxm" style="font-family:var(--serif);font-size:13px;color:var(--dim)">{a.b}</div>
                  {a.m && <div class="fxm"><span class="src">{a.m(ctx)}</span></div>}
                </div>
              );
            })}
          </div>

          <div class="card">
            <h3>What every mythic hero gets<span class="nt">by tier</span></h3>
            {T === 0 ? <div class="empty2">Not mythic yet.</div>
              : Array.from({ length: T }, (_, k) => k + 1).flatMap((t) => (MYTHIC_TIERS[t]?.base || []).map((n) => {
                const def = MYTHIC_BASE[n];
                return (
                  <div class="fx on mythic">
                    <div class="fxh"><div class="fxn">{n}<span class="fxsrc">gained at tier {t}</span></div></div>
                    {def && <div class="fxm" style="font-family:var(--serif);font-size:13px;color:var(--dim)">{def.b}</div>}
                    {def?.m && <div class="fxm"><span class="src">{def.m(ctx)}</span></div>}
                  </div>
                );
              }))}
          </div>

          <div class="card">
            <h3>Bonus hit points<span class="nt">Arch-Mage grants these per tier</span></h3>
            <div class="mr">
              <div class="top"><span class="lbl">Mythic bonus HP</span><span class="tt">+{per * T}</span></div>
              <div class="why">
                <b>{per}</b> per tier × <b>{T}</b> tiers = <b>{per * T}</b><br />
                <span class="src">Arch-Mage: "Whenever you gain an archmage tier, you gain 3 bonus hit points."</span><br />
                These stack with themselves and do not change your Hit Dice.
              </div>
            </div>
            {/* v36 told the player to check this; table ruling 10 confirmed it. */}
            <div class="note2" style="margin-top:8px">Your max HP of <b>{ch.hpmax}</b> already includes these {per * T} (table ruling 10).</div>
            <div class="addrow" style="margin-top:8px">
              <span style="flex:1;font-size:13px">Bonus HP per tier</span>
              <input type="number" class="w3" value={per} min={0} onChange={(e) => update((d) => void (d.mythic.bonusHpPerTier = Math.max(0, intOf(e))))} />
            </div>
          </div>

          <div class="card">
            <h3>Tier track<span class="nt">where you are and what's next</span></h3>
            <div class="ttab">
              {Array.from({ length: 10 }, (_, k) => k + 1).map((t) => {
                const info = MYTHIC_TIERS[t];
                const got = my.abilities.find((a) => a.tier === t);
                return (
                  <div class={'tr ' + (t === T ? 'now' : t > T ? 'future' : '')}>
                    <div class="tn">{t}</div>
                    <div class="tc">
                      {info.base.join(' · ')}{info.feat && ' · Mythic feat'}{info.abil && <> · <b>+2 to an ability score</b></>} · One path ability
                      {got && <> · <b>{got.name}</b></>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div class="note2" style="margin-top:8px">Mythic tiers come from completing <b>trials</b>, not from levelling. When your DM awards one, raise the tier at the top of the sheet.</div>
          </div>
        </div>
      </div>
    </>
  );
}
