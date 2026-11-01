// Loading the compendium files on demand. They sit next to the app (public/compendium/) and
// are cached by the service worker once fetched, so the lookup works offline afterwards.

import type { CompendiumIndex, Entry, FileName } from './types';

const base = (): string => (import.meta.env?.BASE_URL ?? '/') + 'compendium/';
const cache = new Map<string, Promise<unknown>>();

function get<T>(name: string): Promise<T> {
  let p = cache.get(name);
  if (!p) {
    p = fetch(base() + name).then((r) => {
      if (!r.ok) throw new Error(`${name}: ${r.status}`);
      return r.json();
    });
    p.catch(() => cache.delete(name)); // let a later attempt retry once back online
    cache.set(name, p);
  }
  return p as Promise<T>;
}

export const loadIndex = (): Promise<CompendiumIndex> => get<CompendiumIndex>('index.json');
export const loadFile = (f: FileName): Promise<Entry[]> => get<Entry[]>(f + '.json');
export const loadOGL = (): Promise<string> => {
  let p = cache.get('OGL.txt');
  if (!p) cache.set('OGL.txt', (p = fetch(base() + 'OGL.txt').then((r) => r.text())));
  return p as Promise<string>;
};
