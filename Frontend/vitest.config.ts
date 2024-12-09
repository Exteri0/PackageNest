import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'src/selenium-tests/*.test.js',
      'e2e-tests/**/*.test.ts',
      'e2e-tests/**/*.test.tsx',
    ],
    globals: true,
    setupFiles: './vitest.setup.ts', // Optional: Use for global setup

    coverage: {
      reporter: ['text', 'text-summary', 'json', 'html'],
      reportsDirectory: './test-reports',
      include: ['src'],
      exclude: [
        'tests/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/.idea/**',
        '**/.git/**',
        '**/.cache/**',
        '**/lib/**',
        '**/*.css',
        '**/*.json',
        '**/*.md',
        '**/*.yml',
        '**/*.config.js',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/src/main.tsx',
      ],
      thresholds: {
        statements: 90,
        functions: 100,
        lines: 90,
      },
      ignoreEmptyLines: true,
      reportOnFailure: true,
    },
    hookTimeout: 30000,
  },
});
