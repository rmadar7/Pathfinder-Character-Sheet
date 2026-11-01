import raw from '../data/characters/kaldaran.json';
import { migrate } from '../src/model/migrate';
import type { Character } from '../src/model/types';

/** Kaldaran as v36 last saved him, upgraded to the current schema. */
export const kaldaran = (): Character => migrate(raw, 0);
export const rawKaldaran = () => structuredClone(raw) as Record<string, any>;
