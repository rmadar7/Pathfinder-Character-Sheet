# Switching from the v36 sheet to the new one

The new sheet shows every number v36 shows (checked by `scripts/check-parity.cjs`). These
steps move Kaldaran across without losing anything. v36 is not touched, so it stays a fallback.

## Once, in GitHub (Ryan)

1. Merge the open pull requests into `main`. The CI then builds the site and publishes it.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions** (first time only).
   The site is then at `https://rmadar7.github.io/Pathfinder-Character-Sheet/`.

## On switch-over day

1. In v36, make sure it has saved, and keep a copy of the newest `Kaldaran_Sheet.html`.
2. Optional but recommended: run the parity check on *that* file (or hand it to Claude to run):
   ```bash
   npm run build && npx vite preview &
   node scripts/check-parity.cjs path/to/Kaldaran_Sheet.html
   ```
   It must end with "Parity: every number v36 shows, the new sheet shows."
3. Open the new site, go to **Notes → Import a file…**, and choose that `Kaldaran_Sheet.html`.
   The current sheet is backed up first; the import log lists every clean-up it applied.
4. **Notes → Export** and keep the `.json` somewhere safe. That file is now the character.
5. On the phone or tablet used at the table, open the site once with a signal. After that it
   works offline. "Add to Home Screen" makes it an app icon.
6. Stop editing v36. If something looks wrong in the new sheet, v36 still opens as before.
