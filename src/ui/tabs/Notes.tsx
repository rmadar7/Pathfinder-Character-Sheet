// NOTES — table rulings, open questions, what a rest restores, diagnostics, backups,
// export/import, description and backstory.
import { useEffect, useState } from 'preact/hooks';
import { loadIndex, loadOGL } from '../../compendium/load';
import type { CompendiumIndex } from '../../compendium/types';
import { fromImport, fromLegacyHtml, listBackups, toExport, type Backup } from '../../model/storage';
import { mods } from '../../rules/derive';
import { mythicPower } from '../../rules/mythic-math';
import { restHeal, restHealRAW, schoolPowerUses } from '../../rules/powers';
import { runSelfTests } from '../../rules/selftest';
import { ListEditor } from '../components/ListEditor';
import { replaceCharacter, update, useCh } from '../store';

const ID_FIELDS: [string, string][] = [
  ['Name', 'name'], ['Race', 'race'], ['Class', 'classLabel'], ['Role', 'role'], ['Alignment', 'alignment'], ['Age', 'age'],
  ['Height', 'height'], ['Weight', 'weight'], ['Hair', 'hair'], ['Eyes', 'eyes'], ['Skin', 'skin'], ['Homeland', 'homeland'],
];

function Diagnostics() {
  const ch = useCh();
  const { checks, issues } = runSelfTests(ch);
  const fails = checks.filter((x) => !x.ok), warn = issues.filter((x) => !x.ok);
  return (
    <div>
      <div class="tiny" style={{ fontSize: '11px', marginBottom: '4px', color: fails.length ? 'var(--rust)' : 'var(--grave)' }}>
        RULES ENGINE — {fails.length ? `${fails.length} of ${checks.length} FAILED` : `all ${checks.length} checks pass`}
      </div>
      {checks.map((x) => (
        <div style="display:flex;gap:9px;padding:3px 0;font-size:12px;border-bottom:1px solid var(--hair)">
          <span class="tiny" style={{ color: x.ok ? 'var(--grave)' : 'var(--rust)' }}>{x.ok ? 'PASS' : 'FAIL'}</span>
          <span style="flex:1">{x.name}</span>
          <span class="tiny" style="font-size:11px">{x.ok ? x.why : `got ${x.got}, expected ${x.want}`}</span>
        </div>
      ))}
      <div class="tiny" style={{ fontSize: '11px', margin: '14px 0 4px', color: warn.length ? 'var(--gold)' : 'var(--grave)' }}>
        YOUR CHARACTER — {warn.length ? `${warn.length} thing${warn.length === 1 ? '' : 's'} to look at` : 'nothing outstanding'}
      </div>
      {issues.map((x) => (
        <div style="padding:4px 0;font-size:12px;border-bottom:1px solid var(--hair)">
          <div style="display:flex;gap:9px">
            <span class="tiny" style={{ color: x.ok ? 'var(--grave)' : 'var(--gold)' }}>{x.ok ? 'OK' : 'LOOK'}</span>
            <span style="flex:1">{x.name}</span>
            <span class="tiny" style="font-size:11px">{x.detail}</span>
          </div>
          {x.fix && <div class="note2" style="margin-left:38px">{x.fix}</div>}
        </div>
      ))}
    </div>
  );
}

