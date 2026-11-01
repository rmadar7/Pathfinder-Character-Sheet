# Pathfinder Character Sheet

A Pathfinder 1st Edition character sheet that shows **why** every number is what it is.
Built for Kaldaran — Samsaran necromancer, Wizard 4 / Arch-Mage tier 2.

- **What this is:** [`docs/HANDOFF.md`](docs/HANDOFF.md)
- **Working rules** (verify on d20pfsrd, show the math, never silently change data): [`CLAUDE.md`](CLAUDE.md)
- **How the code is built:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Rules still to cite against d20pfsrd:** [`docs/VERIFY.md`](docs/VERIFY.md)
- **Decisions and every deliberate difference from v36:** [`docs/DECISIONS.md`](docs/DECISIONS.md)

## Using it

Once deployed it lives at **https://rmadar7.github.io/Pathfinder-Character-Sheet/**. Open it
once while online. After that it works offline, and on a phone or tablet you can add it to
the home screen.

Your character is saved **in the browser on that device**, automatically, as you play. The
app's code is never written back, so an old tab can't overwrite newer work. If two tabs are
open and one saves, the other one stops saving and offers to load the newer version.

- **Moving to another device / keeping a copy:** Notes → Export character (.json), then
  Import on the other device.
- **Undoing a big change:** Notes → Backups. One is taken before every rest, level-up and
  import.
- **Coming from the old file:** Notes → Import accepts `Kaldaran_Sheet.html` directly.

## Developing

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # rules, migrations, storage
npm run build        # typecheck + production build into dist/
```

End-to-end checks against a production build are in
[`docs/ARCHITECTURE.md` §10](docs/ARCHITECTURE.md). Pushing to `main` runs CI and deploys
to GitHub Pages.

## Layout

| Path | What |
|---|---|
| `src/rules/` | Pathfinder rules as pure functions, each returning its receipt. |
| `src/model/` | Character document types, defaults, migrations, IndexedDB storage. |
| `src/data/` | Mythic, condition, effect, metamagic and gear tables (from v36). |
| `src/ui/` | Preact components: one file per tab, shared pieces in `components/`. |
| `test/` | Vitest: the self-test suite, Kaldaran's numbers, migrations, storage. |
| `data/` | Kaldaran's seed data and the 396 Core Rulebook spells, extracted from v36. |
| `legacy/Kaldaran_Sheet.html` | The v36 single-file sheet, unchanged, for reference. |
| `scripts/` | Extraction from v36, and headless checks of v36 and the new app. |
