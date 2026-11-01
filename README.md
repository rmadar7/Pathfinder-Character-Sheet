# Pathfinder Character Sheet

A Pathfinder 1st Edition character sheet that shows **why** every number is what it is.
Built for Kaldaran — Samsaran necromancer, Wizard 4 / Arch-Mage tier 2.

Start with [`docs/HANDOFF.md`](docs/HANDOFF.md) (what this is and what's built) and
[`CLAUDE.md`](CLAUDE.md) (working rules). Decisions are logged in
[`docs/DECISIONS.md`](docs/DECISIONS.md).

## Layout

| Path | What |
|---|---|
| `legacy/Kaldaran_Sheet.html` | The v36 single-file sheet, unchanged. Still the one used at the table until the rebuild reaches parity. |
| `data/characters/kaldaran.json` | Kaldaran's data, extracted from v36. |
| `data/spells.crb.json` | The 396-spell Core Rulebook list, extracted from v36. |
| `scripts/extract-legacy.mjs` | Re-extracts both JSON files from the legacy sheet. |
| `scripts/check-legacy.cjs` | Opens the legacy sheet headlessly and reports its diagnostics. |

```bash
node scripts/extract-legacy.mjs
```

```bash
node scripts/check-legacy.cjs
```
