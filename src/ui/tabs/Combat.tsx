import { sgn, poor, good } from '../../rules/core';
import { derive } from '../../rules/derive';
import { mergeRes } from '../../rules/stacking';
import { graveTouchRounds, schoolPowerUses } from '../../rules/powers';
import { EffectsManager } from '../components/EffectsManager';
import { MathRow, Receipt, Rollable } from '../components/Receipt';
import { update, useCh } from '../store';

const intOf = (e: Event) => parseInt((e.target as HTMLInputElement).value) || 0;

export function Combat() {
  const ch = useCh();
  const C = derive(ch), m = C.m, R = C.R, L = ch.lvl;
  const acParts = [<><b>10</b> base</>, C.dexDenied && C.dexAC
    ? <span class="supp">✗ {sgn(m.Dex)} Dex — {C.dexDenied}: you lose your Dex bonus to AC</span>
    : <>{sgn(m.Dex)} <b>Dex</b></>];
  // CHARACTER-SPECIFIC: "Reactionary trait" label on +2 misc init; Lifebound note on Fort.
  const reactionary = ch.traits.some((t) => /^reactionary/i.test(t));
  const lifebound = ch.traits.some((t) => /^lifebound/i.test(t));

  return (
    <>
      <div class="big">
        {([
          ['AC', C.AC, 'incl. all effects'], ['Touch', C.touch, 'no armor/natural'], ['Flat-Footed', C.ff, 'no Dex, no dodge'],
          ['CMD', C.cmd, '10+BAB+Str+Dex'], ['Fort', sgn(C.fort), 'poor save'], ['Ref', sgn(C.ref), 'poor save'],
          ['Will', sgn(C.will), 'good save'], ['Init', sgn(C.init), 'Dex + misc'],
        ] as const).map(([l, v, w]) => (
          <div class="c"><div class="l">{l}</div><div class="v">{v}</div><div class="w">{w}</div></div>
        ))}
      </div>
      <div class="g2">
        <div>
          <div class="card">
            <h3>Armor Class</h3>
            <MathRow label="Armor Class" total={C.AC} help="ac"><Receipt parts={acParts} res={R.ac} /></MathRow>
            <MathRow label="Touch AC" total={C.touch} help="touchac">
              <Receipt parts={acParts} res={R.acT} hideSuppressed />
              <br /><span class="note2">Armor, shield and natural armor never apply against a touch attack.</span>
            </MathRow>
            <MathRow label="Flat-Footed AC" total={C.ff} help="flatfooted">
              <Receipt parts={[<><b>10</b> base</>, C.dexAC ? <span class="supp">✗ {sgn(m.Dex)} Dex — you lose your Dex bonus when flat-footed</span> : '']} res={R.acFF} hideSuppressed />
              <br /><span class="note2">Your AC before you have acted, or when caught off guard. Dodge bonuses drop too.</span>
            </MathRow>
          </div>
          <div class="card">
            <h3>Saving Throws</h3>
            <MathRow label="Fortitude" total={<Rollable v={C.fort} label="Fortitude save" />} help="fort">
              <Receipt parts={[<><b>{poor(L)}</b> wizard base (poor progression)</>, <>{sgn(m.Con)} <b>Con</b></>, ch.sv.fort ? `${sgn(ch.sv.fort)} misc` : '']} res={R.fortR} />
              {lifebound && <><br /><span class="src">Lifebound</span>: +2 more vs. death effects, negative energy, negative levels, and Con checks to stabilize.</>}
            </MathRow>
            <MathRow label="Reflex" total={<Rollable v={C.ref} label="Reflex save" />} help="ref">
              <Receipt parts={[<><b>{poor(L)}</b> wizard base (poor)</>, <>{sgn(m.Dex)} <b>Dex</b></>, ch.sv.ref ? `${sgn(ch.sv.ref)} misc` : '']} res={R.refR} />
            </MathRow>
            <MathRow label="Will" total={<Rollable v={C.will} label="Will save" />} help="will">
              <Receipt parts={[<><b>{good(L)}</b> wizard base (good progression)</>, <>{sgn(m.Wis)} <b>Wis</b></>, ch.sv.will ? `${sgn(ch.sv.will)} misc` : '']} res={R.willR} />
            </MathRow>
            <div class="sechd">Misc modifiers</div>
            {(['fort', 'ref', 'will'] as const).map((k) => (
              <div style="display:flex;align-items:center;gap:8px;padding:4px 0">
                <span style="flex:1;font-size:13px">{{ fort: 'Fort', ref: 'Ref', will: 'Will' }[k]}</span>
                <input type="number" class="w3" value={ch.sv[k]} onChange={(e) => update((d) => void (d.sv[k] = intOf(e)))} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div class="card">
            <h3>Attack &amp; Initiative</h3>
            <MathRow label="Initiative" total={<Rollable v={C.init} label="Initiative" />} help="init">
              <Receipt parts={[<>{sgn(m.Dex)} <b>Dex</b></>, ch.initMisc ? <>{sgn(ch.initMisc)} misc{reactionary && ch.initMisc === 2 && <span class="src"> Reactionary trait</span>}</> : '']} res={R.initR} />
            </MathRow>
            <MathRow label="Base attack bonus" total={sgn(C.bab)} help="bab">
              Wizard is a <b>poor BAB</b> class — half your level, rounded down. Level {L} ÷ 2 = <b>{C.bab}</b>.
            </MathRow>
            <MathRow label="Melee attack" total={<Rollable v={C.melee} label="Melee attack" />}>
              <Receipt parts={[<>{sgn(C.bab)} <b>BAB</b></>, <>{sgn(m.Str)} <b>Str</b></>]} res={R.melR} />
            </MathRow>
            <MathRow label="Ranged / ray attack" total={<Rollable v={C.ranged} label="Ranged touch attack" />}>
              <Receipt parts={[<>{sgn(C.bab)} <b>BAB</b></>, <>{sgn(m.Dex)} <b>Dex</b></>]} res={R.rngR} />
              <br /><span class="note2">Use this for Acid Arrow, Scorching Ray, and any ranged touch spell.</span>
            </MathRow>
            <MathRow label="CMB" total={sgn(C.cmb)} help="cmb">
              <Receipt parts={[<>{sgn(C.bab)} <b>BAB</b></>, <>{sgn(m.Str)} <b>Str</b></>, C.sizeCM ? `${sgn(C.sizeCM)} special size modifier` : '']} res={R.cmbR} />
            </MathRow>
            <MathRow label="CMD" total={C.cmd} help="cmd">
              <Receipt parts={['10', <>{sgn(C.bab)} <b>BAB</b></>, <>{sgn(m.Str)} <b>Str</b></>, <>{sgn(m.Dex)} <b>Dex</b></>, C.sizeCM ? `${sgn(C.sizeCM)} special size modifier` : '']} res={mergeRes(R.acToCMD, R.cmdR)} />
              <br /><span class="note2">CMD adds only circumstance, deflection, dodge, insight, luck, morale, profane and sacred bonuses to AC — never armor, shield, natural armor or enhancement. The special size modifier is the mirror of the AC one: Small is +1 AC but −1 CMD.</span>
            </MathRow>
            <MathRow label="Caster level" total={C.cl} help="casterlevel">
              <Receipt parts={[<><b>{L}</b> wizard level</>]} res={R.clR} />
              {/* d20pfsrd, Archmage → Wild Arcana: "you treat your caster level as 2 levels higher
                  for the purpose of any effect dependent on level." */}
              {ch.mythic.arcana === 'Wild Arcana' && ch.tier > 0 && <><br /><span class="src">Wild Arcana casts at +2 = CL {C.cl + 2} for anything that depends on level.</span></>}
            </MathRow>
            <MathRow label="Concentration" total={<Rollable v={C.conc} label="Concentration" />} help="conc">
              <Receipt parts={[<><b>{L}</b> caster level</>, <>{sgn(m.Int)} <b>Int</b></>]} res={mergeRes(R.clR, R.concR)} />
              <br /><span class="src">DC = 10 + damage taken + spell level</span> if you get hit while casting. Fail and the spell is gone.
            </MathRow>
            <div style="display:flex;align-items:center;gap:8px;padding:8px 0 0">
              <span style="flex:1;font-size:13px">Initiative misc</span>
              <input type="number" class="w3" value={ch.initMisc} onChange={(e) => update((d) => void (d.initMisc = intOf(e)))} />
            </div>
          </div>
          <div class="card">
            <h3>Attacks</h3>
            <table>
              <tbody>
                <tr><th>Attack</th><th style="text-align:right">To hit</th><th style="text-align:right">Damage</th></tr>
                {/* CHARACTER-SPECIFIC: Kaldaran's weapon list. */}
                <tr>
                  <td>Quarterstaff<div class="tiny">{sgn(C.bab)} BAB {sgn(m.Str)} Str</div></td>
                  <td class="n"><b data-calc-title="Quarterstaff to hit" data-calc={`${sgn(C.melee)} = ${sgn(C.bab)} BAB ${sgn(m.Str)} Str. Melee attack vs normal AC.`}><Rollable v={C.melee} label="Quarterstaff" /></b></td>
                  <td class="n">1d6 · ×2</td>
                </tr>
                <tr><td>Wand of Magic Missile<div class="tiny">auto-hit, no save, no SR</div></td><td class="n">—</td><td class="n">1d4+1 per missile</td></tr>
                {ch.specialist === 'Necromancy' && ch.subschool !== 'undead' && (
                  <tr>
                    <td>Grave Touch <span class="badge">Necro</span><div class="tiny">melee touch · {schoolPowerUses(m.Int)}/day = 3 + Int mod</div></td>
                    <td class="n"><b data-calc-title="Grave Touch to hit" data-calc={`${sgn(C.melee)} = ${sgn(C.bab)} BAB ${sgn(m.Str)} Str. Melee touch attack vs touch AC.`}><Rollable v={C.melee} label="Grave Touch" /></b></td>
                    <td class="n">shaken {graveTouchRounds(L)} rds</td>
                  </tr>
                )}
                <tr>
                  <td>Rays &amp; touch spells<div class="tiny">{sgn(C.bab)} BAB {sgn(m.Dex)} Dex</div></td>
                  <td class="n"><b data-calc-title="Ray / touch spell to hit" data-calc={`${sgn(C.ranged)} = ${sgn(C.bab)} BAB ${sgn(m.Dex)} Dex. Ranged touch attack vs touch AC.`}><Rollable v={C.ranged} label="Ray / touch spell" /></b></td>
                  <td class="n">by spell</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="card">
        <h3>Active effects</h3>
        <EffectsManager />
      </div>
    </>
  );
}
