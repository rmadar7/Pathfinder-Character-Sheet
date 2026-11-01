# Rules to verify against d20pfsrd

Rules ported from v36 that haven't been re-checked against https://www.d20pfsrd.com/ in this
repo. v36 says it verified most of these; the repo rule (CLAUDE.md §1) is that a claim is only
verified once someone has read the page and quoted it. The cloud environment used for the
port couldn't reach d20pfsrd, so everything here was **ported as-is, not changed**. d20pfsrd
is reachable through the web-fetch tool (plain `curl` gets `410 Gone`). The site's mythic
pages live under `/alternative-rule-systems/paizo-rules-systems/mythic/` — the short
`/mythic` links 404.

When you verify an item: read its own page (not a summary table), quote the governing
sentence in the code comment, and delete the line here. If the rule turns out different,
fix it, add a test, and log it in `DECISIONS.md`.

## Questions for the DM (raised while verifying)

- [ ] **Blinded and CMD.** Blinded "loses its Dexterity bonus to AC"; the CMD rules only say "A
      flat-footed creature does not add its Dexterity bonus to its CMD". The sheet now drops
      the Dex bonus and dodge bonuses from AC and touch AC, and dodge from CMD (CMD adds "dodge
      bonuses to AC", and there are none). It **keeps Dex on CMD** while blinded. Confirm.
- [ ] **Taking 10 on Scribe Scroll.** d20pfsrd's general rule allows taking 10 "when your
      character is not in immediate danger or distracted"; Magic Item Creation forbids it only
      in its optional Dynamic Magic Item Creation rules. The Scriptorium now offers it. Confirm.
- [ ] **HP at exactly 0.** The HP help says "At 0 you fall unconscious." RAW 0 hp is *disabled*
      (conscious, limited actions). Not yet checked on *Combat → Injury and Death*.

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
