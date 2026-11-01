// CHARACTER — school powers, undead, racial spell-likes, feats, traits.
import { useState } from 'preact/hooks';
import { mods } from '../../rules/derive';
import { mythicPower } from '../../rules/mythic-math';
import { bolsterBonus, commandUndeadDC, graveTouchRounds, SAMSARAN_SLAS, schoolPowerUses } from '../../rules/powers';
import { saveDC } from '../../rules/spells';
import { capsOf, poolHD } from '../../rules/undead';
import { ListEditor } from '../components/ListEditor';
import { Pip } from '../components/Pips';
import { update, useCh } from '../store';

function Pool({ pool, title, cap, note, addLabel, help }: { pool: 'anim' | 'cmd'; title: string; cap: number; note: preact.ComponentChildren; addLabel: string; help: string }) {
  const ch = useCh();
  const [n, setN] = useState('');
  const [hd, setHd] = useState(1);
  const used = poolHD(ch, pool);
  const over = used > cap;
  const add = () => {
    const v = n.trim();
    if (!v) return;
    update((d) => void d.undead.push({ n: v, hd: Math.max(1, hd || 1), pool }));
    setN('');
  };
  return (
    <div style="margin-bottom:16px">
      <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
        <span style="font-size:15px" data-help={help}>{title} <span class="qm">?</span></span>
        <span class={'hdnum' + (over ? ' over' : '')} style="margin-left:auto">{used} / {cap} HD</span>
      </div>
      <div class="hdbar"><div class={'hdfill' + (over ? ' over' : '')} style={{ width: `${cap ? Math.min(100, (used / cap) * 100) : 0}%` }} /></div>
      {over && <div class="hdnum over">OVER YOUR LIMIT — the excess breaks free of your control.</div>}
      <div class="hdnum" style="margin-top:3px"><span style="color:var(--gold)">{note}</span></div>
      <div style="margin-top:7px">
        {ch.undead.map((u, i) => (u.pool || 'anim') === pool && (
          <div class="min">
            <span class="mn">{u.n}</span>
            <input type="number" class="hd" value={u.hd} min={1} title="Hit Dice" onChange={(e) => update((d) => void (d.undead[i].hd = Math.max(1, parseInt((e.target as HTMLInputElement).value) || 1)))} />
            <span class="tiny">HD</span>
            <button class="x" title={pool === 'anim' ? 'Move to the Command Undead pool' : 'Move to the Animate Dead pool'} onClick={() => update((d) => void (d.undead[i].pool = pool === 'anim' ? 'cmd' : 'anim'))}>⇄</button>
            <button class="x" title="Destroyed or released" onClick={() => update((d) => void d.undead.splice(i, 1))}>×</button>
          </div>
        ))}
        {!ch.undead.some((u) => (u.pool || 'anim') === pool) && <div class="empty2">{pool === 'anim' ? 'Nothing raised.' : 'Nothing enslaved.'}</div>}
      </div>
      <div class="addrow">
        <input placeholder={addLabel} value={n} onInput={(e) => setN((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <input type="number" class="w3" value={hd} min={1} title="Hit Dice" onInput={(e) => setHd(parseInt((e.target as HTMLInputElement).value) || 1)} />
        <button class="go" onClick={add}>{pool === 'anim' ? 'Raise' : 'Enslave'}</button>
      </div>
    </div>
  );
}

export function Character() {
  const ch = useCh();
  const m = mods(ch), L = ch.lvl, T = ch.tier | 0;
  const mpM = mythicPower(T), gt = schoolPowerUses(m.Int);
  const caps = capsOf(ch);
  const isNecro = ch.specialist === 'Necromancy'; // CHARACTER-SPECIFIC
  const isSamsaran = (ch.identity.race || '') === 'Samsaran'; // CHARACTER-SPECIFIC
  const knowsCmdSpell = ch.book.some((b) => b.n.toLowerCase() === 'command undead' && b.lv === 2);

  return (
    <div class="g2">
      <div>
        {T > 0 && (
          <div class="card">
            <h3>Mythic — {ch.mythic.path}</h3>
            <Pip name="Mythic Power" sub={<span class="src">3 + (2 × tier {T}) = {mpM}/day</span>} cur={mpM - ch.used.mythic} max={mpM} cls="y" onSet={(v) => update((d) => void (d.used.mythic = mpM - v))} />
          </div>
        )}
        {isNecro && (
          <div class="card">
            <h3>Necromancy School</h3>
            <Pip name={<>Command Undead <span class="nt" style="font-style:normal">via Power over Undead</span></>} help="commandUndead" cls="g" cur={gt - ch.used.cmd} max={gt}
              sub={<>Standard action, enslave one undead within 30 ft. Will DC {commandUndeadDC(L, m.Cha)} negates. <span class="src">3 + Int mod ({m.Int}) = {gt} channel uses/day</span></>}
              onSet={(v) => update((d) => void (d.used.cmd = gt - v))} />
            {ch.subschool === 'undead'
              ? <Pip name="Bolster" cls="g" cur={gt - ch.used.grave} max={gt}
                  sub={<>Touch an undead: +{bolsterBonus(L)} profane to its attacks and saves, 1 temp hp per HD, +2 turn resistance, {graveTouchRounds(L)} rounds. <span class="src">3 + Int mod ({m.Int}) = {gt}/day</span></>}
                  onSet={(v) => update((d) => void (d.used.grave = gt - v))} />
              : <Pip name="Grave Touch" help="graveTouch" cls="g" cur={gt - ch.used.grave} max={gt}
                  sub={<>Melee touch — target is shaken {graveTouchRounds(L)} rounds. <span class="src">3 + Int mod ({m.Int}) = {gt}/day</span></>}
                  onSet={(v) => update((d) => void (d.used.grave = gt - v))} />}
            <div style="margin-top:10px;padding-top:9px;border-top:1px solid var(--line)">
              <div class="sechd" style="margin-top:0">Necromancy specialist</div>
              <div class="note2" style="margin:4px 0 7px">
                You get <b>two</b> school powers. <b>Power over Undead</b> is always one of them — that is where your Command Undead feat and its {gt} channel uses come from, and no subschool takes it away.
                The second is <b>Grave Touch</b> unless you took the <b>Undead subschool</b>, which swaps it for <b>Bolster</b>.
              </div>
              <select style="width:100%" value={ch.subschool} onChange={(e) => update((d) => void (d.subschool = (e.target as HTMLSelectElement).value))}>
                <option value="">Plain Necromancy — Power over Undead + Grave Touch</option>
                <option value="undead">Undead subschool — Power over Undead + Bolster (replaces Grave Touch)</option>
              </select>
              <div class="note2" style="margin-top:8px">Specialising also gives you <b>one extra spell slot at every spell level</b>, which must hold a {ch.specialist} spell. It is counted in your slots.</div>
            </div>
          </div>
        )}
        {isNecro && (
          <div class="card">
            <h3>Your undead<span class="nt">creations and thralls you control</span></h3>
            <Pool pool="anim" title="Raised by Animate Dead" cap={caps.strictCap} help="undeadCap" addLabel="Skeleton, zombie…"
              note={ch.strictUndead
                ? <>Strict reading: 4 HD × wizard level {L} = {caps.strictCap}. One casting still raises {caps.perCast} HD.</>
                : <>Wizard {L} + 4 (Undead Master) + {T} (mythic) = caster level <b>{caps.animCL}</b> (table ruling 9).<br />4 HD × {caps.animCL} = <b>{caps.strictCap} HD</b> you can hold. One casting raises up to {caps.perCast} HD.</>} />
            <Pool pool="cmd" title="Enslaved by the Command Undead feat" cap={caps.cmdCap} help="cmdCap" addLabel="Ghoul, wight, skeleton you found…"
              note={<>Cap is your level, not your caster level: {L} + 4 (Undead Master) + {T} (mythic) = <b>{caps.cmdCap} HD</b>.<br />
                You get <b>{gt} attempts per day</b> — that is how often you can TRY, not how many you can keep.<br />
                Will save DC {commandUndeadDC(L, m.Cha)} to resist (10 + half your wizard level + Cha).</>} />
            <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--faint);margin-top:4px;cursor:pointer">
              <input type="checkbox" checked={ch.strictUndead} style="width:auto" onChange={(e) => update((d) => void (d.strictUndead = (e.target as HTMLInputElement).checked))} />
              <span>Strict reading — count Undead Master only toward how many you raise per casting, not the total you hold (drops your cap to {4 * L}). Table ruling 9 uses the generous reading, so this stays off.</span>
            </label>
            <div class="hdnum" data-help="commandUndeadSpell" style={knowsCmdSpell ? 'color:var(--grave)' : ''}>
              {knowsCmdSpell
                ? <>The <b>command undead</b> SPELL is in the spellbook, separate from the feat of the same name. Duration <b>{3 * L} days</b>, tripled by Undead Master (Mythic).</>
                : <><b>Two different things share this name.</b> The <b>Command Undead FEAT</b> is the {gt}/day power above, from Power over Undead. The <b>command undead SPELL</b> is 2nd level and not in the spellbook — a third control method counting against neither cap, lasting <b>{3 * L} days</b> with Undead Master (Mythic). Save DC {saveDC(ch, 2, 'Necromancy', m.Int)}.</>}
            </div>
          </div>
        )}
        {isSamsaran && (
          <div class="card">
            <h3>Samsaran Magic<span class="nt">racial, 1/day each</span></h3>
            {SAMSARAN_SLAS.map(([k, n, hk]) => (
              <Pip name={n} help={hk} sub={<span class="src">Samsaran Magic — 1/day, CL {L}</span>} cur={1 - ch.used[k]} max={1} onSet={(v) => update((d) => void (d.used[k] = 1 - v))} />
            ))}
          </div>
        )}
      </div>
      <div>
        <div class="card">
          <h3>Feats</h3>
          <ListEditor items={ch.feats} placeholder="Add a feat…" onChange={(next) => update((d) => void (d.feats = next))} />
        </div>
        <div class="card">
          <h3>Traits &amp; Racial</h3>
          <ListEditor items={ch.traits} placeholder="Add a trait…" onChange={(next) => update((d) => void (d.traits = next))} />
        </div>
      </div>
    </div>
  );
}
