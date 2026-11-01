# Kaldaran — Pathfinder 1e character sheet

Handoff document. Written for an engineer (human or agent) with no prior context.

---

## 1. What this is and who it is for

Ryan plays **Kaldaran**, a Samsaran necromancer wizard, in a Pathfinder 1st Edition campaign
with mythic rules. He is **new to Pathfinder**. His DM runs the world and the NPC roster;
Ryan runs exactly one character.

The product is a character sheet he uses live at the table. The defining requirement, in his
words:

> "I need to be sure I can see what my current AC is, but also **WHY** the numbers are the
> way they are."

That is the whole thesis. A number with no visible derivation is a failure, because a
beginner cannot tell a correct number from a wrong one. Every total on the sheet carries its
own arithmetic, and the sheet explains Pathfinder concepts in plain language as it goes.

Pathfinder 1e is a system where a single value — Armor Class — can be the sum of six
differently-typed bonuses, three of which do not stack with each other. A paper sheet hides
all of that. This sheet exists to expose it.

### What it is not

- Not a VTT, not a combat tracker for a party, not an NPC/monster manager. **The DM runs the
  roster; Ryan runs his own character.** Features aimed at running other creatures are out of
  scope, with one exception: Brug (see §4).
- Not a rules reference site. It only needs to know the rules that apply to this character.

---

## 2. Current state

Everything today lives in **one self-contained HTML file**, `Kaldaran_Sheet.html` —
~456 KB, ~5,000 lines: markup, CSS, a 396-spell Core Rulebook data array, roughly 2,500 lines
of JavaScript in an IIFE, and the character's own data embedded as JSON.

Build **v36**. Diagnostics: **27 rules checks, all passing**, plus 13 character-consistency
checks, 0 failures.

It is a single file because it had to be openable from a USB stick with no internet at the
table. **That constraint is now lifted** — the repo rebuild does not need to preserve it, so
long as the result still works offline once loaded.

### Tabs

| Tab | Contents |
|---|---|
| Today | The at-the-table view: AC/saves/init block, prepared spells with cast buttons, active effects, concentration helper |
| Spellbook | Spells known by level, preparation, the 396-spell browser, metamagic reference |
| Combat | Attacks, CMB/CMD, Brug |
| Mythic | Path, tier, mythic power, path abilities, surge |
| Character | Abilities, feats, traits, HP, level-up walkthrough |
| Skills | Ranks, class-skill bonuses, totals with derivation |
| Inventory | Gear, worn/carried/stowed, consumables, supplies, money, Scriptorium (scroll crafting) |
| Notes | Table rulings, unresolved questions, diagnostics, backups, backstory |

---

## 3. The domain model worth preserving

These are the parts that took real work to get right. A rewrite should keep the *semantics*
even if the code changes completely.

### 3.1 The effects engine — the core of the whole thing

One list of active effects. Each effect carries modifiers shaped `{stat, type, v}`.
Resolution applies Pathfinder's bonus-type stacking rules:

- Same named bonus type → **only the highest applies**; the others are suppressed.
- **dodge**, **circumstance**, **untyped**, **racial** → all instances stack.
- **Penalties always stack**, regardless of type.
- Touch AC ignores `armor`, `shield`, `natural`.
- Flat-footed AC drops the Dex bonus (but never a Dex *penalty*) and all dodge bonuses.

Critically, resolution returns `{total, applied[], suppressed[]}`. The UI renders the
suppressed entries **struck through, still visible**. This is the single most valuable
feature in the sheet: it answers "why didn't my AC go up?" before the player has to ask.

Worked example that drove the design: Enduring Armor (mythic) grants an *armor* bonus of
`3 + tier` = +5. Mage Armor grants an *armor* bonus of +4. Same type, so Mage Armor
contributes **nothing** while Enduring Armor is up. The sheet shows Mage Armor struck
through rather than silently dropping it.

### 3.2 CMB/CMD and the special size modifier

A trap worth naming because it was live on the sheet and wrong. The size modifier for
CMB/CMD is the **mirror** of the AC size modifier, not the same number. Small is −1 to AC but
−1 to CMB/CMD… via the *special* size table, which runs in the opposite direction from the AC
table. Reduce Person therefore *raises* AC and *lowers* CMD.

CMD also includes deflection and dodge but excludes armor, shield and natural armor.

### 3.3 Specialist (school) spell slots

A specialist wizard gets one extra slot per spell level, which must hold a spell from the
specialty school. From d20pfsrd:

