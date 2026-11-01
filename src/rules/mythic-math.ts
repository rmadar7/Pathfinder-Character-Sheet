// Mythic numbers. VERIFY.md → "Mythic power", "surge die bands", "Arch-Mage bonus HP".

/** Mythic power per day: 3 + (2 × tier); none before tier 1. */
export const mythicPower = (T: number): number => (T > 0 ? 3 + 2 * T : 0);

/** Surge die by tier band: d6 (1–3), d8 (4–6), d10 (7–9), d12 (10). */
export const surgeDie = (t: number): string =>
  t >= 10 ? '+1d12' : t >= 7 ? '+1d10' : t >= 4 ? '+1d8' : '+1d6';

/** Hard to Kill: you do not die until your negative total reaches double your Con score. */
export const deathLine = (con: number): number => -(con * 2);
