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

## 2026-11-01 — VERIFY.md "Suspected problems" checked against d20pfsrd

Each rule was read on its own d20pfsrd page; the governing sentence is now quoted in the code
comment beside the implementation. Four were wrong and are fixed with tests
(`test/verified-rules.test.ts` and new Diagnostics checks); four were right and only gained
their citation. No house ruling was changed.

**Fixed**

1. **Concentration DC when not damaged.** v36 used a flat 15 + spell level for anything that
   wasn't damage and called it the grappled DC. d20pfsrd, *Magic → Concentration*, gives each
   cause its own DC: "Grappled or pinned while casting — 10 + grappler's CMB + spell level",
   "Cast defensively — 15 + double spell level", "Entangled while casting — 15 + spell
   level", plus damage, continuous damage, motion and weather. The Today tab's concentration
   box now asks *what happened* and uses that row (`concentrationDC` in `rules/powers.ts`).
2. **Blinded.** d20pfsrd, *Conditions → Blinded*: "It takes a –2 penalty to Armor Class, loses
   its Dexterity bonus to AC (if any)". v36 applied only the −2. Now Blinded also removes the
   Dex bonus (never a Dex penalty) from AC and touch AC, and — per *Combat → Dodge Bonuses*,
   "Any situation that denies you your Dexterity bonus also denies you dodge bonuses" — the
   dodge bonuses, which stay on the receipt struck through. Kaldaran blinded: AC 17 → 13.
   Whether Dex also leaves CMD is a DM question (VERIFY.md).
3. **Natural 1 on skill checks.** The Scriptorium said "you fail only on a natural 1". d20pfsrd
   makes a natural 1 an automatic failure for attacks ("A natural 1 … on an attack roll is
   always a miss") and combat maneuvers; *Skills* and *Spellcraft* have no such rule. When
   1 + bonus meets the DC it now says "you cannot fail — even a natural 1 makes it". It also
   shows the take-10 result (general *Skills → Taking 10* rule; DM to confirm, VERIFY.md).
   Taking 20 isn't offered: a failed check wastes materials, and taking 20 needs a check
   that "carries no penalties for failure".
4. **Recuperation.** d20pfsrd, *Mythic Heroes → Recuperation (Ex)*: "At 3rd tier, you are
   restored to full hit points after 8 hours of rest so long as you aren't dead", and 1
   mythic power + 1 hour of rest regains "half your full hit points" and daily class features,
   but "doesn't refresh uses of mythic power". v36's text said it "removes most conditions",
   which the ability doesn't say, and had no numbers. Now: from tier 3, the night's rest
   restores full hp (better than house ruling 5's 2 × level, which still applies below tier 3);
   `recuperate()` in `rules/actions.ts` implements the 1-hour version (no button yet — add it
   for the tier-3 walkthrough).

**Confirmed, citation added**

- **Wild Arcana caster level +2** is right: "you treat your caster level as 2 levels higher
  for the purpose of any effect dependent on level." Text now says "for anything that depends
  on level".
- **Command Undead DC uses Charisma**, not Int: Power over Undead, "10 + 1/2 your wizard level +
  your Charisma modifier." (The feat's own page says cleric level; the school power replaces
  that for a wizard.)
- **Enduring Armor = 3 + tier**: "an armor bonus to AC equal to 3 + your tier."
- **Hard to Kill does not keep you conscious**: it only stabilizes you and moves the death
  line to −2 × Con. The Mythic tab was right; the old HP help was wrong (already aligned).

## 2026-11-01 — Ryan's scoping answers; finishing the switch-over from v36

**Decisions** (full list in `PLAN.md` §10): the Foundry PF1e packs are approved as the
compendium source, PF1e only; books undecided; just this table for now but built to open up;
no optional rules; switch off v36 before the general work; no multi-device sync yet. The DM
hands out non-standard items and boons, so the sheet needs **custom bonuses** built from
structured lists, not free text.

**Parity with v36 is confirmed and now checkable.** `scripts/check-parity.cjs` imports a v36
file through the real Import button and compares every number on every tab with what v36 shows
for the same file. Every difference is either listed (with its reason) or fails the check. On
the repo's copy of Kaldaran it passes: no unexplained differences. Run it on Ryan's newest
v36 file on switch-over day (`docs/SWITCHOVER.md`).

**Approved clean-up 3 done:** Detect Poison, Dancing Lights, Flare and Open/Close now have
descriptions written from their own d20pfsrd pages, with the link on the spell card. Applied
by migration step 10 (schema 10), logged, and only where the description was empty.

**Custom bonuses (first version).** "Build a custom bonus" in the effects manager, and the
same bonus rows in the item editor: name, where it came from, how long it lasts, then any
number of bonuses, each picked from lists: *amount*, *bonus type* (with its stacking rule in
plain words), *what it applies to* (grouped: defence, saves, attacks, spellcasting, every
skill by name, ability scores, initiative), and optional *only when…* ("vs fear"). A
situational bonus is listed under the number it affects, not added to it. Custom effects can
be edited later. Items can now carry several bonuses (the editor used to edit only the first).

**Bugs found on the way, fixed with tests**

1. **"All spell DCs" and "Speed" did nothing.** Both were offered as effect targets, but no
   code read them, so a bonus to either was silently ignored. Spell DCs now include effect
   bonuses (shown on the spell card); Speed is removed from the list until speed is computed.
   A test now adds a bonus to every target the editor offers and fails if any number doesn't
   move.
2. **Same-type bonuses stacked across "all" and "one".** "All saves" and "Will" (likewise
   all attacks / melee, all skills / Stealth) were resolved separately and added, so a +2
   luck to all saves and a +1 luck to Will gave +3. Same-type bonuses to the same roll don't
   stack, so it is now +2, with the +1 shown struck through. `resolve()` takes several keys
   and stacks them as one pool.
3. **Concentration help on Today still said "DC 10 + damage taken + spell level"** for every
   case; it now points to the box that works out the DC by cause.
4. **`check:flows` dark-theme step was racy.** It read the theme attribute straight after the
   click, before the effect that sets it had run; it now waits for it. Not an app bug.

## 2026-11-01 — Bonus types limited to what they can apply to

Ryan built a test bonus, "+1 armor to Strength", because the editor offered every bonus type
for every target. An armor bonus can only ever apply to AC. The editor now offers only the
types d20pfsrd's bonus table (Common Terms → Bonus, "Can Affect" column) allows for the
chosen target, with **untyped** first ("the DM didn't say"). It also adds the two missing
types, **inherent** (manuals, *wish*) and **alchemical**. Changing the target resets a type
that no longer fits. An existing bonus with a type that can't apply is flagged in the editor
and can't be saved until it's fixed; it isn't changed silently. Rule table quoted in
`rules/targets.ts`; tests in `test/custom-bonus.test.ts`.
