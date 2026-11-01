// A real button that opens the file picker (a <label> around a hidden input can't be reached
// by keyboard and isn't styled as a button). Used by the bottom bar and Notes (U7).

import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import { loadFromFile } from '../fileio';

export function LoadFileButton({ children, onDone, title }: { children: ComponentChildren; onDone: (msg: string) => void; title?: string }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button title={title} onClick={() => input.current?.click()}>{children}</button>
      <input ref={input} type="file" accept=".json,.html,application/json,text/html" style="display:none"
        onChange={(e) => {
          const el = e.target as HTMLInputElement, f = el.files?.[0];
          el.value = '';
          if (f) void loadFromFile(f).then((m) => m && onDone(m));
        }} />
    </>
  );
}
