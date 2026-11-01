# Decisions

Choices made with Ryan, in order. Each entry says what was decided and why, so a later
engineer doesn't re-open a settled question.

---

## 2026-11-01 — Architecture for the rebuild

**Code and character data are separated.** The code is a static site built from this repo
and deployed to GitHub Pages by GitHub Actions; the browser never writes code back. The
character is a versioned JSON document stored in the browser (IndexedDB), with Export /
Import to a `.json` file. This removes the autosave hazard in `HANDOFF.md` §6 by
construction. Each save carries a revision number so a stale tab reloads instead of
overwriting newer data.

**Stack:** TypeScript, Preact, Vite, Vitest. Installable offline web app (PWA): once
loaded, it works with no signal.

**One character now, more later.** Ryan wants other characters eventually but the focus is
Kaldaran. So: anything Kaldaran-specific (house rulings, specialist school, Brug, Magical
Lineage) lives in the character document, never in code; storage is keyed by character
id. No character-picker UI until it is needed.

**One device now, sync later.** Ryan uses a single device today. Multi-device sync (e.g. a
small hosted backend) can be added on top of the local store later; the local, offline copy
stays the source of truth at the table.

**Migration order:** baseline v36 → port `runSelfTests()` to Vitest → port pure rules →
port UI tab by tab → import v36 data and confirm every number matches → switch over. v36
remains usable at the table until parity.

## 2026-11-01 — Data clean-ups approved (apply in the rebuild, not in v36)

Approved by Ryan. These touch the character data, so they are applied as an explicit,
logged step when the data moves into the new app — never silently.

1. **Ring of Sustenance description** currently reads "a full night's rest takes 2 hours
   instead of 8". House ruling 6 says the full 8 hours still applies. Reword the item text
   to match the ruling.
2. **Oath of Anonymity** and **Vacuous Vessel** are not on d20pfsrd and their source book is
   unknown. Mark both as *unsourced* on the sheet.
3. **Detect Poison, Dancing Lights, Flare, Open/Close** have no description in the
   spellbook. Fill them in from each spell's own d20pfsrd page, with the link.

## 2026-11-01 — Deliberate differences between v36 and the repo build

Everything else is a straight port. A difference not listed here is a bug in the port.

**Bugs in v36 fixed in the port**

1. **Dark theme tokens.** `--hair`, `--shade1-3`, `--scrim`, `--tint` and `--onblue` were defined
   as themselves (`--hair:var(--hair)`), which is invalid CSS, so in dark mode every hairline,
   shadow and the modal backdrop vanished. They now have real dark values.
2. **Surge roll rolled a d20.** The die size was parsed with `slice(2)` from "+1d6", giving
   "d6" → NaN → the roller's default d20. It now rolls the surge die.
3. **Level-up "Spells per day" left out the specialist slot**, so it showed one slot fewer
   than the sheet actually gives. Now included.
4. **Level-up ability-score advice was inverted.** At Int 23 it said raising Int to 24 "would
   give you nothing"; 24 raises the modifier from +6 to +7. Now computed from the score.
5. **Scribed scrolls were filed in slot `'pack'`**, which is not a slot (worn/carried/stowed),
   so their slot buttons showed none selected. Now `carried`.
6. **CMD self-test used the AC size modifier** instead of the special size modifier. It passed
   only because Kaldaran is Medium. Fixed, plus a Reduce Person check that pins the direction.
7. **"Give it back" on Today removed a spell's effect even if another prepared copy was
   still cast.** Now matches the Spellbook: the effect ends when no copy is still spent.
8. **"Prepare same as last time" didn't reset metamagic**, leaving `prepMeta` misaligned with
   `prep`. It now resets it with the copy.
9. **Store race (new code, found in testing).** A fast reload could leave the sheet on
   "Loading…" forever; and hiding a tab saved a new revision, which marked other open tabs
   out of date. Both fixed and covered by `scripts/check-flows.cjs`.

**Text that contradicted the sheet's own rulings, corrected**

- HP help said a night's rest heals 1 × level — table ruling 5 says 2 ×.
- HP help said Hard to Kill keeps you conscious; the Mythic tab (and the Hard to Kill text)
  say you are stabilized but unconscious. Aligned with the Mythic tab. (Both still on
  VERIFY.md.)
- AC help told the player to cast Mage Armor every morning — ruling 4 dropped that.
- Mystic Past Life help suggested asking the DM to reassign three picks — ruling 8 settled it.
- "Why only 9 HD when I get 8 uses?" had both numbers typed in; now computed.
- The Mythic tab told the player to check the max HP includes both tiers — ruling 10 confirms it.
- "No elemental tongues — no Ignan…" stayed on screen after Ignan was learned; it now lists
  only the ones still missing.
- Removed "DC 15 + spell level if you're merely grappled or shaken" from the Concentration row:
  RAW grappled is 10 + grappler's CMB + spell level. The Concentration helper still uses
  v36's 15 + spell level for the no-damage case until verified (VERIFY.md).

**Removed on purpose**

- Save / Save As / "link to a file" / the build-stamp guard: the code is no longer saved at all
  (ARCHITECTURE M6). Export / Import replace moving the file around.
- "Reset entire sheet": replaced by Backups → Restore and Import. Nothing should be able to
  wipe the character in one click.

**Added**

- Manual edits to current HP are recorded in the hit-point log ("set by hand").
- Notes tab: export/import (accepts an export, a bare document, or the old
  `Kaldaran_Sheet.html`), restorable backups, and a log of every change a format upgrade made
  to the data.
- Traits are character data, editable on the Character tab (they were hard-coded in v36).
