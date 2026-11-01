# Architecture and build rules

How this codebase is put together, and the rules that keep it consistent. Read this before
adding anything. If you need to break one of these rules, change this document in the same
commit and say why. Don't just drift.

`CLAUDE.md` holds the *working* rules (verify on d20pfsrd, every number shows its math, never
silently change data). This file holds the *structural* rules: where code goes and what shape
it takes.

---

## 1. The layers

```
src/
  model/     the character document: types, defaults, migrations, storage
  rules/     Pathfinder rules as pure functions. No DOM, no Preact, no storage.
  data/      static reference data (spell list, mythic tables, conditions…)
  ui/        Preact components. Reads rules, never re-implements them.
    tabs/    one file per tab
test/        Vitest. Mirrors src/rules.
legacy/      the v36 single-file sheet. Reference only; never edited.
data/        extracted JSON (character seed + CRB spells)
```

Dependencies point **one way only**: `ui → rules → model/types`. `rules` never imports from
`ui`. `model/storage` is only imported by the store (`ui/store.ts`).

## 2. Rules layer (`src/rules/`)

**R1. Pure functions of the character.** Every rules function takes the `Character` (and
plain arguments) and returns a value. No globals, no `Date.now()`, no `Math.random()`. The
legacy sheet read a global `S`; the port passes `ch` explicitly. Dice rolling lives in `ui/`.

**R2. One formula, one place.** If two screens show the same number, they call the same
function. Example: AC, touch, flat-footed, saves, CMB/CMD, init, concentration and CL all
come from `derive(ch)`. No tab computes its own.

**R3. Every derived value can produce its receipt.** A stat is resolved through
`resolve(ch, stat, opts)`, which returns `{ total, applied[], suppressed[] }`. The
suppressed bonuses (same type, lower value) are kept with `beatenBy`, so the UI can show
them struck through. Never return a bare total from something the player will ask "why?"
about.

**R4. Stacking rules live only in `stacking.ts`.** Same named type → highest only.
`dodge`, `circumstance`, `untyped`, `racial` stack. Penalties (negative values) always
stack. Nobody else re-implements this.

**R5. Values that scale are named formulas, never `eval`.** A mod that grows with tier or
level uses `calc: 'enduringArm'` (see `EFFCALC`). Add a new named formula rather than
storing a computed number that goes stale on the next tier-up.

**R6. System effects are derived, not stored.** Mythic abilities, worn gear and conditions
become effects at resolve time (`sysEffects(ch)`). Only spells/manual effects the player
turns on are stored in `ch.effects`. This is what lets a tier change rescale everything.

**R7. Cite the rule in the code.** A rules function that implements a specific Pathfinder
rule carries a comment quoting the governing sentence and naming its d20pfsrd page. If the
rule is a house ruling, say so and name the ruling number from the Table Rulings list.

**R8. Verification status is tracked, not assumed.** Anything ported from v36 that has not
been re-checked against d20pfsrd in this repo is listed in `docs/VERIFY.md`. When you verify
one, remove it from that list and add the citation to the code comment. Never mark something
verified from memory.

## 3. Model layer (`src/model/`)

**M1. The character is one JSON document with a `schema` number.** Types are in
`model/types.ts`. Anything that should survive a reload belongs in the document; UI state
(which tab, search text, an open editor) does not.

**M2. Migrations are additive and logged.** `migrate()` walks `schema` forward one step at a
time. A step may add fields or fix data, but every change to something the player entered is
written to `ch.changelog` with a plain-English line. Never delete a player field without
moving its content somewhere first. The legacy chain (0→8) is ported verbatim so an old
export still imports.

**M3. Defaults fill gaps, they never overwrite.** `withDefaults()` only supplies keys that
are missing. Arrays from the saved doc win outright.

**M4. Keep `prep`, `cast` and `prepMeta` index-aligned.** `prep[lv][i]`, `cast[lv][i]` and
`prepMeta[lv][i]` describe the same slot. Every push or splice touches all three. Use the
helpers in `rules/spells.ts` (`prepareSpell`, `unprepareAt`); don't splice by hand in UI.

**M5. Storage is local-first.** IndexedDB holds the live document, keyed by character `id`.
Each save bumps a `rev`. A tab whose `rev` is behind the stored one does **not** write; it
tells the player another tab saved newer data. Export/import is plain JSON of the document.
Rolling backups are taken before one-way actions (New Day, Level Up, import).

**M6. Code is never written back by the app.** The browser loads the deployed build and only
ever saves the character document. This is the fix for the autosave hazard in
`HANDOFF.md` §6. Nothing in the app may serialize HTML or code.

## 4. UI layer (`src/ui/`)

**U1. Components read rules; they do not do rules.** A component may format numbers and pick
words, but any arithmetic that a Pathfinder rule decides goes in `rules/`.

**U2. All changes go through `update()`.** The store exposes `update(fn)`, which clones the
document, applies `fn`, records undo, and schedules a save. Components never mutate the
document they were given.

