# Plan: from Kaldaran's sheet to a full Pathfinder 1e character sheet

Status: **proposal for Ryan to scope and approve.** Nothing here is built yet. Decisions this
plan needs from Ryan are collected in §10.

---

## 1. The goal in one paragraph

A character sheet for **any** Pathfinder 1st Edition character that is dynamic (every number
is computed from what the character has, never typed in), follows the rules (with table
rulings layered on top), and stays the thing this project already is: a sheet a beginner can
trust because **every number shows why it is that number.** It must work offline at the
table, on a phone, and must never lose the player's data.

What carries over unchanged from today (`CLAUDE.md`, `ARCHITECTURE.md`):
receipts on every number, struck-through suppressed bonuses, plain language, no meta-text,
house rulings as authoritative data, d20pfsrd as the rules source, never silently change the
character, offline-first storage.

---

## 2. Where we are

The repo build is a faithful port of the v36 single-file sheet: about 5,300 lines of
TypeScript/Preact, 8 tabs, 78 tests, 39 diagnostics, all green.

It is **Kaldaran's sheet, not a character sheet.** The model has one `lvl` (no classes), a
wizard spellbook, `specialist`/`subschool` fields, feats and traits as plain strings that
the code pattern-matches (`/^reactionary/`), a fixed `Used` record (`grave`, `cmd`, `dw`…),
a hand-written `Brug` block, and Arch-Mage hard-coded into mythic. Rules like "Spell Focus
adds +1" are detected by name in code. 14 places are marked `CHARACTER-SPECIFIC`.

That was the right call for the port, and the engine underneath is sound and reusable: typed
modifiers, stacking with receipts, derived (not stored) system effects, migrations, the
store, the receipt UI. **Keep the engine, replace the content layer.**

---

## 3. Data: live lookup or a master list?

### Live lookup at runtime — not workable

I tested this:

- **d20pfsrd refuses automated requests.** Plain HTTP clients get `410 Gone`, including a
  request that presents itself as coming from a GitHub Pages site. A page on GitHub Pages
  also can't read another site's pages unless that site opts in (CORS), and nothing suggests
  d20pfsrd does. Getting around that means a scraping proxy, which is exactly what the site
  is blocking.
- **It's prose, not data.** "+2 dodge bonus to AC while fighting defensively" has to be
  turned into `{target: ac, type: dodge, value: 2}` by something. Doing that live on every
  lookup would be fragile and slow.
- **Offline at the table** is a hard requirement. A live lookup fails exactly when the
  campsite has no signal.

So d20pfsrd stays what it is today: the **human verification source**, and every entry on the
sheet gets an "Open on d20pfsrd" link. It is not the runtime data source.

### A master list (compendium), built ahead of time — recommended