> "specialist wizards receive an additional spell slot of each spell level he can cast, from
> 1st on up. Each day, a wizard can prepare a spell from his specialty school in that slot."

**Nothing says which slot.** The sheet originally pinned it to the last array index, which
meant unpreparing any ordinary spell left the freed slot marked "Necromancy only" and the
spell could not be put back. The correct model: the marker **follows whichever slot holds a
school spell**; only when none is prepared does it reserve the last free slot. Two self-tests
guard this.

### 3.4 Metamagic

Implemented with 26 feats, each level adjustment read from that feat's own d20pfsrd page.

Two rules people get backwards, both encoded and both self-tested:

- *"Spells modified by a metamagic feat use a spell slot higher than normal. **This does not
  change the level of the spell, so the DC for saving throws against it does not go up.**"*
- **Heighten Spell is the sole exception** — *"Unlike other metamagic feats, Heighten Spell
  actually increases the effective level of the spell that it modifies. All effects dependent
  on spell level (such as saving throw DCs…) are calculated according to the heightened
  level."*

Plus the **Magical Lineage** trait: *"treat its actual level as 1 lower for determining the
spell's final adjusted level"*, with a floor — it can never take a spell below its own
unmodified level. Kaldaran's lineage spell is Animate Dead, so an *extended* Animate Dead
costs an ordinary 3rd-level slot.

The slot picker offers lower-level spells that a known metamagic feat can lift into the slot
being filled. Metamagic choices are stored in `prepMeta[lv][i]`, kept index-aligned with
`prep[lv][i]` and `cast[lv][i]` through every push and splice. **That alignment is load-
bearing** — a misalignment silently marks the wrong slot spent.

### 3.5 Scroll crafting (the Scriptorium)

- Base price = spell level × creator's caster level × 25 gp. A cantrip counts as level ½.
- Materials cost = half the base price.
- Time = 2 hours if base price ≤ 250 gp, otherwise 1 day per 1,000 gp; a crafting day is
  8 hours and cannot be lengthened.
- Spellcraft DC = 5 + the item's caster level. Failure wastes materials and time; failure by
  5 or more produces a **cursed item**.
- The prepared spell slot is expended *"just as if it had been cast"* — on success or failure.
- You may craft at a **lower caster level** than your own, but never below the minimum level
  that could cast the spell (for a wizard spell of level *n*, that is 2*n* − 1). Lower CL means
  a cheaper, weaker scroll.

### 3.6 Mythic

Arch-Mage path, tier 2. Mythic power = 3 + (2 × tier). Surge die scales by tier band.
Bonus HP 3/tier. Path abilities are chosen one per tier. **Mythic advances by trials awarded
by the DM, not by XP**, so a tier can arrive at any session without warning.

### 3.7 Other verified mechanics already encoded

Bonus spells from a high casting stat (Core Table 1-3); poor BAB = ½ level; poor save base =
level/3 and good save base = 2 + level/2; spell save DC = 10 + spell level + Int + Spell
Focus; skill ranks = 2 + Int per level with a rank cap of character level; concentration =
caster level + Int; Grave Touch uses = 3 + Int; wizards know **every** cantrip.

---

## 4. The character

**Kaldaran** — Samsaran, Wizard 4 (Necromancer), Arch-Mage tier 2, Neutral Good.
Age 68, 6'0", 155 lbs, silver hair, blue eyes, pale blue skin with clear blood.
From the City of Four Elements.

- **Abilities** Str 10, Dex 14, Con 14, **Int 23**, Wis 14, Cha 12
- **HP** 32/32 (includes +6 mythic, 3 per tier)
- **AC** 17 · touch 12 · flat-footed 15
- **Saves** Fort +3, Ref +3, Will +6 · **Init** +6 · **CMD** 14 · Concentration +10
- **Slots** 6 at 1st, 5 at 2nd (each includes one Necromancy-only specialist slot)
- **Spellbook** 57 entries — 35 cantrips, 11 at 1st, 7 at 2nd, 4 at 3rd
- **Money** 521 gp, 9 sp, plus **500 gp of scroll-crafting materials**
- **Languages** 12 — Common, Samsaran, Abyssal, Celestial, Draconic, Infernal, Giant, Necril,
  Orcish, Undercommon, Ignan, Goblin
- **Skills with ranks** Linguistics 4, Perception 4, Spellcraft 4, Stealth 3, Survival 3,
  Fly 2, and 1 each in Acrobatics, Appraise, Craft (Jewelry), Heal, Use Magic Device, and the
  seven Knowledges

