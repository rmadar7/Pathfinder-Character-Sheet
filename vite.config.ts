import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

// GitHub Pages serves the site from /<repo>/, so assets need that prefix in
// production. Locally (dev, tests) the root is fine.
const base = process.env.GITHUB_ACTIONS ? '/Pathfinder-Character-Sheet/' : '/';

export default defineConfig({
  base,
  plugins: [preact()],
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
});
