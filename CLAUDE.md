# Working rules for this repository

This is a **Pathfinder 1st Edition character sheet** for a player who is new to the system.
Read `docs/HANDOFF.md` before your first change — it explains what the project is for and
what is already built.

---

## The three rules that matter most

### 1. Verify every rule on d20pfsrd BEFORE you write the code

The rules source for this table is **https://www.d20pfsrd.com/**.

Any change that touches a Pathfinder rule or a derived number must be checked against that
site *first* — not afterwards, and never from memory. Quote the governing sentence in your
commit message or PR description, and link the page.

This covers: formulas, bonus types and stacking, prerequisites, per-day counts, spell
details, class and racial features, mythic abilities, conditions, skill mechanics, item
creation, prices.

Pure presentation work (CSS, copy, layout, a bug fix with no rules content) has nothing to
verify. But if a change touches a **number** or a **rule**, it gets checked, however small
it looks.

**Check feats and spells on their own page, not on a summary table.** A summary list once
gave Empower Spell as +3; the feat's own page says +2. The individual page wins.

When RAW and this table's ruling differ, record **both**: the ruling as the operative one,
the RAW as the reason a ruling was needed. These live in the sheet's Table Rulings section.

If a rule cannot be found or is genuinely ambiguous, say so and flag it for the DM rather
than silently picking an interpretation.

### 2. The sheet must be self-explanatory and self-sufficient

The player is a beginner. The sheet is the only thing in front of them at the table.

- **Every derived number shows its own arithmetic.** Not "AC 17" — "AC 17 = 10 + 2 Dex + 5
  Enduring Armor". The user's original request was: *"I need to be sure I can see what my
  current AC is, but also WHY the numbers are the way they are."*
- **No meta-text.** Never write "ask your DM about this", "every number shows its math", or
  anything that talks *about* the sheet. The sheet states facts; it does not narrate itself.
- **Explain in plain language, not jargon.** "You fail only on a natural 1" beats "DC 9 vs
  +13". Spell out what a rule means in play.
- Rules text may be quoted, but the surrounding explanation should be readable by someone
  who has never played.

### 3. Never silently change the player's data

`chardata` is the character. Code changes must not alter it. Migrations must be additive and
must preserve everything the player has entered. When in doubt, ask.

---

## House rules are authoritative

Ten DM rulings override RAW for this character — they are listed in `docs/HANDOFF.md` and
stored in the sheet under Table Rulings. **Do not "fix" the sheet to match RAW where a ruling
exists.** If you believe a ruling creates a real problem, flag it; don't change it.

---

## Conventions

- Comments explain **why**, not what. Favour the Pathfinder reasoning or the bug that
  prompted the code. Several comments in the existing file cite the rule they implement —
  match that style.
- Show the receipt. When a bonus is suppressed by stacking rules, the losing bonus is still
  displayed, struck through, so the player can see *why* their AC did not go up.
- Prefer adding a self-test over adding a comment saying "don't break this".

## Testing

The sheet has a built-in diagnostics panel (`runSelfTests()`), currently **27 rules checks**
plus character-consistency checks. It renders on the Notes tab.

- Any rules-affecting change should add a check there.
- A change is not done until the diagnostics show **0 failures** and the page actually
  renders (the JS running at all is itself the first thing to confirm).

## Gotchas that have already cost time

- **Backslash escapes do not survive a heredoc** through the Bash tool on the original
  author's machine — `\n` arrives as a real newline and silently breaks JS strings. Use the
  Edit tool for anything containing `\n`, `\t`, `\d`, or a regex literal.
- **A blank page with no console error is a JS parse error**, not a logic bug. Check that a
  container the script populates is non-empty.
- In the single-file version, saving rewrites the whole document. See `docs/HANDOFF.md` →
  *The autosave hazard*. A repo-based rebuild should separate code from data and make this
  class of bug impossible.
