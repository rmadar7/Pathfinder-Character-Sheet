# Rules to verify against d20pfsrd

Rules ported from v36 that haven't been re-checked against https://www.d20pfsrd.com/ in this
repo. v36 says it verified most of these; the repo rule (CLAUDE.md §1) is that a claim is only
verified once someone has read the page and quoted it. The cloud environment used for the
port couldn't reach d20pfsrd, so everything here is **ported as-is, not changed**.

When you verify an item: read its own page (not a summary table), quote the governing
sentence in the code comment, and delete the line here. If the rule turns out different,
fix it, add a test, and log it in `DECISIONS.md`.

## Suspected problems (check first)

- [ ] **Wild Arcana caster level.** v36 says Wild Arcana "casts at caster level +2". The
      arcana text as remembered has no CL bonus. *Mythic → Arch-Mage → Wild Arcana*.
- [ ] **Command Undead save DC for a wizard.** v36 uses 10 + ½ level + **Cha**. Power over
      Undead may set it to 10 + ½ wizard level + **Int** (or Cha). *Wizard → Arcane Schools →
      Necromancy → Power over Undead*, and the *Command Undead* feat.
- [ ] **Concentration DC when not damaged.** v36's helper uses "DC 15 + spell level" when no
      damage was taken and calls it the grappled/shaken DC. RAW grappled is 10 + grappler's
      CMB + spell level, entangled is 15 + spell level, casting defensively is 15 + 2× spell
      level. *Magic → Concentration*.
- [ ] **Blinded condition.** v36 applies −2 AC but not "loses Dex bonus to AC".
      *Conditions → Blinded*.
- [ ] **Enduring Armor value.** v36: armor bonus = 3 + tier. *Mythic → Arch-Mage path
      abilities → Enduring Armor*.
- [ ] **Hard to Kill.** v36's HP help says Hard to Kill keeps you *conscious*; its Mythic tab
      text says you are *not* conscious. One is wrong. *Mythic → Universal abilities → Hard
      to Kill*.
- [ ] **Recuperation** (needed for the tier-3 walkthrough): exact healing and mythic-power
      cost. *Mythic → Universal abilities*.

## Formulas and tables (believed right, re-check)

- [ ] Ability modifier = ⌊(score − 10) / 2⌋
- [ ] Bonus spells per day (Core Table 1-3): `mod ≥ lv ? 1 + ⌊(mod − lv)/4⌋ : 0`
- [ ] Wizard spells per day table (levels 1–20), incl. cantrips = 4
- [ ] Specialist slot: one extra slot per spell level from 1st up, holds a school spell
- [ ] Poor BAB ½ level; poor save ⌊level/3⌋; good save 2 + ⌊level/2⌋
- [ ] Spell DC 10 + spell level + Int + Spell Focus (+1), Greater Spell Focus (+1 more)
- [ ] Touch AC ignores armor/shield/natural; flat-footed loses Dex bonus (not penalty) and dodge
- [ ] CMD = 10 + BAB + Str + Dex + special size + circumstance/deflection/dodge/insight/luck/
      morale/profane/sacred bonuses to AC; penalties to AC also apply
- [ ] Special size modifier for CMB/CMD (mirror of AC size modifier)
- [ ] Bonus-type stacking: dodge, circumstance, untyped, racial stack; penalties stack
- [ ] Skill ranks 2 + Int per level (wizard); max ranks = character level; +3 class skill
      with ≥1 rank; wizard class-skill list
- [ ] Languages: racial + Int mod + Linguistics ranks
- [ ] Carrying capacity table and the ×4 per +10 Str rule
- [ ] Concentration = caster level + Int; damage DC 10 + damage + spell level
- [ ] Grave Touch: 3 + Int/day, shaken ½ wizard level (min 1) rounds
- [ ] Power over Undead: 3 + Int channel uses
- [ ] Bolster (Undead subschool) numbers
- [ ] Animate Dead: 2 HD/CL per casting, 4 HD/CL controlled (house ruling 9 sets the CL)
- [ ] Command Undead feat HD cap
- [ ] Undead Master (+4), Undead Master (Mythic) (+tier; triples command undead spell)
- [ ] Mythic power 3 + 2×tier; surge die bands; mythic tier table (feats on odd tiers,
      ability +2 on even tiers)
- [ ] Amazing Initiative: +tier initiative; extra standard action, not for spells
- [ ] Arch-Mage bonus HP 3/tier
- [ ] Level-up: d6 HD, feat at odd levels, +1 ability every 4, wizard bonus feat 5/10/15/20,
      2 free spells per level
- [ ] Metamagic level adjustments — all 26, each on its own page (Empower +2, etc.)
- [ ] Metamagic does not raise DC; Heighten does
- [ ] Magical Lineage: −1 level, never below the spell's own level
- [ ] Scribe Scroll: price lv × CL × 25 (cantrip ½); materials half; 2 h if ≤ 250 gp else
      1 day per 1,000 gp; DC 5 + CL; fail by 5 = cursed; slot expended; min CL 2n − 1
- [ ] Every CONDITIONS entry (shaken, frightened, sickened, fatigued, exhausted, entangled,
      grappled, prone, dazzled, blinded, energy drain, cover, fighting defensively, total
      defense)
- [ ] Every QUICK_EFFECTS entry (Mage Armor, Shield, Shield of Faith, Barkskin, Enlarge
      Person, Reduce Person, Resistance, Bless, Haste, Heroism, item bonuses)
- [ ] Every Arch-Mage path ability description and every mythic universal ability text
- [ ] Samsaran: Lifebound, Samsaran Magic, Mystic Past Life
- [ ] Reactionary trait +2 initiative

## Data clean-ups waiting on d20pfsrd

- [ ] Descriptions for Detect Poison, Dancing Lights, Flare, Open/Close (approved; see
      DECISIONS.md). Meanwhile the sheet falls back to the embedded Core Rulebook text, as v36 did.
- [ ] Confirm Oath of Anonymity and Vacuous Vessel really aren't on d20pfsrd (currently
      marked unsourced).
