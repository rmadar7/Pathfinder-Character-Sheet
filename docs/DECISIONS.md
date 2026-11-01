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