**U3. Every derived number renders with its receipt.** Use the shared `Receipt` / `MathRow`
components (the port of `mrow` + `receipt`). Suppressed bonuses render struck through with
the reason. A number on screen without visible or one-tap arithmetic is a bug.

**U4. Explanations use the shared tip system.** `data-help="key"` (plain-language help from
`ui/help.ts`) and `data-calc` (a number's breakdown) work on hover, tap and keyboard. Don't
build one-off popovers.

**U5. Plain language, no meta-text.** Explain what a rule means in play ("you fail only on a
natural 1"). Never write text that talks about the sheet itself, or "ask your DM". House
rulings are stated as facts with the RAW alongside.

**U6. Styling comes from the ported stylesheet and its tokens.** Colours are CSS custom
properties defined once for parchment and once for `[data-theme="dark"]`. No hard-coded
colours in components. Reuse existing classes (`card`, `mr`, `fx`, `res`, `pip`, `flag`,
`note2`, `src`, `supp`…) before adding new ones. Labels in monospace stay `font-weight: 600`.

**U7. Tabs are files.** One component per tab in `ui/tabs/`. Shared pieces (pips, effects
manager, spell tooltip, dice) live in `ui/components/`. A widget used by two tabs is one
component, never two copies (Today and Combat both show the effects manager).

**U8. Escape anything the player typed.** Preact escapes text children automatically. The
only place raw HTML is allowed is the tip body built from our own strings, and player text
going into it passes through `esc()` first.

## 5. Character-specific vs generic

The goal is "Kaldaran now, other characters later, without a rewrite."

**G1. Kaldaran's facts live in his document, not in code.** Name, race, specialist school,
feats, traits, house rulings, Brug, Magical Lineage's spell: all data. Code reads them.

**G2. Pathfinder rules live in code, keyed by what the character has.** E.g. Spell Focus is
detected from the feat list; the specialist slot from `ch.specialist`; metamagic from feats.

**G3. Kaldaran-only UI is marked.** Where v36 hard-codes something about Kaldaran (Samsaran
racial abilities, the Necromancy school powers, Brug), the port keeps it but guards it on the
data (`identity.race === 'Samsaran'`, `specialist === 'Necromancy'`, `brug` present) and
carries a `// CHARACTER-SPECIFIC:` comment. That comment is the to-do list for multi-character
support. Don't generalise these yet.

## 6. Testing

**T1. The diagnostics are a test suite.** `rules/selftest.ts` returns the rules checks and the
character-consistency checks. The same function feeds the Notes-tab Diagnostics panel *and*
`test/selftest.test.ts`, so they can't diverge.

**T2. Rules checks use formulas, not Kaldaran's current numbers**, so they keep passing when
he levels up (lesson from v36). Fixed-number tests ("AC 17 at tier 2") go in
`test/kaldaran.test.ts` and are expected to change when the character does.

**T3. Every rules change adds a test.** Every bug fix adds a test that would have caught it.

**T4. Parity with v36.** `test/parity.test.ts` holds the numbers v36 shows for the extracted
character. Until the switch-over, a difference is either a bug in the port or a deliberate,
documented fix (listed in `docs/DECISIONS.md`).

**T5. Done means:** `npm test` green, `npm run build` clean, and the page actually renders
(checked headlessly). CI runs the first two on every push.

## 7. Deploy

GitHub Actions: on push, install → typecheck → test → build. On `main`, also deploy `dist/`
to GitHub Pages. A small hand-written service worker caches the app so it works offline after
the first load. Keep it dependency-free.

## 8. Naming

- Rules functions: verbs or plain nouns, `camelCase`: `derive`, `slots`, `saveDC`,
  `scrollBase`. Keep the v36 names where one existed, so the legacy code can be compared side
  by side.
- Data keys keep their v36 short names (`n`, `lv`, `sc`, `d`, `r`, `m`), because the stored
  document uses them. Don't rename stored keys without a migration.
- Components: `PascalCase`, one per file when non-trivial.

## 9. Store rules learned the hard way

- **Only save when dirty.** `flush()` writes only if there are unsaved changes (or on first
  run / format upgrade). Saving on every tab hide bumped the revision and made every *other*
  open tab "out of date".
- **Re-check state when subscribing.** `useStore()` compares the state it rendered with the
  state when its effect subscribes; IndexedDB can answer before effects run.
- **`update()` never runs inside render.** Components may not mutate `ch`, not even to
  "normalise" it; normalisation happens in the store at load and inside rules helpers that
  are called from `update()`.

## 10. Checking a change end to end

```bash
npm test                 # rules, migrations, storage (Vitest)
npm run build            # typecheck + production build
npx vite preview &       # serve dist/ on :4173
npm run check:app        # every tab renders, no errors, key numbers, diagnostics
npm run check:flows      # suppression, casting, reload, rest, stale tab, undo, level-up, theme
npm run check:legacy     # the v36 sheet still renders and passes its own diagnostics
npm run check:parity     # every number v36 shows for a file, the new sheet shows (T4)
```
