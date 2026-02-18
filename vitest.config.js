import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.js'],
  },
  // Explicitly setting the root to the current directory might help the VS Code extension
  // which seems to be struggling with path resolution in your environment.
  root: './',
});