function Backups() {
  const ch = useCh();
  const [list, setList] = useState<Backup[]>([]);
  const [msg, setMsg] = useState('');
  useEffect(() => void listBackups(ch.id).then(setList), [ch.id, ch.savedAt]);

  const download = () => {
    const blob = new Blob([JSON.stringify(toExport(ch), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `${(ch.identity.name || ch.id).replace(/\W+/g, '_')}_${stamp}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const importFile = async (f: File) => {
    try {
      const text = await f.text();
      const raw = /\.html?$/i.test(f.name) ? fromLegacyHtml(text) : fromImport(text);
      if (!confirm(`Replace the character on this sheet with the one in ${f.name}? The current one is backed up first.`)) return;
      await replaceCharacter(raw, `import of ${f.name}`);
      setMsg(`Imported ${f.name}. The previous version is in the backups below.`);
      setList(await listBackups(ch.id));
    } catch (e) {
      setMsg('Could not import: ' + (e as Error).message);
    }
  };
  return (
    <>
      <div class="addrow">
        <button class="go" onClick={download}>Export character (.json)</button>
        <label class="btnlike">
          Import a file…
          <input type="file" accept=".json,.html,application/json,text/html" style="display:none"
            onChange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) void importFile(f); (e.target as HTMLInputElement).value = ''; }} />
        </label>
      </div>
      <div class="note2" style="margin-top:5px">Export saves your character as a file you can keep or move to another device. Import accepts an export, or an old Kaldaran_Sheet.html.</div>
      {msg && <div class="flag">{msg}</div>}
      <div class="tiny" style="text-transform:uppercase;margin:12px 0 7px">Backups — automatic rollback points, newest first</div>
      {!list.length && <div class="empty2">None yet. One is taken before every rest, level-up and import.</div>}
      {list.map((b) => (
        <div class="res">
          <div class="rn">{b.label}<small>{new Date(b.t).toLocaleString()} · level {b.lvl} · {b.hp} hp</small></div>
          <button class="sm" onClick={() => confirm(`Restore the backup "${b.label}"? Your current version is backed up first.`) && void replaceCharacter(b.doc, `restore of "${b.label}"`)}>Restore</button>
        </div>
      ))}
    </>
  );
}

/** Open Game License notice for the Lookup data (OGL §6, §10: the license travels with the
 *  content, with the copyright notices of what it came from). */
function GameContentLicense() {
  const [open, setOpen] = useState(false);
  const [ogl, setOgl] = useState('');
  const [ix, setIx] = useState<CompendiumIndex | null>(null);
  useEffect(() => { if (open && !ix) { loadIndex().then(setIx).catch(() => {}); loadOGL().then(setOgl).catch(() => {}); } }, [open]);
  return (
    <div class="card">
      <h3>Game content license</h3>
      <div class="note2">
        The rules text in Lookup is Open Game Content under the Open Game License 1.0a, imported from the Foundry VTT
        Pathfinder 1e system. Pathfinder is a trademark of Paizo Inc.; this is not an official Paizo product.
      </div>
      <button class="sm" onClick={() => setOpen(!open)}>{open ? 'Hide' : 'Show'} the license and sources</button>
      {open && (
        <>
          {ix && <div class="note2" style="margin-top:8px">Open Game Content from {Object.keys(ix.books).length} Paizo books, including {Object.values(ix.books).filter((b) => b.t === 'core').map((b) => b.n).join(', ')}. Imported from {ix.upstream} at {ix.commit.slice(0, 10)}.</div>}
          <div class="ogl">{ogl || 'Loading…'}</div>
        </>
      )}
    </div>
  );
}

export function Notes() {
  const ch = useCh();
  const m = mods(ch), L = ch.lvl;
  const gt = schoolPowerUses(m.Int), mpM = mythicPower(ch.tier);
  const refresh = ch.gear.filter((it) => it.uses && it.uses.regain > 0);
  const stat = ch.gear.filter((it) => it.uses && !(it.uses.regain > 0));
  return (
    <>
      <div class="card"><h3>Table rulings</h3><ListEditor bare items={ch.house} placeholder="Add a ruling…" addClass="go" onChange={(next) => update((d) => void (d.house = next))} /></div>
      <div class="card"><h3>Unresolved</h3><ListEditor bare items={ch.open} placeholder="Add an unresolved point…" onChange={(next) => update((d) => void (d.open = next))} /></div>
      <div class="card">
        <h3>A new day restores</h3>
        <ul class="pl">
          <li><div class="b"><b>Refills every spell slot</b> <small>— the spells you had prepared stay prepared. Change them on the Spellbook tab if you want a different loadout.</small></div></li>
          {ch.tier > 0 && <li><div class="b"><b>Mythic Power back to {mpM}</b></div></li>}
          {ch.specialist === 'Necromancy' && <li><div class="b"><b>Command Undead and {ch.subschool === 'undead' ? 'Bolster' : 'Grave Touch'} back to {gt} each</b></div></li>}
          {ch.identity.race === 'Samsaran' && <li><div class="b"><b>The three Samsaran spell-likes back to 1 each</b></div></li>}
          {refresh.map((it) => <li><div class="b"><b>{it.n} gains {it.uses!.regain} charge{it.uses!.regain === 1 ? '' : 's'}</b> <small>— up to its max of {it.uses!.max}.</small></div></li>)}
          <li><div class="b"><b>Heals {restHeal(L)} hp</b> <small>— twice your character level (table ruling 5). By the book 8 hours gives {restHealRAW(L)}, and twice that needs a full day and night of bed rest.</small></div></li>
          {stat.length > 0 && <li class="no"><div class="b"><b>Does NOT restore {stat.map((it) => it.n).join(', ')}</b> <small>— those are gone once used.</small></div></li>}
        </ul>
      </div>
      <div class="card">
        <h3>Diagnostics</h3>
        <Diagnostics />
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line)"><Backups /></div>
      </div>
      {ch.changelog.length > 0 && (
        <div class="card">
          <h3>Changes made to your data<span class="nt">by format upgrades, never silently</span></h3>
          <ul class="pl">{ch.changelog.map((c) => <li><div class="b">{c.what} <small>— {new Date(c.at).toLocaleDateString()}</small></div></li>)}</ul>
        </div>
      )}
      <div class="g2">
        <div class="card">
          <h3>Description</h3>
          {ID_FIELDS.map(([label, key]) => (
            <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--line)">
              <span style="flex:1">{label}</span>
              <input value={ch.identity[key] || ''} style="width:58%;text-align:right;font-family:var(--mono);font-size:12px;color:var(--faint)"
                onChange={(e) => update((d) => void (d.identity[key] = (e.target as HTMLInputElement).value))} />
            </div>
          ))}
        </div>
        <div class="card"><h3>Session notes</h3><textarea placeholder="Leads. Loot. What Brug ate." value={ch.notes} onInput={(e) => update((d) => void (d.notes = (e.target as HTMLTextAreaElement).value), undefined, 'notes')} /></div>
      </div>
      <GameContentLicense />
      <div class="card"><h3>Backstory</h3><textarea style="min-height:280px" value={ch.bio} onInput={(e) => update((d) => void (d.bio = (e.target as HTMLTextAreaElement).value), undefined, 'bio')} /></div>
    </>
  );
}
