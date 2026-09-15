import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // path alias ของ apps/web (tsconfig.json) — vitest ไม่ได้อ่าน tsconfig ให้เอง
      '@/': fileURLToPath(new URL('./apps/web/src/', import.meta.url)),
    },
  },
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
    coverage: {
      include: ['packages/*/src/**/*.ts', 'apps/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/index.ts'],
    },
  },
});