**Feats**
1. Spell Focus (Necromancy) — +1 save DC on every Necromancy spell
2. Scribe Scroll — wizard bonus feat
3. Command Undead — bonus feat from Power over Undead (Necromancy school power)
4. Undead Master — count as 4 levels higher for HD of undead animated or commanded
5. Undead Master (Mythic) — tier-1 mythic feat; adds tier on top of that +4

**Trait** Magical Lineage (Animate Dead).
**No metamagic feat yet** — the 5th-level wizard bonus feat is the natural moment to take one.

**Brug** — an ogre who follows Kaldaran out of a life debt. Not a hireling, not a summon; he
rolls his own initiative and acts on his own turn. He is on the sheet as editable data
because Ryan rolls his attacks. He is the one exception to "the DM runs the roster". His
numbers are **not** on the effects engine — a known gap.

**Undead currently controlled** Skeleton (2 HD), Armored Skeleton (4 HD) — 6 of 10 HD of
Command Undead capacity.

---

## 5. House rulings — these override RAW

Stored in the sheet under Table Rulings. **Do not "correct" these.**

1. **Animate Dead is a 3rd-level spell for Kaldaran** — DM approved. By the book it is 4th,
   and Mystic Past Life cannot legally grant it since every class with it at 3rd is divine.
2. **Cantrips are unlimited.** (By the book you prepare 4 a day and those 4 are at-will; the
   house part is only that he need not pick which 4.)
3. **Wand of Magic Missile regains 5 charges per day**, max 20.
4. **Mage Armor dropped from the daily prep** — Enduring Armor is an armor bonus of 3 + tier
   = +5 and Mage Armor is +4, same type, so Mage Armor contributed nothing. Kept in the
   spellbook as a stopgap if Enduring Armor is ever dispelled.
5. **A night's rest is 8 hours and heals 2 × character level.** By the book 8 hours heals
   1 × level, and 2 × requires a full day and night of complete bed rest.
6. **Ring of Sustenance still requires the full 8 hours** — it covers spell preparation, not
   the sleep requirement. By the book it reduces required rest to 2 hours.
7. **Undead Master's prerequisite is met by the Command Undead FEAT.** RAW the prerequisite
   reads "the ability to cast animate dead or command undead" and d20pfsrd links both to the
   spells; the feat's own benefit text explicitly covers "or use the Command Undead feat",
   which is the basis for the ruling.
8. **Mystic Past Life picks stand as chosen.** Mirror Image, Lesser Animate Dead and Vampiric
   Touch were already on the wizard list so those picks gained nothing, but they are not
   being reassigned.
9. **Animate Dead control cap is 4 HD × effective caster level**, counting Undead Master's +4
   and the mythic +tier. At wizard 4 / tier 2 that is caster level 10, so **40 HD**. The
   stricter reading (4 × wizard level = 16) does not apply at this table.
10. **Max HP of 32 already includes the Arch-Mage bonus for both tiers** — 3 per tier, 6 total.

---

## 6. The autosave hazard (why a repo rebuild is worth doing)

In the single-file design, saving means `serialize()` writing the **entire document** —
markup, script, and the embedded character JSON — back over the file through the File System
Access API. An autosave timer does this every 20 seconds whenever anything is dirty.

The consequence: a browser tab left open from the morning writes **that tab's copy of the
code** back over the file, destroying any edits made since. This silently destroyed a
metamagic module, a level-up fix and a print fix in one afternoon. The user's report was
*"I keep reloading when you tell me to but it's not really reloading"* — he was reloading
correctly; a stale tab kept overwriting the file underneath him.

Current mitigation: `buildOnDisk()` reads the `const BUILD='…'` stamp out of the file before
writing and refuses to overwrite a different build (autosave pauses, manual save asks).
**If you keep any part of the single-file design, keep this guard, and bump `BUILD` on every
edit.**

**The repo rebuild should make this impossible by separating code from character data.**
Character data belongs in its own file (or IndexedDB, or a small backend). Code should be
deployed, not round-tripped through the browser. This is the single strongest argument for
the restructure.

---

## 7. Suggested shape for the rebuild

Not prescriptive — the next engineer should use their judgement — but this is where the
existing seams already are:

```
src/
  rules/        # pure functions, no DOM. The valuable half of the codebase.
    stacking.ts       # bonus types, suppression, resolve()
    spellcraft.ts     # slots, bonus spells, save DCs, specialist slots
    metamagic.ts      # level adjustments, Magical Lineage, DC rules
    crafting.ts       # scroll prices, times, Spellcraft DCs
    mythic.ts         # tier table, mythic power, surge
    derive.ts         # AC, saves, CMB/CMD, initiative, concentration
  data/
    spells.crb.json   # the 396-spell Core Rulebook array
    character.json    # Kaldaran — the only file that changes during play
  ui/
    tabs/…
  selftest/           # the 27 rules checks, as a real test suite
```