There's already an excellent machine-readable PF1e dataset: the **Foundry VTT Pathfinder 1e
system's** content packs
([gitlab.com/foundryvtt_pathfinder1e/foundryvtt-pathfinder1](https://gitlab.com/foundryvtt_pathfinder1e/foundryvtt-pathfinder1),
actively maintained, last activity today). Its game content is published under the Open
Game License 1.0a; its code is GPL-3.0, and we would take only the data, not the code.
I read sample files:

- **Spells** — one YAML file per spell, with level *per class* (`wizard: 7, sorcerer: 7`,
  domains, bloodlines), school, descriptors, components, range, area, duration, save, SR,
  damage formulas (`(min(20, @cl))d6`), source book and page, and the full description.
- **Classes** — BAB (`low`), save progressions, hit die, class skills, casting type
  (`prepared`, `arcane`, `int`, cantrips), and links to each class feature with the level
  it is gained.
- Also feats, class abilities, races, items, armor and shields, weapons, buffs, conditions,
  monster abilities.

**The plan:** a build-time import script turns those packs into our own compact JSON
compendium in `data/compendium/`, in our own schema, so we don't depend on Foundry's format
at runtime. The app ships it, caches it for offline use, and loads each category on demand.

| Layer | What it is | Who edits it |
|---|---|---|
| **Compendium** | Imported, generated, never hand-edited. Every entry carries source book, page and a d20pfsrd link | the import script |
| **Corrections** | Small hand-written patches where the import is wrong or a rule needs mechanics the data doesn't encode. Each one cites d20pfsrd (CLAUDE.md §1) | us, reviewed |
| **Table rulings** | House rules. Stored in the character document, override everything | Ryan / the DM |
| **Custom content** | Homebrew or unsourced entries (Oath of Anonymity, Vacuous Vessel) | the player, in the app |

Re-running the import picks up upstream fixes. A diff report shows what changed, so a
correction is never silently overwritten.

**Licensing to-do:** OGL content requires shipping the OGL text and a Section 15 copyright
notice. That's a one-page "Legal" screen and a file in the repo.

---

## 4. Rules engine: what "works fully with Pathfinder rules" means

Honest scope: PF1e has thousands of feats, class features and items, and many have bespoke
effects. No sheet automates all of them. What we *can* promise:

1. **All core math is automatic, for every class and race.** Everything in §4.2.
2. **Content that changes a number is automatic** when its effect can be written as data
   (most buffs, feats like Weapon Focus, Toughness, Spell Focus, Improved Initiative,
   racial traits, magic items).
3. **Content that can't be automated is never silent.** It shows its rules text and a manual
   toggle or counter (e.g. "Power Attack: on/off, −1/+2 per 4 BAB" as a toggle the player
   flips). A coverage marker on each entry says *automated*, *toggle* or *text only*, so
   nobody mistakes a text-only feat for one the sheet is applying.

### 4.1 One content model

Every feat, trait, racial trait, class feature, spell effect, item, condition and mythic
ability becomes the same shape:

```
{ id, name, kind, source: {book, page, url},
  prereqs: [...],            // checked, with the reason when not met
  changes: [ {target, type, formula, when?} ],   // "+1 dodge to AC", "@cl/2 to …"
  choices: [...],            // Weapon Focus (pick a weapon), Spell Focus (pick a school)
  uses: { per: day|round, max: formula },        // replaces the fixed `Used` record
  toggle?: true, text, coverage }
```

`formula` is a small **safe expression language** (`@abilities.int.mod`, `@class.wizard.level`,
`@cl`, `@tier`, `floor`, `min`, `max`), parsed and evaluated by our own code. Never `eval`
(today's `EFFCALC` named formulas are the seed of this, ARCHITECTURE R5). Every evaluated
formula produces its own receipt line: "+3 = ½ × wizard level 6".

### 4.2 Core math to implement (all receipted)

- **Abilities:** point-buy / rolled / manual generation, racial adjustments, level-up
  increases, enhancement, inherent, damage, drain, penalties.
- **Classes:** multiclass levels; BAB and saves summed per class; hit dice and HP (max at
  1st, then rolled or average); favored class bonus (HP / skill rank / alternate).
  Archetypes as data that replace class features.
- **Defence:** AC, touch, flat-footed, with armor max Dex, shield, size, natural, deflection,
  dodge (all stacking rules already exist); CMD; denied-Dex conditions.
- **Offence:** melee/ranged attack per weapon, iteratives (+6/+1…), two-weapon fighting,
  damage with Str multipliers (1×, 1.5×, 0.5×), crit range/multiplier, CMB per maneuver.
- **Saves, initiative, speed** (armor and encumbrance reduce it), carrying capacity.
- **Skills:** ranks, class skills, armor check penalty, size modifiers to Stealth and Fly,
  trained-only, background skills (optional rule, a setting).
- **Spellcasting, per class:** prepared (wizard, cleric, druid…) and spontaneous (sorcerer,
  bard, oracle…); spells per day and known tables per class; bonus spells; domains,
  bloodlines, schools, specialist slots; CL, concentration, DC, metamagic, spell failure.
  Today's wizard logic becomes one case of this.
- **Conditions:** the full condition list as data (blinded, shaken, nauseated…).
- **Mythic:** all six paths as data, not Arch-Mage hard-coded.
- **Companions:** animal companions, familiars, eidolons, cohorts like Brug, as small
  character documents linked to the owner (Brug becomes the first one).
- **Validation:** prerequisites, feat count per level, skill ranks per level, max ranks,
  spells known — surfaced the way today's "character issues" are.

### 4.3 Derivation graph

Today `derive()` computes a fixed set of stats. The general version is a graph of named stats
(`ac`, `skill.stealth`, `attack.longsword.1`…), each with a base formula and the changes that
target it, resolved once per render with caching. Receipts fall out of it for free. The
stacking code in `stacking.ts` stays the single place stacking happens (R4).

---

## 5. The sheet itself: UX

Built around **three moments**, not eight tabs of equal weight.

### Play (at the table) — the default screen
- Header: HP with a damage/heal pad, temp HP, nonlethal; AC / touch / FF; saves; init;
  conditions as chips you tap on and off.
- **Actions, not stats:** "Attack with longsword +7/+2 (1d8+4, 19–20/×2)", "Cast…",
  "Channel…", grouped by standard / move / swift / free / reaction, and limited-use
  abilities with pips.
- Active effects bar: spells and buffs running, with round countdown and a Next Round button.
- Tap **any** number → its receipt. Tap any name → plain-language explanation plus rules
  text and a d20pfsrd link.
- Dice: roll from any number; natural 1/20 called out where the rules say they matter.

### Build and level up — a guided wizard
- New character: race → class → abilities → skills → feats → spells → gear, each step
  showing only legal choices with the reason others are greyed out ("needs BAB +1").
- Level up: the same steps for one level, with "what changed" shown before you commit.
  Today's level-up walkthrough is the seed.

### Reference — search everything
- One search box over the whole compendium (spells, feats, items, conditions, rules terms).
- Filters that matter: "wizard spells I can cast", "feats I qualify for".
- Add to character from the result.

### Also
- Spellbook / prepared / known, per casting class.
- Inventory with encumbrance, money, consumables with charges, worn slots (one per body slot).
- Notes, table rulings, backups, export/import.
- Phone-first layout, works one-handed; dark and parchment themes kept.
- Print / PDF a one-page summary for paper backup.

---

## 6. Characters, storage and sync

- Several characters in one app, with a picker (storage is already keyed by id).
- Import/export JSON as today; schema migrations as today (M2).
- Optional sync between devices later (small hosted backend, e.g. Supabase). Not in the
  first phases: the local copy stays the source of truth (DECISIONS 2026-11-01).
- Kaldaran migrates into the general model with a **parity test**: every number he shows
  today must be identical after migration, or the difference is a logged, cited fix.

---

## 7. How we keep it correct

Importing data is not verifying it. Three layers:

1. **Engine tests** — formula-based unit tests for every rule in §4.2 (today's approach).
2. **Golden characters** — pick a handful of published, fully stat-blocked PCs covering a
   martial, a prepared caster, a spontaneous caster and a multiclass build. Build each from
   the compendium and assert the sheet matches the stat block. This catches import and engine
   errors together.
3. **d20pfsrd citations** — engine code keeps quoting its rule (R7); `VERIFY.md` keeps tracking
   what hasn't been checked. Corrections to imported data are checked on the entry's own page.

---

## 8. Phases

Sizes are relative effort (S ≈ a session or two, M ≈ several, L ≈ many). Each phase ends
with the app green and usable; Kaldaran keeps working throughout.

| # | Phase | Delivers | Size | Done when |
|---|---|---|---|---|
| 0 | **Finish the port** | v36 parity confirmed, PR #1 merged, switch Ryan over from v36 | S | Ryan plays a session on it |
| 1 | **Compendium pipeline** | Import script, our schema, spells + feats + classes + races + conditions + items in `data/compendium/`, search UI, d20pfsrd links, OGL page | M | Search finds any core spell/feat with correct class levels |
| 2 | **General character model** | Classes array, races, feats/traits as compendium references with choices, generic uses/resources, formula language, derivation graph. Kaldaran migrated with parity tests | L | Kaldaran identical; a fighter 1 can be represented |
| 3 | **Core math, all classes** | Everything in §4.2 except spellcasting and companions; conditions as data; validation | L | Golden martial character matches its stat block |
| 4 | **Spellcasting, all casters** | Prepared + spontaneous, per-class tables, domains/bloodlines/schools, metamagic generalised | M–L | Golden cleric and sorcerer match |
| 5 | **Builder and level-up wizard** | New-character flow, legal-choice filtering, level-up with preview | M | A new player builds a legal level-1 character unaided |
| 6 | **Play-screen redesign** | Action-centric Play view, effects bar, multi-character picker, print | M | Ryan prefers it to the current Today tab |
| 7 | **Breadth** | Mythic paths as data, companions/familiars/eidolons, archetypes, more automation coverage, more sourcebooks | ongoing | — |
| 8 | **Sync** (optional) | Multi-device sync | M | — |

Phases 1 and 2 are the foundation: everything after them is mostly content and UI on a
general engine. Phase 0 is independent and can ship first.

---

## 9. Risks

- **Import quality.** The Foundry data is good but not perfect, and its "changes" encode
  Foundry's own targets. Mitigation: our own schema, a corrections layer, golden characters.
- **Automation breadth.** Thousands of entries can't all be automated. Mitigation: the
  coverage marker and "never silent" rule (§4); prioritise what Ryan's table actually uses.
- **Upstream changes.** Foundry may restructure its packs. Mitigation: we ship our generated
  JSON, so an upstream change only breaks the *next* import, never the app.
- **Scope creep toward a VTT.** HANDOFF §1 says not a VTT, not a monster manager. Companions
  are in; NPCs and party tracking stay out unless Ryan says otherwise.

---

## 10. Decisions (Ryan, 2026-11-01)

1. **Data source: Foundry PF1e packs — approved**, as long as it is Pathfinder 1st Edition
   only (the import rejects anything else).
2. **Books: undecided.** Recommendation: import every Paizo PF1e book the packs carry (the
   import costs the same either way), with a *Books allowed* setting that defaults to all of
   them. Verification effort follows what a character actually uses, not the size of the
   import, so a big import doesn't create a big checking backlog.
3. **Audience: Ryan's table for now, built so it can open up later.** Concretely: no
   Kaldaran-specific code in new work (G1–G3 already require this), multi-character storage
   from Phase 2, and the OGL page from Phase 1. No accounts, no public builder polish yet.
4. **Optional rules: none.** No background skills, unchained, ABP or PFS. Not building a
   switchboard for them now.
5. **Custom bonuses: needed.** The DM hands out items and boons that don't match the book. The
   sheet must let the player build one from structured lists (what it applies to, bonus type,
   amount, optional "only when…"), so it stacks and shows its math like everything else. A
   first version shipped with the switch-over (DECISIONS.md); in Phase 2 it becomes the
   *Custom content* layer in §3, covering feats and abilities as well as bonuses.
6. **Phase 0 first: yes.** Finish switching off v36 before the general work.
7. **Sync / other devices: not now.** Phase 8 stays parked.