Guidance:

- **`src/rules/` should be pure and unit-tested.** The existing `runSelfTests()` is already a
  test suite in disguise; port it to the repo's test runner first and let it pin behaviour
  while you restructure. That is the safest possible migration path.
- Keep the **receipt** concept in the data model, not the view: every derived value should be
  able to report the list of contributions that produced it, including suppressed ones.
- Character data is a **document with a schema version**. The existing file has a migration
  chain 1→8; keep migrations additive and never destructive.
- Offline use still matters (phone, basement, no signal). A static build or PWA is fine; a
  hard server dependency at the table is not.

### Porting checklist

Status as of 2026-11-01 (repo build, branch `claude/happy-tesla-5ss4rq`):

- [x] Extract `chardata` into `data/characters/kaldaran.json`
- [x] Extract the 396-spell `CRB` array into `data/spells.crb.json`
- [x] Port `runSelfTests()` to the test runner (`src/rules/selftest.ts` + `test/selftest.test.ts`)
- [x] Port the effects engine, with suppression receipts intact
- [x] Port derive (AC/touch/FF, saves, CMB/CMD with the **special** size modifier, init,
      concentration)
- [x] Port slots + specialist slot (marker follows the school spell)
- [x] Port metamagic + Magical Lineage
- [x] Port scroll crafting
- [x] Port the mythic tab
- [x] Carry the ten house rulings across verbatim
- [x] Keep the parchment theme and the dark alternative
- [ ] Re-cite every ported rule on d20pfsrd (`docs/VERIFY.md`) — "Suspected problems" done
      2026-11-01; the formulas list remains

---

## 8. Design and presentation notes

The visual language was arrived at through several rounds of feedback and is settled:

- **Parchment** is the default background; a dark palette sits behind
  `:root[data-theme="dark"]`. Every colour comes from a CSS custom property so the two
  palettes are the only place colours are defined.
- **Clear bordered sections.** Ryan asked for this explicitly.
- **Heavier text.** Small monospace labels are set at `font-weight: 600` — at 10px on
  parchment they need the weight to hold up. He found the earlier lighter text hard to read.
- Serif for body (Iowan Old Style / Palatino / Georgia), monospace for labels and numbers.
- Tabs can carry a badge when something needs attention; hovering a badge explains what.
- Print view flattens all tabs onto paper. The spellbook shows one level at a time on screen
  and the levels you are not viewing are **not in the DOM**, so the print handler widens the
  view first and restores it afterwards. Keep that behaviour if you keep the filter.

---

## 9. Roadmap

**Open, in priority order:**

1. **Mythic Tier Up walkthrough** — the only advancement path with no guided flow. Tier 3
   brings Recuperation, a mythic feat, a path ability, mythic power 7→9, and Enduring Armor
   5→6 (AC 18). Tiers arrive by DM-awarded trials, so this can be needed with no notice.
   The existing **Level Up** flow is the model to copy.
2. **Brug on the effects engine** — his numbers are editable but static; Enlarge Person on him
   does not move them.
3. **Print view** — the code is correct and tested programmatically, but no one has looked at
   actual paper output.
4. **Two unsourced cantrips** — `Oath of Anonymity` and `Vacuous Vessel` have descriptions
   written by hand because neither appears on d20pfsrd. The source book is unknown; ask Ryan
   before trusting them.

**Explicitly out of scope:** combat roster, NPC/monster management, anything that runs
creatures other than Kaldaran and Brug.

---

## 10. Files in this handoff

| File | What it is |
|---|---|
| `Kaldaran_Sheet.html` | The working sheet, v36. The source of truth for both behaviour and data. |
| `Kaldaran_Sheet.BACKUP-20260913-113549.html` | A rollback point from before a large refactor. |
| `New folder/Kaldaran_Sheet.html` | An older copy used at the table during one session. Superseded; keep only as history. |
| `CLAUDE.md` | Standing working rules for an agent on this repo. |
| `docs/HANDOFF.md` | This document. |

To read the sheet's data without a browser:

```bash
python -c "import re,json;s=open('Kaldaran_Sheet.html',encoding='utf-8').read();print(json.dumps(json.loads(re.search(r'id=\"chardata\">(.*?)</script>',s,re.S).group(1)),indent=2)[:3000])"
```
